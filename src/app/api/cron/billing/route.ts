import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const CRON_SECRET = process.env.CRON_SECRET || 'nekkewifi-cron-secret';

// POST /api/cron/billing — Automated billing cron
// Protected with X-Cron-Secret header
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const secret = request.headers.get('x-cron-secret');
    if (secret !== CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized. Invalid cron secret.' },
        { status: 401 }
      );
    }

    const now = new Date();
    const results = {
      overdueMarked: 0,
      invoicesGenerated: 0,
      subscriptionsSuspended: 0,
      subscriptionsRenewed: 0,
      errors: [] as string[],
    };

    // ──────────────────────────────────────
    // 1. Mark overdue invoices
    // ──────────────────────────────────────
    const overdueInvoices = await db.invoice.findMany({
      where: {
        status: 'pending',
        dueDate: { lt: now },
      },
      include: {
        organization: { select: { id: true, name: true } },
        customer: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    for (const invoice of overdueInvoices) {
      try {
        await db.invoice.update({
          where: { id: invoice.id },
          data: { status: 'overdue' },
        });
        results.overdueMarked++;
      } catch (err) {
        results.errors.push(`Failed to mark invoice ${invoice.invoiceNumber} as overdue: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    // ──────────────────────────────────────
    // 2. Find subscriptions due for renewal
    // Active subscriptions with autoRenew=true, endDate approaching or past
    // ──────────────────────────────────────
    const renewWindow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    const subscriptionsToRenew = await db.subscription.findMany({
      where: {
        status: 'active',
        autoRenew: true,
        endDate: { lte: renewWindow },
      },
      include: {
        organization: { select: { id: true, name: true, taxRate: true } },
        customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        plan: { select: { id: true, name: true, priceMonthly: true, priceQuarterly: true, priceYearly: true } },
      },
    });

    for (const sub of subscriptionsToRenew) {
      try {
        // Check if there's already a pending/current invoice for this subscription in the new period
        const existingInvoice = await db.invoice.findFirst({
          where: {
            subscriptionId: sub.id,
            status: { in: ['pending', 'overdue'] },
            createdAt: { gte: sub.endDate ? new Date(sub.endDate.getTime() - 7 * 24 * 60 * 60 * 1000) : new Date(0) },
          },
        });

        if (existingInvoice) {
          continue; // Already has an outstanding invoice
        }

        // Determine price based on billing cycle
        const price = sub.billingCycle === 'yearly'
          ? sub.plan.priceYearly || sub.plan.priceMonthly * 12
          : sub.billingCycle === 'quarterly'
            ? sub.plan.priceQuarterly || sub.plan.priceMonthly * 3
            : sub.plan.priceMonthly;

        const tax = price * (sub.organization.taxRate / 100);

        // Generate invoice number
        const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
        const prefix = `INV-${yearMonth}`;
        const latestInvoice = await db.invoice.findFirst({
          where: {
            organizationId: sub.organizationId,
            invoiceNumber: { startsWith: prefix },
          },
          orderBy: { invoiceNumber: 'desc' },
          select: { invoiceNumber: true },
        });
        let sequence = 1;
        if (latestInvoice) {
          const parts = latestInvoice.invoiceNumber.split('-');
          const lastSequence = parseInt(parts[parts.length - 1], 10);
          sequence = lastSequence + 1;
        }
        const invoiceNumber = `${prefix}-${String(sequence).padStart(4, '0')}`;

        // Calculate new subscription dates
        const oldEndDate = sub.endDate || now;
        let newEndDate: Date;
        if (sub.billingCycle === 'yearly') {
          newEndDate = new Date(oldEndDate.getTime() + 365 * 24 * 60 * 60 * 1000);
        } else if (sub.billingCycle === 'quarterly') {
          newEndDate = new Date(oldEndDate.getTime() + 90 * 24 * 60 * 60 * 1000);
        } else {
          newEndDate = new Date(oldEndDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        }

        // Create the invoice
        await db.invoice.create({
          data: {
            organizationId: sub.organizationId,
            customerId: sub.customerId,
            subscriptionId: sub.id,
            invoiceNumber,
            status: 'pending',
            subtotal: price,
            tax,
            discount: 0,
            total: price + tax,
            dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            notes: `Auto-generated renewal invoice for ${sub.plan.name} (${sub.billingCycle})`,
            lineItems: {
              create: {
                description: `${sub.plan.name} — ${sub.billingCycle} subscription renewal`,
                quantity: 1,
                unitPrice: price,
                total: price,
              },
            },
          },
        });

        // Extend subscription end date
        await db.subscription.update({
          where: { id: sub.id },
          data: { endDate: newEndDate },
        });

        results.invoicesGenerated++;
        results.subscriptionsRenewed++;
      } catch (err) {
        results.errors.push(`Failed to renew subscription ${sub.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    // ──────────────────────────────────────
    // 3. Suspend customers with overdue > 30 days
    // ──────────────────────────────────────
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const severelyOverdueInvoices = await db.invoice.findMany({
      where: {
        status: 'overdue',
        dueDate: { lt: thirtyDaysAgo },
      },
      include: {
        customer: {
          select: { id: true, status: true },
        },
      },
      distinct: ['customerId'],
    });

    for (const invoice of severelyOverdueInvoices) {
      try {
        if (invoice.customer.status !== 'suspended') {
          await db.customer.update({
            where: { id: invoice.customerId },
            data: { status: 'suspended' },
          });

          // Also suspend active subscriptions
          await db.subscription.updateMany({
            where: {
              customerId: invoice.customerId,
              status: 'active',
            },
            data: { status: 'suspended' },
          });

          results.subscriptionsSuspended++;
        }
      } catch (err) {
        results.errors.push(`Failed to suspend customer ${invoice.customerId}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Billing cron completed',
      executedAt: now.toISOString(),
      ...results,
    });
  } catch (error: unknown) {
    console.error('Billing cron error:', error);
    const message = error instanceof Error ? error.message : 'Billing cron failed';
    return NextResponse.json({ error: message, success: false }, { status: 500 });
  }
}

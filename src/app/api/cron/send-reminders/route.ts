import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notifyPaymentReminder } from '@/lib/notifications-service';

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = request.headers.get('X-Cron-Secret');
    const expectedSecret = process.env.CRON_SECRET || 'nekkewifi-cron-secret-change-in-production';

    if (cronSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find all pending invoices due within the next 3 days
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const upcomingInvoices = await db.invoice.findMany({
      where: {
        status: 'pending',
        dueDate: {
          gte: now,
          lte: threeDaysFromNow,
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            currency: true,
          },
        },
      },
    });

    if (upcomingInvoices.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No upcoming invoices found',
        remindersSent: 0,
      });
    }

    let remindersSent = 0;
    const errors: string[] = [];

    // Send payment reminders for each invoice
    for (const invoice of upcomingInvoices) {
      try {
        const success = await notifyPaymentReminder({
          orgId: invoice.organizationId,
          customerId: invoice.customer.id,
          customerName: `${invoice.customer.firstName} ${invoice.customer.lastName}`,
          invoiceNumber: invoice.invoiceNumber,
          total: invoice.total,
          currency: invoice.organization.currency || 'TZS',
          dueDate: invoice.dueDate.toISOString().split('T')[0],
          email: invoice.customer.email || undefined,
          phone: invoice.customer.phone,
        });

        if (success) {
          remindersSent++;
        } else {
          errors.push(`Failed to send reminder for invoice ${invoice.invoiceNumber}`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Invoice ${invoice.invoiceNumber}: ${message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${upcomingInvoices.length} invoices`,
      remindersSent,
      totalUpcoming: upcomingInvoices.length,
      ...(errors.length > 0 && { errors }),
    });
  } catch (error: unknown) {
    console.error('Send reminders cron error:', error);
    const message = error instanceof Error ? error.message : 'Failed to send reminders';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

// POST /api/portal — Customer login by phone number
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, organizationId } = body;

    if (!phone || !organizationId) {
      return NextResponse.json(
        { error: 'Phone number and organization are required' },
        { status: 400 }
      );
    }

    const customer = await db.customer.findFirst({
      where: {
        phone,
        organizationId,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            email: true,
            phone: true,
            address: true,
            currency: true,
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found. Check your phone number and organization.' },
        { status: 404 }
      );
    }

    // Generate a simple session token
    const token = crypto.randomBytes(32).toString('hex');

    return NextResponse.json({
      customer: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        city: customer.city,
        region: customer.region,
        status: customer.status,
        balance: customer.balance,
        organizationId: customer.organizationId,
        organizationName: customer.organization.name,
        organizationSlug: customer.organization.slug,
      },
      token,
    });
  } catch (error: unknown) {
    console.error('Portal login error:', error);
    const message = error instanceof Error ? error.message : 'Login failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/portal?customerId=xxx&orgId=xxx — Get customer profile with subscription info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const orgId = searchParams.get('orgId');

    if (!customerId || !orgId) {
      return NextResponse.json(
        { error: 'customerId and orgId are required' },
        { status: 400 }
      );
    }

    const customer = await db.customer.findFirst({
      where: {
        id: customerId,
        organizationId: orgId,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            email: true,
            phone: true,
            address: true,
            currency: true,
          },
        },
        subscriptions: {
          where: { status: 'active' },
          include: {
            plan: {
              select: {
                id: true,
                name: true,
                speedDown: true,
                speedUp: true,
                dataCap: true,
                priceMonthly: true,
              },
            },
          },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get recent invoices
    const recentInvoices = await db.invoice.findMany({
      where: {
        customerId: customer.id,
        organizationId: orgId,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        total: true,
        dueDate: true,
        createdAt: true,
        paidAt: true,
      },
    });

    // Get recent payments
    const recentPayments = await db.payment.findMany({
      where: {
        customerId: customer.id,
        organizationId: orgId,
      },
      orderBy: { paidAt: 'desc' },
      take: 5,
      select: {
        id: true,
        amount: true,
        method: true,
        paymentChannel: true,
        status: true,
        paidAt: true,
      },
    });

    // Calculate outstanding balance
    const pendingInvoices = await db.invoice.findMany({
      where: {
        customerId: customer.id,
        organizationId: orgId,
        status: { in: ['pending', 'overdue', 'partial'] },
      },
      select: { total: true },
    });

    const outstandingBalance = pendingInvoices.reduce((sum, inv) => sum + inv.total, 0);

    return NextResponse.json({
      customer: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        city: customer.city,
        region: customer.region,
        status: customer.status,
        balance: customer.balance,
        createdAt: customer.createdAt,
        organizationName: customer.organization.name,
        organizationCurrency: customer.organization.currency,
      },
      activeSubscription: customer.subscriptions[0] ?? null,
      recentInvoices,
      recentPayments,
      outstandingBalance,
    });
  } catch (error: unknown) {
    console.error('Portal profile error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch profile';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

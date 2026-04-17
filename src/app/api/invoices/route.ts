import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { requirePermission, getOrgFilter, AuthError } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

async function generateInvoiceNumber(orgId: string): Promise<string> {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `INV-${yearMonth}`;

  const latestInvoice = await db.invoice.findFirst({
    where: {
      organizationId: orgId,
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

  return `${prefix}-${String(sequence).padStart(4, '0')}`;
}

export async function GET(request: NextRequest) {
  try {
    const authUser = requirePermission(request, 'invoices.view');
    const { searchParams } = new URL(request.url);
    const orgIdParam = searchParams.get('orgId') ?? '';
    const customerId = searchParams.get('customerId') ?? '';
    const status = searchParams.get('status') ?? '';
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const limit = parseInt(searchParams.get('limit') ?? '20', 10);

    const skip = (page - 1) * limit;

    const orgId = getOrgFilter(authUser, orgIdParam || undefined);

    const where: Prisma.InvoiceWhereInput = { organizationId: orgId };

    if (customerId) where.customerId = customerId;
    if (status) where.status = status;

    const [invoices, total] = await Promise.all([
      db.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true },
          },
          subscription: {
            select: { id: true, username: true },
          },
          _count: {
            select: {
              lineItems: true,
              payments: true,
            },
          },
        },
      }),
      db.invoice.count({ where }),
    ]);

    return NextResponse.json({
      data: invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Invoices GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch invoices';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = requirePermission(request, 'invoices.manage');
    const body = await request.json();
    const {
      organizationId, customerId, subscriptionId, subtotal,
      tax, discount, total, dueDate, notes, lineItems,
    } = body;

    const orgId = getOrgFilter(authUser, organizationId);

    if (!orgId || !customerId || total === undefined || !dueDate) {
      return NextResponse.json(
        { error: 'customerId, total, and dueDate are required' },
        { status: 400 }
      );
    }

    const customer = await db.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const invoiceNumber = await generateInvoiceNumber(orgId);

    const invoice = await db.invoice.create({
      data: {
        organizationId: orgId,
        customerId,
        subscriptionId,
        invoiceNumber,
        subtotal: subtotal ?? total,
        tax: tax ?? 0,
        discount: discount ?? 0,
        total,
        dueDate: new Date(dueDate),
        notes,
        lineItems: lineItems
          ? {
              create: lineItems.map(
                (item: { description: string; quantity: number; unitPrice: number; total: number }) => ({
                  description: item.description,
                  quantity: item.quantity ?? 1,
                  unitPrice: item.unitPrice,
                  total: item.total ?? item.unitPrice * (item.quantity ?? 1),
                })
              ),
            }
          : undefined,
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
        lineItems: true,
        payments: true,
      },
    });

    // Log audit
    await logAudit({
      organizationId: orgId,
      userId: authUser.userId,
      userEmail: authUser.email,
      userRole: authUser.role,
      action: 'create',
      resource: 'invoice',
      resourceId: invoice.id,
      details: { invoiceNumber: invoice.invoiceNumber, total: invoice.total, customerName: `${customer.firstName} ${customer.lastName}` },
      request,
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Invoices POST error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create invoice';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission, AuthError } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requirePermission(request, 'invoices.view');
    const { id } = await params;

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true, firstName: true, lastName: true, email: true,
            phone: true, address: true, city: true, region: true,
          },
        },
        subscription: {
          select: { id: true, username: true, plan: { select: { name: true } } },
        },
        organization: {
          select: { id: true, name: true, email: true, phone: true, address: true, country: true, currency: true, taxRate: true },
        },
        lineItems: {
          orderBy: { id: 'asc' },
        },
        payments: {
          orderBy: { paidAt: 'desc' },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const totalPaid = invoice.payments
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    const balanceDue = invoice.total - totalPaid;

    return NextResponse.json({
      ...invoice,
      totalPaid,
      balanceDue,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Invoice GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch invoice';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requirePermission(request, 'invoices.manage');
    const { id } = await params;
    const body = await request.json();

    const existing = await db.invoice.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const {
      status, subtotal, tax, discount, total,
      dueDate, notes, subscriptionId,
    } = body;

    const invoice = await db.invoice.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(subtotal !== undefined && { subtotal }),
        ...(tax !== undefined && { tax }),
        ...(discount !== undefined && { discount }),
        ...(total !== undefined && { total }),
        ...(dueDate !== undefined && { dueDate: new Date(dueDate) }),
        ...(notes !== undefined && { notes }),
        ...(subscriptionId !== undefined && { subscriptionId }),
        ...(status === 'paid' && !existing.paidAt && { paidAt: new Date() }),
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
        lineItems: true,
        payments: true,
      },
    });

    return NextResponse.json(invoice);
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Invoice PUT error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update invoice';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requirePermission(request, 'invoices.delete');
    const { id } = await params;

    const existing = await db.invoice.findUnique({
      where: { id },
      include: { _count: { select: { payments: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (existing._count.payments > 0) {
      return NextResponse.json(
        { error: 'Cannot delete invoice with payments. Cancel it instead.' },
        { status: 400 }
      );
    }

    await db.invoice.delete({ where: { id } });

    return NextResponse.json({ message: 'Invoice deleted successfully' });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Invoice DELETE error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete invoice';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

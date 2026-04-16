import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission, AuthError } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requirePermission(request, 'payments.view');
    const { id } = await params;

    const payment = await db.payment.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true, firstName: true, lastName: true, email: true, phone: true,
          },
        },
        invoice: {
          select: { id: true, invoiceNumber: true, total: true, status: true },
        },
        organization: { select: { id: true, name: true } },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json(payment);
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Payment GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch payment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requirePermission(request, 'payments.manage');
    const { id } = await params;
    const body = await request.json();

    const existing = await db.payment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const { amount, method, reference, status, receiptNumber, notes, paidAt, invoiceId } = body;

    const payment = await db.payment.update({
      where: { id },
      data: {
        ...(amount !== undefined && { amount }),
        ...(method !== undefined && { method }),
        ...(reference !== undefined && { reference }),
        ...(status !== undefined && { status }),
        ...(receiptNumber !== undefined && { receiptNumber }),
        ...(notes !== undefined && { notes }),
        ...(paidAt !== undefined && { paidAt: new Date(paidAt) }),
        ...(invoiceId !== undefined && { invoiceId }),
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
        invoice: { select: { id: true, invoiceNumber: true } },
      },
    });

    return NextResponse.json(payment);
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Payment PUT error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update payment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requirePermission(request, 'payments.manage');
    const { id } = await params;

    const existing = await db.payment.findUnique({
      where: { id },
      include: {
        invoice: {
          include: {
            payments: {
              select: { id: true, amount: true, status: true },
            },
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    await db.$transaction(async (tx) => {
      await tx.payment.delete({ where: { id } });

      if (existing.invoiceId && existing.invoice) {
        const invoice = existing.invoice;
        const remainingPayments = invoice.payments.filter((p) => p.id !== id);
        const remainingTotal = remainingPayments
          .filter((p) => p.status === 'completed')
          .reduce((sum, p) => sum + p.amount, 0);

        let newStatus: string;
        if (remainingTotal >= invoice.total) {
          newStatus = 'paid';
        } else if (remainingTotal > 0) {
          newStatus = 'partial';
        } else {
          newStatus = 'pending';
        }

        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status: newStatus,
            ...(newStatus !== 'paid' && { paidAt: null }),
          },
        });
      }
    });

    return NextResponse.json({ message: 'Payment deleted successfully' });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Payment DELETE error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete payment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

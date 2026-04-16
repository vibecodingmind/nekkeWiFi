import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/portal/pay — Create a new payment for an invoice
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, invoiceId, amount, method, paymentChannel } = body;

    if (!customerId || !invoiceId || !amount || !method) {
      return NextResponse.json(
        { error: 'customerId, invoiceId, amount, and method are required' },
        { status: 400 }
      );
    }

    // Verify invoice exists and belongs to customer
    const invoice = await db.invoice.findFirst({
      where: {
        id: invoiceId,
        customerId,
      },
      include: {
        payments: {
          select: { id: true, amount: true, status: true },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.status === 'paid' || invoice.status === 'cancelled') {
      return NextResponse.json(
        { error: `Invoice is already ${invoice.status}` },
        { status: 400 }
      );
    }

    // Calculate total already paid
    const totalPaid = invoice.payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    const remaining = invoice.total - totalPaid;

    if (amount > remaining + 0.01) {
      return NextResponse.json(
        { error: `Payment amount exceeds remaining balance of ${remaining.toLocaleString()}` },
        { status: 400 }
      );
    }

    // Create payment
    const payment = await db.payment.create({
      data: {
        organizationId: invoice.organizationId,
        customerId,
        invoiceId,
        amount,
        method,
        paymentChannel: paymentChannel ?? null,
        status: 'completed',
        paidAt: new Date(),
        reference: `PAY-${Date.now()}`,
      },
    });

    // Update invoice status based on total payments
    const newTotalPaid = totalPaid + amount;
    let newStatus = invoice.status;

    if (newTotalPaid >= invoice.total - 0.01) {
      newStatus = 'paid';
    } else if (newTotalPaid > 0) {
      newStatus = 'partial';
    }

    await db.invoice.update({
      where: { id: invoiceId },
      data: {
        status: newStatus,
        paidAt: newStatus === 'paid' ? new Date() : invoice.paidAt,
      },
    });

    return NextResponse.json({
      payment: {
        id: payment.id,
        amount: payment.amount,
        method: payment.method,
        paymentChannel: payment.paymentChannel,
        status: payment.status,
        reference: payment.reference,
        paidAt: payment.paidAt,
      },
      invoiceStatus: newStatus,
      remainingBalance: Math.max(0, invoice.total - newTotalPaid),
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Portal pay error:', error);
    const message = error instanceof Error ? error.message : 'Payment failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

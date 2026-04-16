import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/pesapal/webhook — Pesapal IPN webhook receiver
// Body: { trackingId, status, paymentMethod }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trackingId, status, paymentMethod } = body;

    if (!trackingId || !status) {
      return NextResponse.json(
        { error: 'trackingId and status are required' },
        { status: 400 }
      );
    }

    const validStatuses = ['completed', 'failed', 'cancelled', 'reversed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Find the payment by tracking ID
    const payment = await db.payment.findFirst({
      where: { pesapalTrackingId: trackingId },
      include: { invoice: { select: { id: true, total: true, paidAt: true } } },
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found for tracking ID' },
        { status: 404 }
      );
    }

    // Update payment and invoice in a transaction
    await db.$transaction(async (tx) => {
      // Update the payment
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status,
          ...(paymentMethod && { pesapalPaymentMethod: paymentMethod }),
          ...(status === 'completed' && { paidAt: new Date() }),
        },
      });

      // If completed, update the invoice
      if (status === 'completed' && payment.invoiceId) {
        const invoice = await tx.invoice.findUnique({
          where: { id: payment.invoiceId },
          include: { payments: { select: { id: true, amount: true, status: true } } },
        });

        if (invoice) {
          const totalPaid = invoice.payments
            .filter((p) => p.status === 'completed')
            .reduce((sum, p) => sum + p.amount, 0);

          let invoiceStatus: string;
          if (totalPaid >= invoice.total) {
            invoiceStatus = 'paid';
          } else if (totalPaid > 0) {
            invoiceStatus = 'partial';
          } else {
            invoiceStatus = invoice.status;
          }

          await tx.invoice.update({
            where: { id: payment.invoiceId },
            data: {
              status: invoiceStatus,
              ...(invoiceStatus === 'paid' && !invoice.paidAt && { paidAt: new Date() }),
            },
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Payment ${trackingId} updated to ${status}`,
    });
  } catch (error: unknown) {
    console.error('Pesapal webhook error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process webhook';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

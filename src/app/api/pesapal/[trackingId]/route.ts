import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/pesapal/[trackingId] — Get payment details by Pesapal tracking ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  try {
    const { trackingId } = await params;

    const payment = await db.payment.findUnique({
      where: { pesapalTrackingId: trackingId },
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
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
            subtotal: true,
            tax: true,
            status: true,
            dueDate: true,
          },
        },
        organization: {
          select: { id: true, name: true, currency: true },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found for the given tracking ID' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: payment.id,
      trackingId: payment.pesapalTrackingId,
      merchantRef: payment.pesapalMerchantRef,
      amount: payment.amount,
      currency: payment.organization.currency,
      status: payment.status,
      paymentChannel: payment.paymentChannel,
      pesapalPaymentMethod: payment.pesapalPaymentMethod,
      method: payment.method,
      gateway: payment.gateway,
      reference: payment.reference,
      receiptNumber: payment.receiptNumber,
      notes: payment.notes,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
      customer: payment.customer,
      invoice: payment.invoice,
      organization: payment.organization,
    });
  } catch (error: unknown) {
    console.error('Pesapal tracking GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch payment details';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

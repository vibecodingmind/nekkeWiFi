import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/portal/payments?customerId=xxx&orgId=xxx
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

    const payments = await db.payment.findMany({
      where: {
        customerId,
        organizationId: orgId,
      },
      orderBy: { paidAt: 'desc' },
      select: {
        id: true,
        amount: true,
        method: true,
        paymentChannel: true,
        status: true,
        reference: true,
        receiptNumber: true,
        paidAt: true,
        createdAt: true,
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
          },
        },
      },
    });

    return NextResponse.json({
      data: payments,
      total: payments.length,
    });
  } catch (error: unknown) {
    console.error('Portal payments error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch payments';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

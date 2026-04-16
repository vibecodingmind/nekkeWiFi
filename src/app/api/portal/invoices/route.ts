import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/portal/invoices?customerId=xxx&orgId=xxx
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

    const invoices = await db.invoice.findMany({
      where: {
        customerId,
        organizationId: orgId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        lineItems: true,
        payments: {
          select: {
            id: true,
            amount: true,
            method: true,
            paymentChannel: true,
            status: true,
            paidAt: true,
          },
        },
      },
    });

    // Calculate amounts paid for each invoice
    const invoicesWithPaid = invoices.map(inv => {
      const totalPaid = inv.payments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);

      return {
        ...inv,
        amountPaid: totalPaid,
        remainingBalance: Math.max(0, inv.total - totalPaid),
      };
    });

    return NextResponse.json({
      data: invoicesWithPaid,
      total: invoicesWithPaid.length,
    });
  } catch (error: unknown) {
    console.error('Portal invoices error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch invoices';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const CRON_SECRET = process.env.CRON_SECRET || 'nekkewifi-cron-secret';

// POST /api/cron/mark-overdue — Mark past-due pending invoices as overdue
// Protected with X-Cron-Secret header
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const secret = request.headers.get('x-cron-secret');
    if (secret !== CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized. Invalid cron secret.' },
        { status: 401 }
      );
    }

    const now = new Date();

    // Find all pending invoices past their due date
    const overdueInvoices = await db.invoice.findMany({
      where: {
        status: 'pending',
        dueDate: { lt: now },
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    let markedCount = 0;
    const errors: string[] = [];

    for (const invoice of overdueInvoices) {
      try {
        await db.invoice.update({
          where: { id: invoice.id },
          data: { status: 'overdue' },
        });
        markedCount++;
      } catch (err) {
        errors.push(
          `Failed to mark invoice ${invoice.invoiceNumber}: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Mark overdue cron completed',
      executedAt: now.toISOString(),
      invoicesMarkedOverdue: markedCount,
      totalPendingChecked: overdueInvoices.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: unknown) {
    console.error('Mark overdue cron error:', error);
    const message = error instanceof Error ? error.message : 'Mark overdue cron failed';
    return NextResponse.json({ error: message, success: false }, { status: 500 });
  }
}

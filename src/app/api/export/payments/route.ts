import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission, getOrgFilter, AuthError } from '@/lib/auth';

// GET /api/export/payments?orgId=xxx — Export payments as CSV
export async function GET(request: NextRequest) {
  try {
    const authUser = requirePermission(request, 'payments.view');
    const { searchParams } = new URL(request.url);
    const orgIdParam = searchParams.get('orgId');
    const orgId = getOrgFilter(authUser, orgIdParam);

    const payments = await db.payment.findMany({
      where: { organizationId: orgId },
      include: {
        customer: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { paidAt: 'desc' },
    });

    const escapeCSV = (value: string | null | undefined): string => {
      if (value == null) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const formatDate = (date: Date): string => {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    };

    const headers = 'ID,Customer,Amount,Method,Channel,Status,Reference,Paid At';
    const rows = payments.map(p => [
      p.id,
      `${p.customer.firstName} ${p.customer.lastName}`,
      p.amount.toFixed(2),
      p.method,
      p.paymentChannel,
      p.status,
      p.reference,
      formatDate(p.paidAt),
    ].map(escapeCSV).join(',')).join('\n');

    const csv = `${headers}\n${rows}`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="payments-export.csv"',
      },
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Export payments error:', error);
    return NextResponse.json({ error: 'Failed to export payments' }, { status: 500 });
  }
}

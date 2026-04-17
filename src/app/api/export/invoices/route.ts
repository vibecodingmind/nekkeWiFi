import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission, getOrgFilter, AuthError } from '@/lib/auth';

// GET /api/export/invoices?orgId=xxx — Export invoices as CSV
export async function GET(request: NextRequest) {
  try {
    const authUser = requirePermission(request, 'invoices.view');
    const { searchParams } = new URL(request.url);
    const orgIdParam = searchParams.get('orgId');
    const orgId = getOrgFilter(authUser, orgIdParam);

    const invoices = await db.invoice.findMany({
      where: { organizationId: orgId },
      include: {
        customer: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
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

    const headers = 'Invoice #,Customer,Status,Subtotal,Tax,Discount,Total,Due Date,Paid At,Created';
    const rows = invoices.map(inv => [
      inv.invoiceNumber,
      `${inv.customer.firstName} ${inv.customer.lastName}`,
      inv.status,
      inv.subtotal.toFixed(2),
      inv.tax.toFixed(2),
      inv.discount.toFixed(2),
      inv.total.toFixed(2),
      formatDate(inv.dueDate),
      inv.paidAt ? formatDate(inv.paidAt) : '',
      formatDate(inv.createdAt),
    ].map(escapeCSV).join(',')).join('\n');

    const csv = `${headers}\n${rows}`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="invoices-export.csv"',
      },
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Export invoices error:', error);
    return NextResponse.json({ error: 'Failed to export invoices' }, { status: 500 });
  }
}

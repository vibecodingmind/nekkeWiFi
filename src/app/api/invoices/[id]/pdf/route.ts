import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission, getOrgFilter, AuthError } from '@/lib/auth';

// GET /api/invoices/[id]/pdf?orgId=xxx — Return downloadable HTML invoice
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = requirePermission(request, 'invoices.view');
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const orgIdParam = searchParams.get('orgId');
    const orgId = getOrgFilter(authUser, orgIdParam);

    const invoice = await db.invoice.findFirst({
      where: { id, organizationId: orgId },
      include: {
        customer: true,
        organization: true,
        lineItems: true,
        payments: {
          select: {
            id: true,
            amount: true,
            method: true,
            paymentChannel: true,
            status: true,
            paidAt: true,
            reference: true,
          },
        },
        subscription: {
          select: {
            plan: { select: { name: true } },
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const totalPaid = invoice.payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    const formatCurrency = (amount: number) =>
      `${invoice.organization.currency} ${amount.toLocaleString('en-TZ', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

    const formatDate = (date: string | Date) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const formatPaymentMethod = (method: string) => {
      const m = method.toLowerCase();
      if (m === 'mobile_money' || m === 'mobilemoney') return 'Mobile Money';
      if (m === 'bank_transfer' || m === 'banktransfer') return 'Bank Transfer';
      return method.charAt(0).toUpperCase() + method.slice(1).replace(/_/g, ' ');
    };

    const getStatusBadgeStyle = (status: string) => {
      switch (status.toLowerCase()) {
        case 'paid': return 'background: #d1fae5; color: #065f46;';
        case 'pending': return 'background: #fef3c7; color: #92400e;';
        case 'overdue': return 'background: #fee2e2; color: #991b1b;';
        case 'partial': return 'background: #fef3c7; color: #92400e;';
        case 'cancelled': return 'background: #f3f4f6; color: #4b5563;';
        default: return 'background: #f3f4f6; color: #4b5563;';
      }
    };

    const org = invoice.organization;
    const cust = invoice.customer;
    const lineItemsHtml = invoice.lineItems.map((item) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">${item.description}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; text-align: right;">${formatCurrency(item.unitPrice)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; text-align: right; font-weight: 600;">${formatCurrency(item.total)}</td>
      </tr>
    `).join('');

    const paymentsHtml = invoice.payments.length > 0 ? `
      <div style="margin-top: 24px;">
        <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #1f2937;">Payment History</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f9fafb;">
              <th style="padding: 8px 12px; border-bottom: 2px solid #e5e7eb; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280;">Date</th>
              <th style="padding: 8px 12px; border-bottom: 2px solid #e5e7eb; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280;">Method</th>
              <th style="padding: 8px 12px; border-bottom: 2px solid #e5e7eb; text-align: right; font-size: 12px; text-transform: uppercase; color: #6b7280;">Amount</th>
              <th style="padding: 8px 12px; border-bottom: 2px solid #e5e7eb; text-align: center; font-size: 12px; text-transform: uppercase; color: #6b7280;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.payments.map(p => `
              <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">${formatDate(p.paidAt)}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">${formatPaymentMethod(p.method)}${p.paymentChannel ? ` (${p.paymentChannel})` : ''}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; text-align: right; font-weight: 600;">${formatCurrency(p.amount)}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; text-align: center;">
                  <span style="padding: 2px 8px; border-radius: 9999px; ${getStatusBadgeStyle(p.status)}">${p.status}</span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoiceNumber} — ${org.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1f2937;
      line-height: 1.6;
      background: white;
    }
    @media print {
      body { margin: 0; }
      @page {
        margin: 15mm;
        size: A4 portrait;
      }
    }
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 48px;
    }
    .header-bar {
      background: #059669;
      height: 8px;
      border-radius: 0 0 4px 4px;
      margin-bottom: 32px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;
    }
    .brand h1 {
      font-size: 24px;
      font-weight: 700;
    }
    .brand h1 span { color: #059669; }
    .brand p { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .invoice-badge {
      text-align: right;
    }
    .invoice-badge h2 {
      font-size: 28px;
      font-weight: 700;
      color: #059669;
    }
    .invoice-badge .status {
      display: inline-block;
      padding: 4px 16px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 4px;
    }
    .parties {
      display: flex;
      gap: 48px;
      margin-bottom: 32px;
    }
    .party { flex: 1; }
    .party h3 {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #9ca3af;
      margin-bottom: 8px;
      font-weight: 600;
    }
    .party p { font-size: 14px; color: #374151; margin-bottom: 2px; }
    .party .name { font-weight: 600; font-size: 16px; color: #111827; }
    .details-row {
      display: flex;
      gap: 32px;
      margin-bottom: 32px;
      background: #f9fafb;
      border-radius: 8px;
      padding: 16px 20px;
    }
    .detail-item p:first-child { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; }
    .detail-item p:last-child { font-size: 14px; font-weight: 600; color: #1f2937; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #f9fafb; }
    th { padding: 10px 12px; border-bottom: 2px solid #e5e7eb; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; font-weight: 600; }
    .totals {
      display: flex;
      justify-content: flex-end;
      margin-top: 16px;
    }
    .totals-table { width: 280px; }
    .totals-table tr td {
      padding: 6px 0;
      font-size: 14px;
    }
    .totals-table .label { color: #6b7280; }
    .totals-table .value { text-align: right; font-weight: 500; }
    .totals-table .grand-total td {
      border-top: 2px solid #e5e7eb;
      padding-top: 10px;
      font-size: 18px;
      font-weight: 700;
      color: #059669;
    }
    .footer {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #9ca3af;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header-bar"></div>

    <div class="header">
      <div class="brand">
        <h1><span>nekke</span>WiFi</h1>
        <p>ISP Billing Platform</p>
      </div>
      <div class="invoice-badge">
        <h2>INVOICE</h2>
        <p style="font-size: 14px; color: #6b7280; font-weight: 500;">${invoice.invoiceNumber}</p>
        <span class="status" style="${getStatusBadgeStyle(invoice.status)}">${invoice.status}</span>
      </div>
    </div>

    <div class="parties">
      <div class="party">
        <h3>From</h3>
        <p class="name">${org.name}</p>
        ${org.address ? `<p>${org.address}</p>` : ''}
        ${org.email ? `<p>${org.email}</p>` : ''}
        ${org.phone ? `<p>${org.phone}</p>` : ''}
      </div>
      <div class="party">
        <h3>Bill To</h3>
        <p class="name">${cust.firstName} ${cust.lastName}</p>
        ${cust.address ? `<p>${cust.address}</p>` : ''}
        ${cust.city ? `<p>${cust.city}</p>` : ''}
        ${cust.region ? `<p>${cust.region}</p>` : ''}
        <p>${cust.phone}</p>
        ${cust.email ? `<p>${cust.email}</p>` : ''}
      </div>
    </div>

    <div class="details-row">
      <div class="detail-item">
        <p>Invoice Date</p>
        <p>${formatDate(invoice.createdAt)}</p>
      </div>
      <div class="detail-item">
        <p>Due Date</p>
        <p>${formatDate(invoice.dueDate)}</p>
      </div>
      <div class="detail-item">
        <p>Amount Paid</p>
        <p>${formatCurrency(totalPaid)}</p>
      </div>
      ${invoice.subscription?.plan ? `
      <div class="detail-item">
        <p>Plan</p>
        <p>${invoice.subscription.plan.name}</p>
      </div>
      ` : ''}
    </div>

    <table>
      <thead>
        <tr>
          <th style="text-align: left;">Description</th>
          <th style="text-align: center; width: 80px;">Qty</th>
          <th style="text-align: right; width: 140px;">Unit Price</th>
          <th style="text-align: right; width: 140px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${lineItemsHtml}
      </tbody>
    </table>

    <div class="totals">
      <table class="totals-table">
        <tr>
          <td class="label">Subtotal</td>
          <td class="value">${formatCurrency(invoice.subtotal)}</td>
        </tr>
        ${invoice.tax > 0 ? `
        <tr>
          <td class="label">Tax</td>
          <td class="value">${formatCurrency(invoice.tax)}</td>
        </tr>
        ` : ''}
        ${invoice.discount > 0 ? `
        <tr>
          <td class="label">Discount</td>
          <td class="value" style="color: #059669;">- ${formatCurrency(invoice.discount)}</td>
        </tr>
        ` : ''}
        <tr class="grand-total">
          <td>Total</td>
          <td style="text-align: right;">${formatCurrency(invoice.total)}</td>
        </tr>
      </table>
    </div>

    ${paymentsHtml}

    ${invoice.notes ? `
    <div style="margin-top: 24px; padding: 16px; background: #f9fafb; border-radius: 8px;">
      <p style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Notes</p>
      <p style="font-size: 14px; color: #374151;">${invoice.notes}</p>
    </div>
    ` : ''}

    <div class="footer">
      <p>Generated by <strong>nekkeWiFi</strong> — ISP Billing Platform</p>
      <p style="margin-top: 4px;">Generated on ${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
    </div>
  </div>
</body>
</html>`;

    const filename = `invoice-${invoice.invoiceNumber}.html`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Invoice PDF error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate invoice';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

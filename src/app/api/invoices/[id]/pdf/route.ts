import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission, getOrgFilter, AuthError } from '@/lib/auth';
import PDFDocument from 'pdfkit';

// GET /api/invoices/[id]/pdf?orgId=xxx — Return downloadable PDF invoice
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

    // ── Helpers ──────────────────────────────────────────────────────
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

    // ── PDF Document Setup ───────────────────────────────────────────
    const buffers: Buffer[] = [];
    const doc = new PDFDocument({
      size: 'A4',               // 595.28 × 841.89 pt
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      bufferPages: true,
    });

    // Collect output buffers
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));

    const pdfPromise = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
    });

    // ── Constants ────────────────────────────────────────────────────
    const PAGE_W = 595.28;
    const PAGE_H = 841.89;
    const MARGIN = 48;
    const CONTENT_W = PAGE_W - MARGIN * 2;
    const GREEN = '#059669';
    const DARK = '#111827';
    const TEXT = '#1f2937';
    const MUTED = '#6b7280';
    const LIGHT_MUTED = '#9ca3af';
    const BORDER = '#e5e7eb';
    const BG_LIGHT = '#f9fafb';

    let y = 0; // running cursor

    // Helper: check if we need a new page
    const ensureSpace = (needed: number) => {
      if (y + needed > PAGE_H - 60) {
        doc.addPage();
        y = 40;
      }
    };

    // Helper: draw a horizontal line
    const drawLine = (x1: number, x2: number, yPos: number, color: string = BORDER, width: number = 1) => {
      doc.save().strokeColor(color).lineWidth(width).moveTo(x1, yPos).lineTo(x2, yPos).stroke().restore();
    };

    // Helper: draw filled rectangle
    const drawRect = (x: number, yPos: number, w: number, h: number, color: string) => {
      doc.save().fillColor(color).rect(x, yPos, w, h).fill().restore();
    };

    // ── 1. Green Header Bar ──────────────────────────────────────────
    drawRect(0, 0, PAGE_W, 8, GREEN);
    y = 32;

    // ── 2. Header: Brand + Invoice Badge ─────────────────────────────
    // Brand
    doc.font('Helvetica-Bold').fontSize(22);
    const nekkeWidth = doc.widthOfString('nekke');
    doc.fillColor(GREEN).text('nekke', MARGIN, y, { continued: true });
    doc.fillColor(DARK).text('WiFi');
    y = doc.y + 2;

    doc.font('Helvetica').fontSize(11).fillColor(MUTED);
    doc.text('ISP Billing Platform', MARGIN, y);
    y = doc.y + 4;

    // Invoice badge (right-aligned)
    doc.font('Helvetica-Bold').fontSize(24).fillColor(GREEN);
    doc.text('INVOICE', MARGIN, y, { width: CONTENT_W, align: 'right' });
    const badgeY = y;

    doc.font('Helvetica').fontSize(13).fillColor(MUTED);
    doc.text(invoice.invoiceNumber, MARGIN, doc.y, { width: CONTENT_W, align: 'right' });

    // Status badge
    const statusText = invoice.status.toUpperCase();
    const statusColors: Record<string, { bg: string; fg: string }> = {
      PAID: { bg: '#d1fae5', fg: '#065f46' },
      PENDING: { bg: '#fef3c7', fg: '#92400e' },
      OVERDUE: { bg: '#fee2e2', fg: '#991b1b' },
      PARTIAL: { bg: '#fef3c7', fg: '#92400e' },
      CANCELLED: { bg: '#f3f4f6', fg: '#4b5563' },
    };
    const colors = statusColors[statusText] || statusColors.CANCELLED;

    doc.font('Helvetica-Bold').fontSize(10);
    const statusW = doc.widthOfString(statusText) + 24;
    const statusH = 20;
    const statusX = MARGIN + CONTENT_W - statusW;
    const statusY = doc.y + 4;

    drawRect(statusX, statusY, statusW, statusH, colors.bg);
    doc.fillColor(colors.fg).text(statusText, statusX, statusY + 5, { width: statusW, align: 'center' });

    y = statusY + statusH + 20;

    // ── 3. From / Bill To ────────────────────────────────────────────
    const partyWidth = (CONTENT_W - 48) / 2; // 48 = gap between two columns
    const org = invoice.organization;
    const cust = invoice.customer;

    // "From" section
    doc.font('Helvetica-Bold').fontSize(9).fillColor(LIGHT_MUTED);
    doc.text('FROM', MARGIN, y, { characterSpacing: 1 });

    doc.font('Helvetica-Bold').fontSize(14).fillColor(DARK);
    doc.text(org.name, MARGIN, doc.y + 6);
    doc.font('Helvetica').fontSize(11).fillColor(TEXT);

    const fromLines: string[] = [];
    if (org.address) fromLines.push(org.address);
    if (org.email) fromLines.push(org.email);
    if (org.phone) fromLines.push(org.phone);

    for (const line of fromLines) {
      doc.text(line, MARGIN, doc.y + 1);
    }

    // "Bill To" section (right column)
    const billToX = MARGIN + partyWidth + 48;
    const billToTopY = y;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(LIGHT_MUTED);
    doc.text('BILL TO', billToX, billToTopY, { width: partyWidth, characterSpacing: 1 });

    doc.font('Helvetica-Bold').fontSize(14).fillColor(DARK);
    doc.text(`${cust.firstName} ${cust.lastName}`, billToX, doc.y + 6, { width: partyWidth });
    doc.font('Helvetica').fontSize(11).fillColor(TEXT);

    const billToLines: string[] = [];
    if (cust.address) billToLines.push(cust.address);
    if (cust.city) billToLines.push(cust.city);
    if (cust.region) billToLines.push(cust.region);
    billToLines.push(cust.phone);
    if (cust.email) billToLines.push(cust.email);

    for (const line of billToLines) {
      doc.text(line, billToX, doc.y + 1, { width: partyWidth });
    }

    y = Math.max(doc.y, y + 80) + 12;

    // ── 4. Invoice Details Row ───────────────────────────────────────
    const detailBoxH = 52;
    ensureSpace(detailBoxH + 10);
    drawRect(MARGIN, y, CONTENT_W, detailBoxH, BG_LIGHT);

    const detailLabels = ['Invoice Date', 'Due Date', 'Amount Paid'];
    const detailValues = [
      formatDate(invoice.createdAt),
      formatDate(invoice.dueDate),
      formatCurrency(totalPaid),
    ];
    if (invoice.subscription?.plan) {
      detailLabels.push('Plan');
      detailValues.push(invoice.subscription.plan.name);
    }

    const detailCount = detailLabels.length;
    const detailColW = CONTENT_W / detailCount;

    for (let i = 0; i < detailCount; i++) {
      const dx = MARGIN + i * detailColW;
      doc.font('Helvetica').fontSize(9).fillColor(LIGHT_MUTED);
      doc.text(detailLabels[i], dx + 14, y + 12, { width: detailColW - 28 });
      doc.font('Helvetica-Bold').fontSize(13).fillColor(TEXT);
      doc.text(detailValues[i], dx + 14, y + 28, { width: detailColW - 28 });
    }

    y += detailBoxH + 20;

    // ── 5. Line Items Table ──────────────────────────────────────────
    ensureSpace(100);
    const tableColWidths = [CONTENT_W - 80 - 130 - 130, 80, 130, 130];
    const tableHeaders = ['Description', 'Qty', 'Unit Price', 'Total'];
    const tableAligns = ['left', 'center', 'right', 'right'] as const;
    const tableXPositions = [MARGIN];
    for (let i = 1; i < 4; i++) {
      tableXPositions.push(tableXPositions[i - 1] + tableColWidths[i - 1]);
    }

    // Table header row
    drawRect(MARGIN, y, CONTENT_W, 28, BG_LIGHT);
    drawLine(MARGIN, MARGIN + CONTENT_W, y + 28, BORDER, 2);

    doc.font('Helvetica-Bold').fontSize(10).fillColor(MUTED);
    for (let i = 0; i < 4; i++) {
      doc.text(
        tableHeaders[i],
        tableXPositions[i] + 12,
        y + 8,
        { width: tableColWidths[i] - 24, align: tableAligns[i] }
      );
    }
    y += 28;

    // Table body rows
    for (const item of invoice.lineItems) {
      ensureSpace(32);

      const rowH = 32;
      drawLine(MARGIN, MARGIN + CONTENT_W, y + rowH, BORDER, 0.5);

      // Description
      doc.font('Helvetica').fontSize(11).fillColor(TEXT);
      doc.text(item.description, tableXPositions[0] + 12, y + 9, {
        width: tableColWidths[0] - 24, align: 'left', lineBreak: false,
      });

      // Qty
      doc.text(String(item.quantity), tableXPositions[1] + 12, y + 9, {
        width: tableColWidths[1] - 24, align: 'center',
      });

      // Unit Price
      doc.text(formatCurrency(item.unitPrice), tableXPositions[2] + 12, y + 9, {
        width: tableColWidths[2] - 24, align: 'right',
      });

      // Total
      doc.font('Helvetica-Bold').fontSize(11).fillColor(TEXT);
      doc.text(formatCurrency(item.total), tableXPositions[3] + 12, y + 9, {
        width: tableColWidths[3] - 24, align: 'right',
      });

      y += rowH;
    }

    // Bottom border of table
    drawLine(MARGIN, MARGIN + CONTENT_W, y, BORDER, 1);
    y += 16;

    // ── 6. Totals Section ────────────────────────────────────────────
    ensureSpace(100);
    const totalsW = 260;
    const totalsX = MARGIN + CONTENT_W - totalsW;
    let totalsY = y;

    // Subtotal
    doc.font('Helvetica').fontSize(12).fillColor(MUTED);
    doc.text('Subtotal', totalsX, totalsY, { width: totalsW - 100 });
    doc.font('Helvetica').fontSize(12).fillColor(TEXT);
    doc.text(formatCurrency(invoice.subtotal), totalsX, totalsY, { width: totalsW, align: 'right' });
    totalsY += 20;

    // Tax
    if (invoice.tax > 0) {
      doc.font('Helvetica').fontSize(12).fillColor(MUTED);
      doc.text('Tax', totalsX, totalsY, { width: totalsW - 100 });
      doc.font('Helvetica').fontSize(12).fillColor(TEXT);
      doc.text(formatCurrency(invoice.tax), totalsX, totalsY, { width: totalsW, align: 'right' });
      totalsY += 20;
    }

    // Discount
    if (invoice.discount > 0) {
      doc.font('Helvetica').fontSize(12).fillColor(MUTED);
      doc.text('Discount', totalsX, totalsY, { width: totalsW - 100 });
      doc.font('Helvetica').fontSize(12).fillColor(GREEN);
      doc.text(`- ${formatCurrency(invoice.discount)}`, totalsX, totalsY, { width: totalsW, align: 'right' });
      totalsY += 20;
    }

    // Grand total separator
    drawLine(totalsX, totalsX + totalsW, totalsY, BORDER, 2);
    totalsY += 10;

    // Grand total
    doc.font('Helvetica-Bold').fontSize(16).fillColor(GREEN);
    doc.text('Total', totalsX, totalsY, { width: totalsW - 100 });
    doc.text(formatCurrency(invoice.total), totalsX, totalsY, { width: totalsW, align: 'right' });

    y = totalsY + 28;

    // ── 7. Payment History ───────────────────────────────────────────
    if (invoice.payments.length > 0) {
      ensureSpace(80);
      doc.font('Helvetica-Bold').fontSize(14).fillColor(TEXT);
      doc.text('Payment History', MARGIN, y);
      y = doc.y + 10;

      const payColWidths = [140, 160, CONTENT_W - 140 - 160 - 100, 100];
      const payHeaders = ['Date', 'Method', 'Amount', 'Status'];
      const payAligns = ['left', 'left', 'right', 'center'] as const;
      const payXPositions = [MARGIN];
      for (let i = 1; i < 4; i++) {
        payXPositions.push(payXPositions[i - 1] + payColWidths[i - 1]);
      }

      // Header
      drawRect(MARGIN, y, CONTENT_W, 26, BG_LIGHT);
      drawLine(MARGIN, MARGIN + CONTENT_W, y + 26, BORDER, 2);

      doc.font('Helvetica-Bold').fontSize(9).fillColor(MUTED);
      for (let i = 0; i < 4; i++) {
        doc.text(
          payHeaders[i],
          payXPositions[i] + 12,
          y + 7,
          { width: payColWidths[i] - 24, align: payAligns[i] }
        );
      }
      y += 26;

      // Payment rows
      for (const p of invoice.payments) {
        ensureSpace(28);
        const rowH = 28;
        drawLine(MARGIN, MARGIN + CONTENT_W, y + rowH, BORDER, 0.5);

        const methodStr = formatPaymentMethod(p.method) + (p.paymentChannel ? ` (${p.paymentChannel})` : '');

        doc.font('Helvetica').fontSize(11).fillColor(TEXT);
        doc.text(formatDate(p.paidAt), payXPositions[0] + 12, y + 8, { width: payColWidths[0] - 24 });
        doc.text(methodStr, payXPositions[1] + 12, y + 8, { width: payColWidths[1] - 24 });
        doc.font('Helvetica-Bold').fontSize(11).fillColor(TEXT);
        doc.text(formatCurrency(p.amount), payXPositions[2] + 12, y + 8, { width: payColWidths[2] - 24, align: 'right' });

        // Status badge
        const payStatusText = p.status.toUpperCase();
        const payStatusColors: Record<string, { bg: string; fg: string }> = {
          COMPLETED: { bg: '#d1fae5', fg: '#065f46' },
          PENDING: { bg: '#fef3c7', fg: '#92400e' },
          FAILED: { bg: '#fee2e2', fg: '#991b1b' },
          REFUNDED: { bg: '#f3f4f6', fg: '#4b5563' },
          PROCESSING: { bg: '#dbeafe', fg: '#1e40af' },
        };
        const pColors = payStatusColors[payStatusText] || payStatusColors.PENDING;

        doc.font('Helvetica-Bold').fontSize(8);
        const psW = doc.widthOfString(payStatusText) + 16;
        const psH = 16;
        const psX = payXPositions[3] + (payColWidths[3] - psW) / 2;
        const psY = y + 6;

        drawRect(psX, psY, psW, psH, pColors.bg);
        doc.fillColor(pColors.fg).text(payStatusText, psX, psY + 3, { width: psW, align: 'center' });

        y += rowH;
      }
      drawLine(MARGIN, MARGIN + CONTENT_W, y, BORDER, 1);
      y += 16;
    }

    // ── 8. Notes ─────────────────────────────────────────────────────
    if (invoice.notes) {
      ensureSpace(60);
      drawRect(MARGIN, y, CONTENT_W, 48, BG_LIGHT);

      doc.font('Helvetica').fontSize(9).fillColor(MUTED);
      doc.text('NOTES', MARGIN + 16, y + 10, { characterSpacing: 0.5 });

      doc.font('Helvetica').fontSize(11).fillColor(TEXT);
      doc.text(invoice.notes, MARGIN + 16, y + 24, { width: CONTENT_W - 32 });

      y += 48 + 16;
    }

    // ── 9. Footer ────────────────────────────────────────────────────
    // Ensure footer is near bottom of last page
    const footerY = PAGE_H - 50;
    drawLine(MARGIN, MARGIN + CONTENT_W, footerY - 12, BORDER, 0.5);

    doc.font('Helvetica').fontSize(10).fillColor(LIGHT_MUTED);
    doc.text(
      'Generated by nekkeWiFi \u2014 ISP Billing Platform',
      MARGIN, footerY,
      { width: CONTENT_W, align: 'center' }
    );
    doc.font('Helvetica').fontSize(9).fillColor(LIGHT_MUTED);
    doc.text(
      `Generated on ${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}`,
      MARGIN, doc.y + 2,
      { width: CONTENT_W, align: 'center' }
    );

    // ── Finalize ─────────────────────────────────────────────────────
    doc.end();
    const pdfBuffer = await pdfPromise;

    const filename = `invoice-${invoice.invoiceNumber}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
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

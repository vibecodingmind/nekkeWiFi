import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { requirePermission, getOrgFilter, AuthError } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authUser = requirePermission(request, 'payments.view');
    const { searchParams } = new URL(request.url);
    const orgIdParam = searchParams.get('orgId') ?? '';
    const customerId = searchParams.get('customerId') ?? '';
    const method = searchParams.get('method') ?? '';
    const paymentChannel = searchParams.get('paymentChannel') ?? '';
    const gateway = searchParams.get('gateway') ?? '';
    const startDateParam = searchParams.get('startDate') ?? '';
    const endDateParam = searchParams.get('endDate') ?? '';

    const orgId = getOrgFilter(authUser, orgIdParam || undefined);

    const where: Prisma.PaymentWhereInput = { organizationId: orgId };

    if (customerId) where.customerId = customerId;
    if (method) where.method = method;
    if (paymentChannel) where.paymentChannel = paymentChannel;
    if (gateway) where.gateway = gateway;

    if (startDateParam && endDateParam) {
      where.paidAt = {
        gte: new Date(startDateParam),
        lte: new Date(endDateParam),
      };
    }

    const payments = await db.payment.findMany({
      where,
      orderBy: { paidAt: 'desc' },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        invoice: {
          select: { id: true, invoiceNumber: true, total: true, status: true },
        },
        organization: { select: { id: true, name: true } },
      },
    });

    const completedPayments = payments.filter((p) => p.status === 'completed');
    const totalAmount = completedPayments.reduce((sum, p) => sum + p.amount, 0);
    const pesapalPayments = completedPayments.filter((p) => p.gateway === 'pesapal');
    const pesapalAmount = pesapalPayments.reduce((sum, p) => sum + p.amount, 0);
    const manualPayments = completedPayments.filter((p) => p.gateway !== 'pesapal');
    const manualAmount = manualPayments.reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({
      data: payments,
      summary: {
        count: payments.length,
        totalAmount,
        pesapalCount: pesapalPayments.length,
        pesapalAmount,
        manualCount: manualPayments.length,
        manualAmount,
      },
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Payments GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch payments';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = requirePermission(request, 'payments.manage');
    const body = await request.json();
    const {
      organizationId, customerId, invoiceId, amount, method,
      paymentChannel, gateway, pesapalTrackingId, pesapalMerchantRef, pesapalPaymentMethod,
      reference, status, receiptNumber, notes, paidAt,
    } = body;

    const orgId = getOrgFilter(authUser, organizationId);

    if (!orgId || !customerId || amount === undefined) {
      return NextResponse.json(
        { error: 'customerId and amount are required' },
        { status: 400 }
      );
    }

    const customer = await db.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    if (invoiceId) {
      const invoice = await db.invoice.findUnique({
        where: { id: invoiceId },
        include: { payments: { select: { id: true, amount: true, status: true } } },
      });

      if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }

      const existingPaid = invoice.payments
        .filter((p) => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);

      const newTotalPaid = existingPaid + amount;

      let newInvoiceStatus: string;
      if (newTotalPaid >= invoice.total) {
        newInvoiceStatus = 'paid';
      } else if (newTotalPaid > 0) {
        newInvoiceStatus = 'partial';
      } else {
        newInvoiceStatus = invoice.status;
      }

      const result = await db.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            organizationId: orgId,
            customerId,
            invoiceId,
            amount,
            method: method ?? 'cash',
            paymentChannel,
            gateway,
            pesapalTrackingId,
            pesapalMerchantRef,
            pesapalPaymentMethod,
            reference,
            status: status ?? 'completed',
            receiptNumber,
            notes,
            paidAt: paidAt ? new Date(paidAt) : new Date(),
          },
          include: {
            customer: { select: { id: true, firstName: true, lastName: true } },
            invoice: { select: { id: true, invoiceNumber: true } },
          },
        });

        await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            status: newInvoiceStatus,
            ...(newInvoiceStatus === 'paid' && !invoice.paidAt && { paidAt: new Date() }),
          },
        });

        return payment;
      });

      return NextResponse.json(result, { status: 201 });
    } else {
      const payment = await db.payment.create({
        data: {
          organizationId: orgId,
          customerId,
          amount,
          method: method ?? 'cash',
          paymentChannel,
          gateway,
          pesapalTrackingId,
          pesapalMerchantRef,
          pesapalPaymentMethod,
          reference,
          status: status ?? 'completed',
          receiptNumber,
          notes,
          paidAt: paidAt ? new Date(paidAt) : new Date(),
        },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true } },
          invoice: { select: { id: true, invoiceNumber: true } },
        },
      });

      return NextResponse.json(payment, { status: 201 });
    }
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Payments POST error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create payment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

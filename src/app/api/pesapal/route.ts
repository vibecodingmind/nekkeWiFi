import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requirePermission, getOrgFilter, AuthError } from '@/lib/auth';

// Available payment methods for Tanzanian Pesapal integration
const PAYMENT_METHODS = [
  { id: 'mpesa', name: 'M-Pesa', category: 'mobile_money', icon: 'phone', color: '#4CAF50' },
  { id: 'airtel_money', name: 'Airtel Money', category: 'mobile_money', icon: 'phone', color: '#FF0000' },
  { id: 'tigo_pesa', name: 'Tigo Pesa', category: 'mobile_money', icon: 'phone', color: '#00AEEF' },
  { id: 'halotel', name: 'Halotel', category: 'mobile_money', icon: 'phone', color: '#FF6600' },
  { id: 'ttcl_pesa', name: 'TTCL Pesa', category: 'mobile_money', icon: 'phone', color: '#003366' },
  { id: 'visa', name: 'Visa', category: 'card', icon: 'creditCard', color: '#1A1F71' },
  { id: 'mastercard', name: 'Mastercard', category: 'card', icon: 'creditCard', color: '#EB001B' },
  { id: 'bank_transfer', name: 'Bank Transfer', category: 'bank', icon: 'building', color: '#2E7D32' },
];

const CHANNEL_NAME_MAP: Record<string, string> = {
  mpesa: 'M-PESA',
  airtel_money: 'AIRTEL MONEY',
  tigo_pesa: 'TIGO PESA',
  halotel: 'HALOSEL',
  ttcl_pesa: 'TTCL PESA',
  visa: 'VISA',
  mastercard: 'MASTERCARD',
  bank_transfer: 'BANK TRANSFER',
};

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// GET /api/pesapal?orgId=xxx
export async function GET(request: NextRequest) {
  try {
    const authUser = requireAuth(request);
    const { searchParams } = new URL(request.url);
    const orgIdParam = searchParams.get('orgId');

    const orgId = getOrgFilter(authUser, orgIdParam);

    const gateway = await db.paymentGateway.findFirst({
      where: {
        organizationId: orgId,
        gateway: 'pesapal',
      },
    });

    if (!gateway) {
      return NextResponse.json({
        configured: false,
        message: 'Pesapal gateway not configured for this organization',
        isEnabled: false,
        isLive: false,
        paymentMethods: PAYMENT_METHODS,
      });
    }

    return NextResponse.json({
      configured: true,
      consumerKey: gateway.consumerKey,
      isEnabled: gateway.isEnabled,
      isLive: gateway.isLive,
      callbackUrl: gateway.callbackUrl,
      ipnUrl: gateway.ipnUrl,
      paymentMethods: PAYMENT_METHODS,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Pesapal GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch Pesapal config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/pesapal
export async function POST(request: NextRequest) {
  try {
    requirePermission(request, 'pesapal.manage');
    const body = await request.json();
    const {
      organizationId,
      customerId,
      invoiceId,
      amount,
      currency,
      paymentChannel,
      phone,
      email,
      firstName,
      lastName,
    } = body;

    // Organization ID comes from request body, validated by requirePermission above
    if (!organizationId || !customerId || !amount || !paymentChannel) {
      return NextResponse.json(
        { error: 'organizationId, customerId, amount, and paymentChannel are required' },
        { status: 400 }
      );
    }

    const customer = await db.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    if (invoiceId) {
      const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }
    }

    const gateway = await db.paymentGateway.findFirst({
      where: {
        organizationId,
        gateway: 'pesapal',
        isEnabled: true,
      },
    });

    if (!gateway) {
      return NextResponse.json(
        { error: 'Pesapal gateway is not configured or enabled for this organization' },
        { status: 400 }
      );
    }

    const pesapalTrackingId = `PSP-TZ-${generateRandomString(12)}`;
    const pesapalMerchantRef = `NKW-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const pesapalPaymentMethod = CHANNEL_NAME_MAP[paymentChannel] ?? paymentChannel.toUpperCase();

    const payment = await db.payment.create({
      data: {
        organizationId,
        customerId,
        invoiceId: invoiceId ?? null,
        amount: Number(amount),
        method: 'pesapal',
        paymentChannel,
        gateway: 'pesapal',
        pesapalTrackingId,
        pesapalMerchantRef,
        pesapalPaymentMethod,
        status: 'processing',
        notes: `Pesapal order via ${pesapalPaymentMethod}. Phone: ${phone ?? 'N/A'}, Email: ${email ?? 'N/A'}`,
        paidAt: new Date(),
      },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        invoice: {
          select: { id: true, invoiceNumber: true, total: true, status: true },
        },
      },
    });

    setTimeout(async () => {
      try {
        const isCompleted = Math.random() < 0.9;
        const newStatus = isCompleted ? 'completed' : 'failed';

        await db.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: payment.id },
            data: { status: newStatus },
          });

          if (isCompleted && invoiceId) {
            const updatedInvoice = await tx.invoice.findUnique({
              where: { id: invoiceId },
              include: { payments: { select: { id: true, amount: true, status: true } } },
            });

            if (updatedInvoice) {
              const totalPaid = updatedInvoice.payments
                .filter((p) => p.status === 'completed')
                .reduce((sum, p) => sum + p.amount, 0);

              let invoiceStatus: string;
              if (totalPaid >= updatedInvoice.total) {
                invoiceStatus = 'paid';
              } else if (totalPaid > 0) {
                invoiceStatus = 'partial';
              } else {
                invoiceStatus = updatedInvoice.status;
              }

              await tx.invoice.update({
                where: { id: invoiceId },
                data: {
                  status: invoiceStatus,
                  ...(invoiceStatus === 'paid' && !updatedInvoice.paidAt && { paidAt: new Date() }),
                },
              });
            }
          }
        });

        console.log(
          `[Pesapal Simulation] Payment ${pesapalTrackingId} → ${newStatus}`
        );
      } catch (simError) {
        console.error('[Pesapal Simulation] Error updating payment:', simError);
      }
    }, 2000);

    return NextResponse.json({
      trackingId: pesapalTrackingId,
      merchantRef: pesapalMerchantRef,
      status: 'processing',
      redirectUrl: null,
      paymentMethods: PAYMENT_METHODS,
      payment: {
        id: payment.id,
        amount: payment.amount,
        currency: currency ?? 'TZS',
        paymentChannel,
        pesapalPaymentMethod,
      },
    }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Pesapal POST error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create Pesapal order';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


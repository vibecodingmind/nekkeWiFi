import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

function generatePPPoECredentials(customerId: string): { username: string; password: string } {
  const shortId = customerId.slice(-6).toUpperCase();
  const randomNum = Math.floor(Math.random() * 9000) + 1000;
  const username = `isp_${shortId}`;
  const password = `pwd_${shortId}_${randomNum}`;
  return { username, password };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId') ?? '';
    const customerId = searchParams.get('customerId') ?? '';
    const status = searchParams.get('status') ?? '';

    const where: Prisma.SubscriptionWhereInput = {};

    if (orgId) where.organizationId = orgId;
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;

    const subscriptions = await db.subscription.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
        plan: {
          select: { id: true, name: true, speedDown: true, speedUp: true, priceMonthly: true },
        },
        device: {
          select: { id: true, name: true, type: true, ipAddress: true },
        },
        organization: { select: { id: true, name: true } },
        _count: {
          select: { invoices: true, usageRecords: true },
        },
      },
    });

    return NextResponse.json(subscriptions);
  } catch (error: unknown) {
    console.error('Subscriptions GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch subscriptions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organizationId, customerId, planId, deviceId, status,
      startDate, endDate, billingCycle, autoRenew,
      username, password, ipAssignment, notes,
    } = body;

    if (!organizationId || !customerId || !planId) {
      return NextResponse.json(
        { error: 'organizationId, customerId, and planId are required' },
        { status: 400 }
      );
    }

    // Verify customer exists
    const customer = await db.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Verify plan exists
    const plan = await db.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Verify device exists if provided
    if (deviceId) {
      const device = await db.device.findUnique({ where: { id: deviceId } });
      if (!device) {
        return NextResponse.json({ error: 'Device not found' }, { status: 404 });
      }
    }

    // Auto-generate PPPoE credentials if not provided
    let pppoeUsername = username;
    let pppoePassword = password;
    if (!pppoeUsername || !pppoePassword) {
      const credentials = generatePPPoECredentials(customerId);
      pppoeUsername = pppoeUsername ?? credentials.username;
      pppoePassword = pppoePassword ?? credentials.password;
    }

    const subscription = await db.subscription.create({
      data: {
        organizationId,
        customerId,
        planId,
        deviceId,
        status: status ?? 'active',
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        billingCycle: billingCycle ?? 'monthly',
        autoRenew: autoRenew ?? true,
        username: pppoeUsername,
        password: pppoePassword,
        ipAssignment,
        notes,
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
        plan: { select: { id: true, name: true, speedDown: true, speedUp: true, priceMonthly: true } },
        device: { select: { id: true, name: true, type: true } },
      },
    });

    return NextResponse.json(subscription, { status: 201 });
  } catch (error: unknown) {
    console.error('Subscriptions POST error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create subscription';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

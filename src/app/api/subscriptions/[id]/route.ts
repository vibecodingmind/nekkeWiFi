import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const subscription = await db.subscription.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true, status: true },
        },
        plan: {
          select: {
            id: true, name: true, speedDown: true, speedUp: true,
            priceMonthly: true, priceQuarterly: true, priceYearly: true,
            dataCap: true,
          },
        },
        device: {
          select: { id: true, name: true, type: true, ipAddress: true, status: true },
        },
        organization: { select: { id: true, name: true } },
        invoices: {
          orderBy: { createdAt: 'desc' },
          include: {
            payments: { select: { id: true, amount: true, method: true, paidAt: true } },
          },
        },
        _count: {
          select: { usageRecords: true },
        },
      },
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    return NextResponse.json(subscription);
  } catch (error: unknown) {
    console.error('Subscription GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch subscription';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.subscription.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    const {
      planId, deviceId, status, startDate, endDate,
      billingCycle, autoRenew, username, password, ipAssignment, notes,
    } = body;

    // Verify plan exists if changing
    if (planId) {
      const plan = await db.plan.findUnique({ where: { id: planId } });
      if (!plan) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
      }
    }

    // Verify device exists if changing
    if (deviceId) {
      const device = await db.device.findUnique({ where: { id: deviceId } });
      if (!device) {
        return NextResponse.json({ error: 'Device not found' }, { status: 404 });
      }
    }

    const subscription = await db.subscription.update({
      where: { id },
      data: {
        ...(planId !== undefined && { planId }),
        ...(deviceId !== undefined && { deviceId }),
        ...(status !== undefined && { status }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(billingCycle !== undefined && { billingCycle }),
        ...(autoRenew !== undefined && { autoRenew }),
        ...(username !== undefined && { username }),
        ...(password !== undefined && { password }),
        ...(ipAssignment !== undefined && { ipAssignment }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
        plan: { select: { id: true, name: true, speedDown: true, speedUp: true, priceMonthly: true } },
        device: { select: { id: true, name: true, type: true } },
      },
    });

    return NextResponse.json(subscription);
  } catch (error: unknown) {
    console.error('Subscription PUT error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update subscription';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.subscription.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    await db.subscription.delete({ where: { id } });

    return NextResponse.json({ message: 'Subscription deleted successfully' });
  } catch (error: unknown) {
    console.error('Subscription DELETE error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete subscription';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

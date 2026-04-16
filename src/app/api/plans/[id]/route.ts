import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const plan = await db.plan.findUnique({
      where: { id },
      include: {
        organization: { select: { id: true, name: true } },
        _count: {
          select: {
            subscriptions: true,
          },
        },
        provisioningRules: true,
      },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Count active and trial subscriptions separately
    const activeSubscribers = await db.subscription.count({
      where: { planId: id, status: 'active' },
    });
    const trialSubscribers = await db.subscription.count({
      where: { planId: id, status: 'trial' },
    });

    // Calculate MRR from active subscriptions
    const mrr = plan.priceMonthly * activeSubscribers;

    return NextResponse.json({
      ...plan,
      mrr,
      activeSubscribers,
      trialSubscribers,
      totalSubscribers: plan._count.subscriptions,
    });
  } catch (error: unknown) {
    console.error('Plan GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch plan';
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

    const existing = await db.plan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const {
      name, description, speedDown, speedUp, dataCap,
      priceMonthly, priceQuarterly, priceYearly, setupFee,
      isActive, isPopular,
    } = body;

    const plan = await db.plan.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(speedDown !== undefined && { speedDown }),
        ...(speedUp !== undefined && { speedUp }),
        ...(dataCap !== undefined && { dataCap }),
        ...(priceMonthly !== undefined && { priceMonthly }),
        ...(priceQuarterly !== undefined && { priceQuarterly }),
        ...(priceYearly !== undefined && { priceYearly }),
        ...(setupFee !== undefined && { setupFee }),
        ...(isActive !== undefined && { isActive }),
        ...(isPopular !== undefined && { isPopular }),
      },
      include: {
        organization: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(plan);
  } catch (error: unknown) {
    console.error('Plan PUT error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update plan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.plan.findUnique({
      where: { id },
      include: { _count: { select: { subscriptions: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    if (existing._count.subscriptions > 0) {
      return NextResponse.json(
        { error: 'Cannot delete plan with active subscriptions. Deactivate it instead.' },
        { status: 400 }
      );
    }

    await db.plan.delete({ where: { id } });

    return NextResponse.json({ message: 'Plan deleted successfully' });
  } catch (error: unknown) {
    console.error('Plan DELETE error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete plan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

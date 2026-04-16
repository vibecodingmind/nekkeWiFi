import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId') ?? '';
    const isActiveParam = searchParams.get('isActive') ?? '';

    const where: Prisma.PlanWhereInput = {};

    if (orgId) where.organizationId = orgId;
    if (isActiveParam !== '') {
      where.isActive = isActiveParam === 'true';
    }

    const plans = await db.plan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        organization: { select: { id: true, name: true } },
        _count: {
          select: {
            subscriptions: {
              where: { status: { in: ['active', 'trial'] } },
            },
          },
        },
      },
    });

    return NextResponse.json(plans);
  } catch (error: unknown) {
    console.error('Plans GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch plans';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organizationId, name, description, speedDown, speedUp,
      dataCap, priceMonthly, priceQuarterly, priceYearly,
      setupFee, isActive, isPopular,
    } = body;

    if (!organizationId || !name || !speedDown || !speedUp || priceMonthly === undefined) {
      return NextResponse.json(
        { error: 'organizationId, name, speedDown, speedUp, and priceMonthly are required' },
        { status: 400 }
      );
    }

    // Verify organization exists
    const org = await db.organization.findUnique({ where: { id: organizationId } });
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const plan = await db.plan.create({
      data: {
        organizationId,
        name,
        description,
        speedDown,
        speedUp,
        dataCap,
        priceMonthly,
        priceQuarterly,
        priceYearly,
        setupFee: setupFee ?? 0,
        isActive: isActive ?? true,
        isPopular: isPopular ?? false,
      },
      include: {
        organization: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error: unknown) {
    console.error('Plans POST error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create plan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

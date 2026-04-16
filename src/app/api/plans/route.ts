import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { requirePermission, getOrgFilter, AuthError } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authUser = requirePermission(request, 'plans.view');
    const { searchParams } = new URL(request.url);
    const orgIdParam = searchParams.get('orgId') ?? '';
    const isActiveParam = searchParams.get('isActive') ?? '';

    const orgId = getOrgFilter(authUser, orgIdParam || undefined);

    const where: Prisma.PlanWhereInput = { organizationId: orgId };

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
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Plans GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch plans';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = requirePermission(request, 'plans.manage');
    const body = await request.json();
    const {
      organizationId, name, description, speedDown, speedUp,
      dataCap, priceMonthly, priceQuarterly, priceYearly,
      setupFee, isActive, isPopular,
    } = body;

    const orgId = getOrgFilter(authUser, organizationId);

    if (!orgId || !name || !speedDown || !speedUp || priceMonthly === undefined) {
      return NextResponse.json(
        { error: 'name, speedDown, speedUp, and priceMonthly are required' },
        { status: 400 }
      );
    }

    // Verify organization exists
    const org = await db.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const plan = await db.plan.create({
      data: {
        organizationId: orgId,
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
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Plans POST error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create plan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

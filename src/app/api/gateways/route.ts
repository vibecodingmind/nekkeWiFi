import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// GET /api/gateways?orgId=xxx — List all payment gateways for an organization
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json(
        { error: 'orgId query parameter is required' },
        { status: 400 }
      );
    }

    // Verify organization exists
    const org = await db.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const gateways = await db.paymentGateway.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });

    // Count payments per gateway
    const paymentCounts = await db.payment.groupBy({
      by: ['gateway'],
      where: {
        organizationId: orgId,
        gateway: { not: null },
      },
      _count: {
        id: true,
      },
      _sum: {
        amount: true,
      },
    });

    const countMap = new Map(paymentCounts.map((p) => [p.gateway, p]));

    const enriched = gateways.map((gw) => {
      const stats = countMap.get(gw.gateway);
      return {
        ...gw,
        consumerSecret: gw.consumerSecret
          ? gw.consumerSecret.substring(0, 4) + '****' + gw.consumerSecret.substring(gw.consumerSecret.length - 4)
          : null,
        paymentCount: stats?._count.id ?? 0,
        totalAmount: stats?._sum.amount ?? 0,
      };
    });

    return NextResponse.json(enriched);
  } catch (error: unknown) {
    console.error('Gateways GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch gateways';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/gateways — Create or update a payment gateway config
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organizationId,
      gateway,
      consumerKey,
      consumerSecret,
      apiKey,
      isLive,
      isEnabled,
      callbackUrl,
      ipnUrl,
    } = body;

    if (!organizationId || !gateway) {
      return NextResponse.json(
        { error: 'organizationId and gateway are required' },
        { status: 400 }
      );
    }

    // Verify organization exists
    const org = await db.organization.findUnique({ where: { id: organizationId } });
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Check if a gateway config already exists for this org+gateway
    const existing = await db.paymentGateway.findFirst({
      where: {
        organizationId,
        gateway,
      },
    });

    let result;

    if (existing) {
      // Update existing config
      result = await db.paymentGateway.update({
        where: { id: existing.id },
        data: {
          ...(consumerKey !== undefined && { consumerKey }),
          ...(consumerSecret !== undefined && { consumerSecret }),
          ...(apiKey !== undefined && { apiKey }),
          ...(isLive !== undefined && { isLive }),
          ...(isEnabled !== undefined && { isEnabled }),
          ...(callbackUrl !== undefined && { callbackUrl }),
          ...(ipnUrl !== undefined && { ipnUrl }),
        },
      });
    } else {
      // Create new config
      result = await db.paymentGateway.create({
        data: {
          organizationId,
          gateway,
          consumerKey: consumerKey ?? null,
          consumerSecret: consumerSecret ?? null,
          apiKey: apiKey ?? null,
          isLive: isLive ?? false,
          isEnabled: isEnabled ?? true,
          callbackUrl: callbackUrl ?? null,
          ipnUrl: ipnUrl ?? null,
        },
      });
    }

    return NextResponse.json({
      ...result,
      consumerSecret: result.consumerSecret
        ? result.consumerSecret.substring(0, 4) + '****' + result.consumerSecret.substring(result.consumerSecret.length - 4)
        : null,
    }, { status: existing ? 200 : 201 });
  } catch (error: unknown) {
    console.error('Gateways POST error:', error);
    const message = error instanceof Error ? error.message : 'Failed to save gateway config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

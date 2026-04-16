import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    const whereOrg: Prisma.OrganizationWhereInput = orgId
      ? { id: orgId }
      : {};

    // Total subscribers by status
    const subscriberCounts = await db.customer.groupBy({
      by: ['status'],
      where: { organization: whereOrg },
      _count: { id: true },
    });

    const totalSubscribers = await db.customer.count({
      where: { organization: whereOrg },
    });

    const activeSubscribers = subscriberCounts.find((s) => s.status === 'active')?._count.id ?? 0;
    const suspendedSubscribers = subscriberCounts.find((s) => s.status === 'suspended')?._count.id ?? 0;
    const trialSubscribers = subscriberCounts.find((s) => s.status === 'trial')?._count.id ?? 0;
    const disconnectedSubscribers = subscriberCounts.find((s) => s.status === 'disconnected')?._count.id ?? 0;

    // MRR: sum of active subscription plan prices
    const mrrData = await db.subscription.groupBy({
      by: ['planId'],
      where: {
        status: 'active',
        organization: whereOrg,
      },
    });

    let mrr = 0;
    for (const sub of mrrData) {
      const plan = await db.plan.findUnique({ where: { id: sub.planId } });
      if (plan) {
        mrr += plan.priceMonthly;
      }
    }

    // Revenue this month vs last month
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const revenueThisMonth = await db.payment.aggregate({
      where: {
        status: 'completed',
        organization: whereOrg,
        paidAt: { gte: thisMonthStart },
      },
      _sum: { amount: true },
    });

    const revenueLastMonth = await db.payment.aggregate({
      where: {
        status: 'completed',
        organization: whereOrg,
        paidAt: { gte: lastMonthStart, lte: lastMonthEnd },
      },
      _sum: { amount: true },
    });

    const thisMonthRevenue = revenueThisMonth._sum.amount ?? 0;
    const lastMonthRevenue = revenueLastMonth._sum.amount ?? 0;
    const revenueChange = lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : 0;

    // Active devices
    const activeDevices = await db.device.count({
      where: {
        status: 'online',
        organization: whereOrg,
      },
    });

    const totalDevices = await db.device.count({
      where: { organization: whereOrg },
    });

    // Overdue invoices
    const overdueInvoices = await db.invoice.count({
      where: {
        status: 'overdue',
        organization: whereOrg,
      },
    });

    // Revenue trend - last 6 months
    const revenueTrend: Array<{ month: string; year: number; monthIndex: number; revenue: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);

      const monthRevenue = await db.payment.aggregate({
        where: {
          status: 'completed',
          organization: whereOrg,
          paidAt: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
      });

      revenueTrend.push({
        month: monthStart.toLocaleString('default', { month: 'short', year: 'numeric' }),
        year: monthStart.getFullYear(),
        monthIndex: monthStart.getMonth(),
        revenue: monthRevenue._sum.amount ?? 0,
      });
    }

    // Plan distribution
    const planDistribution = await db.subscription.groupBy({
      by: ['planId'],
      where: {
        status: { in: ['active', 'trial'] },
        organization: whereOrg,
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const planDistWithNames = await Promise.all(
      planDistribution.map(async (p) => {
        const plan = await db.plan.findUnique({
          where: { id: p.planId },
          select: { id: true, name: true, speedDown: true, speedUp: true, priceMonthly: true },
        });
        return {
          planId: p.planId,
          planName: plan?.name ?? 'Unknown',
          speedDown: plan?.speedDown ?? '',
          speedUp: plan?.speedUp ?? '',
          priceMonthly: plan?.priceMonthly ?? 0,
          subscriberCount: p._count.id,
        };
      })
    );

    // Top plans by subscriber count (top 5)
    const topPlans = planDistWithNames.slice(0, 5);

    // Recent invoices (last 10)
    const recentInvoices = await db.invoice.findMany({
      where: { organization: whereOrg },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Recent payments (last 10)
    const recentPayments = await db.payment.findMany({
      where: { organization: whereOrg },
      orderBy: { paidAt: 'desc' },
      take: 10,
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true },
        },
        invoice: {
          select: { id: true, invoiceNumber: true },
        },
      },
    });

    return NextResponse.json({
      subscribers: {
        total: totalSubscribers,
        active: activeSubscribers,
        suspended: suspendedSubscribers,
        trial: trialSubscribers,
        disconnected: disconnectedSubscribers,
      },
      mrr,
      revenue: {
        thisMonth: thisMonthRevenue,
        lastMonth: lastMonthRevenue,
        changePercent: Math.round(revenueChange * 100) / 100,
      },
      devices: {
        total: totalDevices,
        active: activeDevices,
      },
      overdueInvoices,
      revenueTrend,
      planDistribution: planDistWithNames,
      topPlans,
      recentInvoices,
      recentPayments,
    });
  } catch (error: unknown) {
    console.error('Dashboard error:', error);
    const message = error instanceof Error ? error.message : 'Failed to load dashboard data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

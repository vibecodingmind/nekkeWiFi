import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId') ?? '';
    const reportType = searchParams.get('type') ?? 'revenue';

    const whereOrg: Prisma.OrganizationWhereInput = orgId ? { id: orgId } : {};

    switch (reportType) {
      case 'revenue':
        return await getRevenueReport(whereOrg);
      case 'subscribers':
        return await getSubscribersReport(whereOrg);
      case 'usage':
        return await getUsageReport(whereOrg);
      case 'plans':
        return await getPlansReport(whereOrg);
      case 'churn':
        return await getChurnReport(whereOrg);
      default:
        return NextResponse.json(
          { error: `Invalid report type: ${reportType}. Use: revenue, subscribers, usage, plans, churn` },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    console.error('Reports GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate report';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ──────────────────────────────────────────
// REVENUE REPORT: monthly revenue for last 12 months
// ──────────────────────────────────────────
async function getRevenueReport(whereOrg: Prisma.OrganizationWhereInput) {
  const now = new Date();
  const monthlyRevenue: Array<{
    month: string; year: number; monthIndex: number;
    revenue: number; invoiced: number; paymentCount: number;
    invoiceCount: number; overdueInvoices: number;
  }> = [];

  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);

    const paymentAgg = await db.payment.aggregate({
      where: {
        status: 'completed',
        organization: whereOrg,
        paidAt: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
      _count: true,
    });

    const invoiceAgg = await db.invoice.aggregate({
      where: {
        organization: whereOrg,
        createdAt: { gte: monthStart, lte: monthEnd },
      },
      _sum: { total: true },
      _count: true,
    });

    const overdueCount = await db.invoice.count({
      where: {
        status: 'overdue',
        organization: whereOrg,
        dueDate: { lte: monthEnd },
      },
    });

    monthlyRevenue.push({
      month: monthStart.toLocaleString('default', { month: 'short', year: 'numeric' }),
      year: monthStart.getFullYear(),
      monthIndex: monthStart.getMonth(),
      revenue: paymentAgg._sum.amount ?? 0,
      invoiced: invoiceAgg._sum.total ?? 0,
      paymentCount: paymentAgg._count,
      invoiceCount: invoiceAgg._count,
      overdueInvoices: overdueCount,
    });
  }

  // Payment method breakdown (all time)
  const methodBreakdown = await db.payment.groupBy({
    by: ['method'],
    where: {
      status: 'completed',
      organization: whereOrg,
    },
    _sum: { amount: true },
    _count: true,
    orderBy: { _sum: { amount: 'desc' } },
  });

  // Total metrics
  const totalRevenue = await db.payment.aggregate({
    where: { status: 'completed', organization: whereOrg },
    _sum: { amount: true },
    _count: true,
  });

  return NextResponse.json({
    type: 'revenue',
    title: 'Revenue Report',
    period: 'Last 12 months',
    summary: {
      totalRevenue: totalRevenue._sum.amount ?? 0,
      totalPayments: totalRevenue._count,
    },
    monthlyData: monthlyRevenue,
    paymentMethodBreakdown: methodBreakdown,
  });
}

// ──────────────────────────────────────────
// SUBSCRIBERS REPORT: growth, churn, status distribution
// ──────────────────────────────────────────
async function getSubscribersReport(whereOrg: Prisma.OrganizationWhereInput) {
  const now = new Date();

  // Current status distribution
  const statusDistribution = await db.customer.groupBy({
    by: ['status'],
    where: { organization: whereOrg },
    _count: { id: true },
  });

  // Monthly new subscribers (last 12 months)
  const monthlyNewSubscribers: Array<{
    month: string; year: number; monthIndex: number;
    newCustomers: number; newSubscriptions: number;
  }> = [];
  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);

    const newCustomers = await db.customer.count({
      where: {
        organization: whereOrg,
        createdAt: { gte: monthStart, lte: monthEnd },
      },
    });

    const newSubscriptions = await db.subscription.count({
      where: {
        organization: whereOrg,
        startDate: { gte: monthStart, lte: monthEnd },
      },
    });

    monthlyNewSubscribers.push({
      month: monthStart.toLocaleString('default', { month: 'short', year: 'numeric' }),
      year: monthStart.getFullYear(),
      monthIndex: monthStart.getMonth(),
      newCustomers,
      newSubscriptions,
    });
  }

  // Subscription status breakdown
  const subscriptionStatus = await db.subscription.groupBy({
    by: ['status'],
    where: { organization: whereOrg },
    _count: { id: true },
  });

  // Churn rate calculation (cancelled/expired subscriptions this month vs total active)
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const currentActive = await db.subscription.count({
    where: { status: 'active', organization: whereOrg },
  });

  const churnedThisMonth = await db.subscription.count({
    where: {
      status: { in: ['cancelled', 'expired'] },
      organization: whereOrg,
      updatedAt: { gte: thisMonthStart },
    },
  });

  const churnedLastMonth = await db.subscription.count({
    where: {
      status: { in: ['cancelled', 'expired'] },
      organization: whereOrg,
      updatedAt: { gte: lastMonthStart, lte: lastMonthEnd },
    },
  });

  const totalSubscribers = await db.customer.count({ where: { organization: whereOrg } });

  return NextResponse.json({
    type: 'subscribers',
    title: 'Subscribers Report',
    summary: {
      totalCustomers: totalSubscribers,
      activeSubscriptions: currentActive,
      churnRate: currentActive > 0 ? (churnedLastMonth / (currentActive + churnedLastMonth)) * 100 : 0,
      churnedThisMonth,
      churnedLastMonth,
    },
    statusDistribution,
    subscriptionStatus,
    monthlyGrowth: monthlyNewSubscribers,
  });
}

// ──────────────────────────────────────────
// USAGE REPORT: bandwidth per plan, top consumers
// ──────────────────────────────────────────
async function getUsageReport(whereOrg: Prisma.OrganizationWhereInput) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Bandwidth usage per plan (current month)
  const usagePerPlan = await db.usageRecord.groupBy({
    by: ['subscriptionId'],
    where: {
      organization: whereOrg,
      date: { gte: monthStart },
    },
    _sum: {
      downloadBytes: true,
      uploadBytes: true,
      totalBytes: true,
    },
  });

  // Aggregate by plan
  const planUsageMap: Record<string, {
    planId: string;
    planName: string;
    downloadBytes: number;
    uploadBytes: number;
    totalBytes: number;
    subscriptionCount: number;
  }> = {};

  for (const usage of usagePerPlan) {
    const sub = await db.subscription.findUnique({
      where: { id: usage.subscriptionId },
      select: { planId: true, plan: { select: { name: true } } },
    });
    if (!sub) continue;

    const planId = sub.planId;
    if (!planUsageMap[planId]) {
      planUsageMap[planId] = {
        planId,
        planName: sub.plan?.name ?? 'Unknown',
        downloadBytes: 0,
        uploadBytes: 0,
        totalBytes: 0,
        subscriptionCount: 0,
      };
    }
    planUsageMap[planId].downloadBytes += usage._sum.downloadBytes ?? 0;
    planUsageMap[planId].uploadBytes += usage._sum.uploadBytes ?? 0;
    planUsageMap[planId].totalBytes += usage._sum.totalBytes ?? 0;
    planUsageMap[planId].subscriptionCount += 1;
  }

  const planUsageData = Object.values(planUsageMap).sort((a, b) => b.totalBytes - a.totalBytes);

  // Top consumers (current month)
  const topConsumersRaw = await db.usageRecord.groupBy({
    by: ['customerId'],
    where: {
      organization: whereOrg,
      date: { gte: monthStart },
    },
    _sum: {
      downloadBytes: true,
      uploadBytes: true,
      totalBytes: true,
    },
    orderBy: { _sum: { totalBytes: 'desc' } },
    take: 20,
  });

  const topConsumers = await Promise.all(
    topConsumersRaw.map(async (agg) => {
      const customer = await db.customer.findUnique({
        where: { id: agg.customerId },
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      });
      return {
        customer,
        downloadBytes: agg._sum.downloadBytes ?? 0,
        uploadBytes: agg._sum.uploadBytes ?? 0,
        totalBytes: agg._sum.totalBytes ?? 0,
      };
    })
  );

  // Daily usage trend (current month)
  const dailyUsage = await db.usageRecord.groupBy({
    by: ['date'],
    where: {
      organization: whereOrg,
      date: { gte: monthStart },
    },
    _sum: {
      downloadBytes: true,
      uploadBytes: true,
      totalBytes: true,
    },
    orderBy: { date: 'asc' },
  });

  const dailyTrend = dailyUsage.map((d) => ({
    date: new Date(d.date).toISOString().split('T')[0],
    downloadBytes: d._sum.downloadBytes ?? 0,
    uploadBytes: d._sum.uploadBytes ?? 0,
    totalBytes: d._sum.totalBytes ?? 0,
  }));

  // Total summary
  const totalUsage = await db.usageRecord.aggregate({
    where: {
      organization: whereOrg,
      date: { gte: monthStart },
    },
    _sum: {
      downloadBytes: true,
      uploadBytes: true,
      totalBytes: true,
    },
    _count: true,
  });

  return NextResponse.json({
    type: 'usage',
    title: 'Usage Report',
    period: 'Current month',
    summary: {
      totalDownloadBytes: totalUsage._sum.downloadBytes ?? 0,
      totalUploadBytes: totalUsage._sum.uploadBytes ?? 0,
      totalBytes: totalUsage._sum.totalBytes ?? 0,
      recordCount: totalUsage._count,
    },
    bandwidthPerPlan: planUsageData,
    topConsumers,
    dailyTrend,
  });
}

// ──────────────────────────────────────────
// PLANS REPORT: popularity, revenue per plan
// ──────────────────────────────────────────
async function getPlansReport(whereOrg: Prisma.OrganizationWhereInput) {
  const plans = await db.plan.findMany({
    where: { organization: whereOrg },
    include: {
      _count: {
        select: {
          subscriptions: true,
        },
      },
    },
    orderBy: { priceMonthly: 'desc' },
  });

  // Get subscription counts by status for each plan
  const planStatusCounts: Record<string, Record<string, number>> = {};
  const allPlanSubs = await db.subscription.groupBy({
    by: ['planId', 'status'],
    where: { organization: whereOrg },
    _count: { id: true },
  });
  for (const row of allPlanSubs) {
    if (!planStatusCounts[row.planId]) planStatusCounts[row.planId] = {};
    planStatusCounts[row.planId][row.status] = row._count.id;
  }

  const planData = plans.map((plan) => {
    const counts = planStatusCounts[plan.id] ?? {};
    const activeCount = counts['active'] ?? 0;
    const mrr = plan.priceMonthly * activeCount;
    const yearlyRevenue = mrr * 12;

    return {
      id: plan.id,
      name: plan.name,
      speedDown: plan.speedDown,
      speedUp: plan.speedUp,
      priceMonthly: plan.priceMonthly,
      priceQuarterly: plan.priceQuarterly,
      priceYearly: plan.priceYearly,
      isActive: plan.isActive,
      isPopular: plan.isPopular,
      subscribers: {
        total: plan._count.subscriptions,
        active: activeCount,
        trial: counts['trial'] ?? 0,
        suspended: counts['suspended'] ?? 0,
        cancelled: counts['cancelled'] ?? 0,
        expired: counts['expired'] ?? 0,
      },
      mrr,
      yearlyProjectedRevenue: yearlyRevenue,
    };
  });

  // Sort by MRR
  planData.sort((a, b) => b.mrr - a.mrr);

  const totalMrr = planData.reduce((sum, p) => sum + p.mrr, 0);
  const totalSubscribers = planData.reduce((sum, p) => sum + p.subscribers.active, 0);

  return NextResponse.json({
    type: 'plans',
    title: 'Plans Report',
    summary: {
      totalPlans: plans.length,
      activePlans: plans.filter((p) => p.isActive).length,
      totalMrr,
      totalActiveSubscribers: totalSubscribers,
      averageMrrPerPlan: plans.length > 0 ? totalMrr / plans.length : 0,
    },
    plans: planData,
  });
}

// ──────────────────────────────────────────
// CHURN REPORT: churned subscribers, revenue loss
// ──────────────────────────────────────────
async function getChurnReport(whereOrg: Prisma.OrganizationWhereInput) {
  const now = new Date();

  // Churned subscriptions (cancelled or expired) in last 12 months
  const monthlyChurn: Array<{
    month: string; year: number; monthIndex: number;
    totalChurned: number; cancelled: number; expired: number;
    monthlyRevenueLoss: number;
    churnedSubscriptions: Array<{
      id: string; customer: { id: string; firstName: string; lastName: string };
      planName: string; planPrice: number; status: string;
    }>;
  }> = [];
  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);

    const churned = await db.subscription.findMany({
      where: {
        status: { in: ['cancelled', 'expired'] },
        organization: whereOrg,
        updatedAt: { gte: monthStart, lte: monthEnd },
      },
      include: {
        plan: { select: { priceMonthly: true, name: true } },
        customer: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const revenueLoss = churned.reduce(
      (sum, s) => sum + (s.plan?.priceMonthly ?? 0),
      0
    );

    const cancelledCount = churned.filter((s) => s.status === 'cancelled').length;
    const expiredCount = churned.filter((s) => s.status === 'expired').length;

    monthlyChurn.push({
      month: monthStart.toLocaleString('default', { month: 'short', year: 'numeric' }),
      year: monthStart.getFullYear(),
      monthIndex: monthStart.getMonth(),
      totalChurned: churned.length,
      cancelled: cancelledCount,
      expired: expiredCount,
      monthlyRevenueLoss: revenueLoss,
      churnedSubscriptions: churned.map((s) => ({
        id: s.id,
        customer: s.customer,
        planName: s.plan?.name ?? 'Unknown',
        planPrice: s.plan?.priceMonthly ?? 0,
        status: s.status,
      })),
    });
  }

  // All churned subscriptions with details
  const allChurned = await db.subscription.findMany({
    where: {
      status: { in: ['cancelled', 'expired'] },
      organization: whereOrg,
    },
    include: {
      plan: { select: { id: true, name: true, priceMonthly: true } },
      customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });

  const totalChurned = await db.subscription.count({
    where: {
      status: { in: ['cancelled', 'expired'] },
      organization: whereOrg,
    },
  });

  const totalRevenueLoss = allChurned.reduce(
    (sum, s) => sum + (s.plan?.priceMonthly ?? 0),
    0
  );

  const currentActive = await db.subscription.count({
    where: { status: 'active', organization: whereOrg },
  });

  return NextResponse.json({
    type: 'churn',
    title: 'Churn Report',
    summary: {
      totalChurned,
      currentActiveSubscribers: currentActive,
      totalMonthlyRevenueLoss: totalRevenueLoss,
      averageChurnRate: currentActive + totalChurned > 0
        ? (totalChurned / (currentActive + totalChurned)) * 100
        : 0,
    },
    monthlyChurn,
    recentChurned: allChurned,
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';

// GET /api/analytics?orgId=xxx&period=month
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const period = searchParams.get('period') || 'month';

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    // Calculate date ranges
    const now = new Date();
    const currentStart = startOfMonth(now);
    const currentEnd = endOfMonth(now);

    let monthsBack = 1;
    if (period === '3months') monthsBack = 3;
    if (period === '6months') monthsBack = 6;
    if (period === 'year') monthsBack = 12;

    const previousStart = startOfMonth(subMonths(now, monthsBack));
    const previousEnd = endOfMonth(subMonths(now, monthsBack));

    // Run all queries in parallel
    const [
      // Revenue data
      currentPayments,
      previousPayments,
      revenueByMonth,

      // Customer data
      totalCustomers,
      activeCustomers,
      newCustomersThisMonth,
      churnedCustomers,
      customersByStatus,

      // Subscription data
      totalSubscriptions,
      subscriptionsByPlan,
      subscriptionsByStatus,

      // Payment analytics
      paymentMethods,
      paymentChannels,
      totalInvoiceAmount,

      // Device data
      devices,

      // Usage data
      usageRecords,
    ] = await Promise.all([
      // Current period payments
      db.payment.aggregate({
        _sum: { amount: true },
        where: {
          organizationId: orgId,
          status: 'completed',
          paidAt: { gte: currentStart, lte: currentEnd },
        },
      }),

      // Previous period payments
      db.payment.aggregate({
        _sum: { amount: true },
        where: {
          organizationId: orgId,
          status: 'completed',
          paidAt: { gte: previousStart, lte: previousEnd },
        },
      }),

      // Revenue by month (last 6 months) - use findMany since groupBy on DateTime is limited
      db.payment.findMany({
        where: {
          organizationId: orgId,
          status: 'completed',
          paidAt: { gte: subMonths(now, 5) },
        },
        select: { paidAt: true, amount: true },
      }),

      // Customer counts
      db.customer.count({ where: { organizationId: orgId } }),
      db.customer.count({ where: { organizationId: orgId, status: 'active' } }),
      db.customer.count({
        where: {
          organizationId: orgId,
          createdAt: { gte: currentStart, lte: currentEnd },
        },
      }),
      db.customer.count({
        where: {
          organizationId: orgId,
          status: 'disconnected',
          updatedAt: { gte: currentStart, lte: currentEnd },
        },
      }),

      // Customers by status
      db.customer.groupBy({
        by: ['status'],
        where: { organizationId: orgId },
        _count: true,
      }),

      // Subscription counts
      db.subscription.count({
        where: { organizationId: orgId },
      }),

      // Subscriptions by plan
      db.subscription.groupBy({
        by: ['planId'],
        where: { organizationId: orgId },
        _count: true,
      }),

      // Subscriptions by status
      db.subscription.groupBy({
        by: ['status'],
        where: { organizationId: orgId },
        _count: true,
      }),

      // Payment methods
      db.payment.groupBy({
        by: ['method'],
        where: { organizationId: orgId, status: 'completed' },
        _count: true,
      }),

      // Payment channels
      db.payment.groupBy({
        by: ['paymentChannel'],
        where: {
          organizationId: orgId,
          status: 'completed',
          paymentChannel: { not: null },
        },
        _count: true,
      }),

      // Total invoices for collection rate
      db.invoice.aggregate({
        _sum: { total: true },
        where: {
          organizationId: orgId,
          status: { in: ['paid', 'partial'] },
          createdAt: { gte: currentStart, lte: currentEnd },
        },
      }),

      // Device stats
      db.device.findMany({
        where: { organizationId: orgId },
        select: {
          status: true,
          cpuUsage: true,
          memoryUsage: true,
        },
      }),

      // Usage data
      db.usageRecord.findMany({
        where: { organizationId: orgId },
        select: { totalBytes: true, customerId: true },
        take: 1000,
        orderBy: { totalBytes: 'desc' },
      }),
    ]);

    // ── Process Revenue ──
    const currentRevenue = currentPayments._sum.amount ?? 0;
    const previousRevenue = previousPayments._sum.amount ?? 0;
    const revenueGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    // Group revenue by month
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenueByMonthMap = new Map<string, number>();

    for (const r of revenueByMonth) {
      if (r.paidAt) {
        const key = `${r.paidAt.getFullYear()}-${String(r.paidAt.getMonth() + 1).padStart(2, '0')}`;
        revenueByMonthMap.set(key, (revenueByMonthMap.get(key) ?? 0) + (r.amount ?? 0));
      }
    }

    const monthlyRevenue: Array<{ month: string; amount: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyRevenue.push({
        month: monthNames[d.getMonth()],
        amount: revenueByMonthMap.get(key) ?? 0,
      });
    }

    // ── Process Customers ──
    const customerStatusMap: Record<string, number> = {};
    for (const c of customersByStatus) {
      customerStatusMap[c.status] = c._count;
    }

    // ── Process Subscriptions by plan ──
    const planIds = subscriptionsByPlan.map(s => s.planId);
    let planNames: Map<string, string> = new Map();

    if (planIds.length > 0) {
      const plans = await db.plan.findMany({
        where: { id: { in: planIds } },
        select: { id: true, name: true },
      });
      for (const p of plans) {
        planNames.set(p.id, p.name);
      }
    }

    const subscriptionsByPlanData = subscriptionsByPlan
      .map(s => ({
        planName: planNames.get(s.planId) || 'Unknown',
        count: s._count,
      }))
      .sort((a, b) => b.count - a.count);

    // Subscriptions by status
    const subscriptionStatusMap: Record<string, number> = {};
    for (const s of subscriptionsByStatus) {
      subscriptionStatusMap[s.status] = s._count;
    }

    // ── Process Payments ──
    const paymentMethodMap: Record<string, number> = {};
    for (const p of paymentMethods) {
      paymentMethodMap[p.method] = p._count;
    }

    const paymentChannelMap: Record<string, number> = {};
    for (const p of paymentChannels) {
      if (p.paymentChannel) {
        paymentChannelMap[p.paymentChannel] = p._count;
      }
    }

    // Collection rate
    const totalPaidInvoices = totalInvoiceAmount._sum.total ?? 0;
    const totalInvoiceThisMonth = await db.invoice.aggregate({
      _sum: { total: true },
      where: { organizationId: orgId, createdAt: { gte: currentStart, lte: currentEnd } },
    });
    const collectionRate = totalInvoiceThisMonth._sum.total && totalInvoiceThisMonth._sum.total > 0
      ? (totalPaidInvoices / totalInvoiceThisMonth._sum.total) * 100
      : 0;

    // ── Process Devices ──
    const onlineDevices = devices.filter(d => d.status === 'online').length;
    const offlineDevices = devices.filter(d => d.status === 'offline').length;
    const devicesWithCpu = devices.filter(d => d.cpuUsage !== null);
    const avgCpu = devicesWithCpu.length > 0
      ? devicesWithCpu.reduce((sum, d) => sum + (d.cpuUsage ?? 0), 0) / devicesWithCpu.length
      : 0;
    const devicesWithMem = devices.filter(d => d.memoryUsage !== null);
    const avgMemory = devicesWithMem.length > 0
      ? devicesWithMem.reduce((sum, d) => sum + (d.memoryUsage ?? 0), 0) / devicesWithMem.length
      : 0;

    // ── Process Usage ──
    let totalBandwidthBytes = BigInt(0);
    for (const r of usageRecords) {
      totalBandwidthBytes += BigInt(r.totalBytes);
    }
    const uniqueCustomers = new Set(usageRecords.map(r => r.customerId)).size;
    const avgPerCustomer = uniqueCustomers > 0 ? Number(totalBandwidthBytes / BigInt(uniqueCustomers)) : 0;

    // Top users
    const customerUsageMap = new Map<string, number>();
    for (const r of usageRecords) {
      customerUsageMap.set(r.customerId, (customerUsageMap.get(r.customerId) ?? BigInt(0)) + BigInt(r.totalBytes));
    }

    const topUsageEntries = Array.from(customerUsageMap.entries())
      .sort((a, b) => Number(b[1] - a[1]))
      .slice(0, 10);

    const topCustomerIds = topUsageEntries.map(e => e[0]);
    let customerNames: Map<string, string> = new Map();

    if (topCustomerIds.length > 0) {
      const customers = await db.customer.findMany({
        where: { id: { in: topCustomerIds } },
        select: { id: true, firstName: true, lastName: true },
      });
      for (const c of customers) {
        customerNames.set(c.id, `${c.firstName} ${c.lastName}`);
      }
    }

    function formatBytes(bytes: number | bigint): string {
      const n = Number(bytes);
      if (n === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
      const i = Math.floor(Math.log(n) / Math.log(k));
      const value = n / Math.pow(k, i);
      return `${value.toFixed(1)} ${sizes[i]}`;
    }

    const topUsers = topUsageEntries.map(([id, bytes]) => ({
      name: customerNames.get(id) || 'Unknown',
      usage: formatBytes(Number(bytes)),
    }));

    // Calculate MRR from active subscriptions
    const activeSubscriptions = await db.subscription.findMany({
      where: { organizationId: orgId, status: 'active' },
      include: { plan: { select: { priceMonthly: true } } },
    });

    const totalMRR = activeSubscriptions.reduce((sum, s) => sum + (s.plan?.priceMonthly ?? 0), 0);

    return NextResponse.json({
      revenue: {
        current: currentRevenue,
        previous: previousRevenue,
        growth: Math.round(revenueGrowth * 10) / 10,
        mrr: totalMRR,
        byMonth: monthlyRevenue,
      },
      customers: {
        total: totalCustomers,
        active: activeCustomers,
        newThisMonth: newCustomersThisMonth,
        churned: churnedCustomers,
        growthRate: totalCustomers > 0 ? Math.round((newCustomersThisMonth / totalCustomers) * 1000) / 10 : 0,
        byStatus: customerStatusMap,
      },
      subscriptions: {
        total: totalSubscriptions,
        byPlan: subscriptionsByPlanData,
        byStatus: subscriptionStatusMap,
      },
      payments: {
        total: Object.values(paymentMethodMap).reduce((s, v) => s + v, 0),
        byMethod: paymentMethodMap,
        byChannel: paymentChannelMap,
        collectionRate: Math.round(collectionRate * 10) / 10,
      },
      devices: {
        total: devices.length,
        online: onlineDevices,
        offline: offlineDevices,
        maintenance: devices.filter(d => d.status === 'maintenance').length,
        avgCpu: Math.round(avgCpu * 10) / 10,
        avgMemory: Math.round(avgMemory * 10) / 10,
      },
      usage: {
        totalBandwidth: formatBytes(totalBandwidthBytes),
        avgPerCustomer: formatBytes(avgPerCustomer),
        topUsers,
      },
    });
  } catch (error: unknown) {
    console.error('Analytics GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to load analytics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

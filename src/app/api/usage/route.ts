import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId') ?? '';
    const customerId = searchParams.get('customerId') ?? '';
    const subscriptionId = searchParams.get('subscriptionId') ?? '';
    const startDateParam = searchParams.get('startDate') ?? '';
    const endDateParam = searchParams.get('endDate') ?? '';
    const days = parseInt(searchParams.get('days') ?? '30', 10);

    const where: Prisma.UsageRecordWhereInput = {};

    if (orgId) where.organizationId = orgId;
    if (customerId) where.customerId = customerId;
    if (subscriptionId) where.subscriptionId = subscriptionId;

    // Date range
    let startDate: Date;
    let endDate: Date;

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else {
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    }

    where.date = { gte: startDate, lte: endDate };

    // Fetch usage records
    const records = await db.usageRecord.findMany({
      where,
      orderBy: { date: 'asc' },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true },
        },
        subscription: {
          select: { id: true, username: true },
        },
      },
    });

    // Aggregate daily totals
    const dailyAggregation: Record<string, { date: string; downloadBytes: number; uploadBytes: number; totalBytes: number; recordCount: number }> = {};

    for (const record of records) {
      const dateKey = new Date(record.date).toISOString().split('T')[0];
      if (!dailyAggregation[dateKey]) {
        dailyAggregation[dateKey] = {
          date: dateKey,
          downloadBytes: 0,
          uploadBytes: 0,
          totalBytes: 0,
          recordCount: 0,
        };
      }
      dailyAggregation[dateKey].downloadBytes += record.downloadBytes;
      dailyAggregation[dateKey].uploadBytes += record.uploadBytes;
      dailyAggregation[dateKey].totalBytes += record.totalBytes;
      dailyAggregation[dateKey].recordCount += 1;
    }

    const dailyData = Object.values(dailyAggregation).sort((a, b) => a.date.localeCompare(b.date));

    // Current month summary
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const currentMonthWhere: Prisma.UsageRecordWhereInput = { ...where };
    currentMonthWhere.date = { gte: monthStart };

    if (orgId) currentMonthWhere.organizationId = orgId;
    if (customerId) currentMonthWhere.customerId = customerId;
    if (subscriptionId) currentMonthWhere.subscriptionId = subscriptionId;

    const currentMonthAgg = await db.usageRecord.aggregate({
      where: currentMonthWhere,
      _sum: {
        downloadBytes: true,
        uploadBytes: true,
        totalBytes: true,
      },
      _count: true,
    });

    // Per-customer aggregation for the period
    const customerAggregation = await db.usageRecord.groupBy({
      by: ['customerId'],
      where,
      _sum: {
        downloadBytes: true,
        uploadBytes: true,
        totalBytes: true,
      },
      _count: true,
      orderBy: { _sum: { totalBytes: 'desc' } },
      take: 20,
    });

    const customerUsage = await Promise.all(
      customerAggregation.map(async (agg) => {
        const customer = await db.customer.findUnique({
          where: { id: agg.customerId },
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        });
        return {
          customer,
          downloadBytes: agg._sum.downloadBytes ?? 0,
          uploadBytes: agg._sum.uploadBytes ?? 0,
          totalBytes: agg._sum.totalBytes ?? 0,
          recordCount: agg._count,
        };
      })
    );

    return NextResponse.json({
      period: {
        startDate,
        endDate,
      },
      records,
      dailyAggregation: dailyData,
      currentMonthSummary: {
        totalDownloadBytes: currentMonthAgg._sum.downloadBytes ?? 0,
        totalUploadBytes: currentMonthAgg._sum.uploadBytes ?? 0,
        totalBytes: currentMonthAgg._sum.totalBytes ?? 0,
        recordCount: currentMonthAgg._count,
      },
      topConsumers: customerUsage,
      summary: {
        totalRecords: records.length,
        totalDownloadBytes: dailyData.reduce((sum, d) => sum + d.downloadBytes, 0),
        totalUploadBytes: dailyData.reduce((sum, d) => sum + d.uploadBytes, 0),
        totalBytes: dailyData.reduce((sum, d) => sum + d.totalBytes, 0),
      },
    });
  } catch (error: unknown) {
    console.error('Usage GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch usage data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

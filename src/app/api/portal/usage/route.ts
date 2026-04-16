import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/portal/usage?customerId=xxx&orgId=xxx&period=month
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const orgId = searchParams.get('orgId');
    const period = searchParams.get('period') ?? 'month';

    if (!customerId || !orgId) {
      return NextResponse.json(
        { error: 'customerId and orgId are required' },
        { status: 400 }
      );
    }

    // Calculate date range based on billing period
    const now = new Date();
    let startDate: Date;

    if (period === 'month') {
      // Start of current month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'week') {
      // Start of current week (Monday)
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
    } else {
      // Default to last 30 days
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    }

    const usageRecords = await db.usageRecord.findMany({
      where: {
        customerId,
        organizationId: orgId,
        date: {
          gte: startDate,
          lte: now,
        },
      },
      orderBy: { date: 'asc' },
    });

    // Get data cap from active subscription
    const activeSub = await db.subscription.findFirst({
      where: {
        customerId,
        organizationId: orgId,
        status: 'active',
      },
      include: {
        plan: {
          select: {
            name: true,
            dataCap: true,
            speedDown: true,
            speedUp: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Aggregate daily usage
    const dailyUsage: Array<{
      date: string;
      downloadBytes: number;
      uploadBytes: number;
      totalBytes: number;
    }> = [];

    // Create a map of date strings to aggregated data
    const dateMap = new Map<string, { downloadBytes: number; uploadBytes: number; totalBytes: number }>();

    for (const record of usageRecords) {
      const dateStr = record.date.toISOString().split('T')[0];
      const existing = dateMap.get(dateStr) ?? { downloadBytes: 0, uploadBytes: 0, totalBytes: 0 };
      existing.downloadBytes += record.downloadBytes;
      existing.uploadBytes += record.uploadBytes;
      existing.totalBytes += record.totalBytes;
      dateMap.set(dateStr, existing);
    }

    // Fill in missing dates
    const current = new Date(startDate);
    while (current <= now) {
      const dateStr = current.toISOString().split('T')[0];
      const data = dateMap.get(dateStr) ?? { downloadBytes: 0, uploadBytes: 0, totalBytes: 0 };
      dailyUsage.push({ date: dateStr, ...data });
      current.setDate(current.getDate() + 1);
    }

    // Summary totals
    const totalDownload = dailyUsage.reduce((sum, d) => sum + d.downloadBytes, 0);
    const totalUpload = dailyUsage.reduce((sum, d) => sum + d.uploadBytes, 0);
    const totalData = dailyUsage.reduce((sum, d) => sum + d.totalBytes, 0);

    // Data cap info
    const dataCapMB = activeSub?.plan.dataCap ?? null;
    const dataCapBytes = dataCapMB ? dataCapMB * 1024 * 1024 : null;
    const usagePercentage = dataCapBytes ? Math.min(100, (totalData / dataCapBytes) * 100) : null;

    return NextResponse.json({
      period,
      startDate,
      endDate: now,
      dailyUsage,
      summary: {
        totalDownload,
        totalUpload,
        totalData,
        dataCapMB,
        dataCapBytes,
        usagePercentage,
        daysUsed: dailyUsage.filter(d => d.totalBytes > 0).length,
      },
      subscription: activeSub
        ? {
            planName: activeSub.plan.name,
            speedDown: activeSub.plan.speedDown,
            speedUp: activeSub.plan.speedUp,
            dataCap: activeSub.plan.dataCap,
          }
        : null,
    });
  } catch (error: unknown) {
    console.error('Portal usage error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch usage';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

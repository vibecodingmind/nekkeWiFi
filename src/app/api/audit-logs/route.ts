import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { requirePermission, getOrgFilter, AuthError } from '@/lib/auth';

// GET /api/audit-logs — View audit logs (admin only)
export async function GET(request: NextRequest) {
  try {
    const authUser = requirePermission(request, 'settings.view');
    const { searchParams } = new URL(request.url);
    const orgIdParam = searchParams.get('orgId') ?? '';
    const action = searchParams.get('action') ?? '';
    const resource = searchParams.get('resource') ?? '';
    const userId = searchParams.get('userId') ?? '';
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const limit = parseInt(searchParams.get('limit') ?? '50', 10);

    const skip = (page - 1) * limit;

    const orgId = getOrgFilter(authUser, orgIdParam || undefined);

    const where: Prisma.AuditLogWhereInput = { organizationId: orgId };

    if (action) where.action = action;
    if (resource) where.resource = resource;
    if (userId) where.userId = userId;

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          resource: true,
          resourceId: true,
          details: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
          userEmail: true,
          userRole: true,
          userId: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      db.auditLog.count({ where }),
    ]);

    // Format logs for API response
    const formattedLogs = logs.map((log) => ({
      id: log.id,
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      details: log.details ? JSON.parse(log.details) : null,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt.toISOString(),
      createdAtFormatted: new Date(log.createdAt).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      user: log.user
        ? {
            id: log.user.id,
            name: log.user.name,
            email: log.user.email,
          }
        : {
            email: log.userEmail,
            role: log.userRole,
          },
    }));

    return NextResponse.json({
      data: formattedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Audit logs GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch audit logs';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

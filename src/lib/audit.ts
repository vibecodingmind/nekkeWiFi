import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

interface AuditParams {
  organizationId: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  request?: NextRequest;
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        userEmail: params.userEmail,
        userRole: params.userRole,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        details: params.details ? JSON.stringify(params.details) : null,
        ipAddress: params.request?.headers.get('x-forwarded-for') || params.request?.headers.get('x-real-ip') || null,
        userAgent: params.request?.headers.get('user-agent') || null,
      },
    });
  } catch (error) {
    console.error('Audit log failed:', error);
    // Never throw — audit logging should not break the main flow
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/notifications/bulk
// Body: { action: 'mark_all_read' | 'send_bulk', userId?, organizationId, userIds?, type, title, message }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'mark_all_read') {
      // Mark all unread notifications for a user as read
      const { userId, orgId } = body;

      if (!userId || !orgId) {
        return NextResponse.json(
          { error: 'userId and orgId are required' },
          { status: 400 }
        );
      }

      const result = await db.notification.updateMany({
        where: {
          organizationId: orgId,
          OR: [{ userId }, { userId: null }],
          isRead: false,
        },
        data: { isRead: true },
      });

      return NextResponse.json({
        success: true,
        updated: result.count,
      });
    }

    if (action === 'send_bulk') {
      // Send notification to multiple users or all users in org
      const { organizationId, userIds, type, title, message, data } = body;

      if (!organizationId || !type || !title || !message) {
        return NextResponse.json(
          { error: 'organizationId, type, title, and message are required' },
          { status: 400 }
        );
      }

      let targetUserIds: string[] = userIds || [];

      // If no userIds, send to all users in the org
      if (targetUserIds.length === 0) {
        const users = await db.orgUser.findMany({
          where: { organizationId, isActive: true },
          select: { id: true },
        });
        targetUserIds = users.map((u) => u.id);
      }

      // Create notifications for each user
      const notifications = await db.notification.createMany({
        data: targetUserIds.map((uid: string) => ({
          organizationId,
          userId: uid,
          type,
          title,
          message,
          data: data ? JSON.stringify(data) : null,
        })),
      });

      return NextResponse.json({
        success: true,
        created: notifications.count,
        recipients: targetUserIds.length,
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use mark_all_read or send_bulk' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Notifications bulk POST error:', error);
    const message = error instanceof Error ? error.message : 'Failed to perform bulk action';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

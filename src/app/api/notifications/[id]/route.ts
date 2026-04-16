import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PATCH /api/notifications/[id] — Mark as read/unread
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { isRead } = body;

    if (isRead === undefined) {
      return NextResponse.json({ error: 'isRead is required' }, { status: 400 });
    }

    const notification = await db.notification.update({
      where: { id },
      data: { isRead },
    });

    return NextResponse.json(notification);
  } catch (error: unknown) {
    console.error('Notification PATCH error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update notification';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/notifications/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.notification.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Notification DELETE error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete notification';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

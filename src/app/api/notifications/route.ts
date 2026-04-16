import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/notifications?userId=xxx&orgId=xxx&unreadOnly=true&limit=50&page=1
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const orgId = searchParams.get('orgId');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
    }

    const where: Record<string, unknown> = {
      organizationId: orgId,
      ...(userId ? { OR: [{ userId }, { userId: null }] } : {}),
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, total] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      db.notification.count({ where }),
    ]);

    return NextResponse.json({
      data: notifications,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error('Notifications GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch notifications';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/notifications
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, userId, customerId, type, title, message, data } = body;

    if (!organizationId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'organizationId, type, title, and message are required' },
        { status: 400 }
      );
    }

    const notification = await db.notification.create({
      data: {
        organizationId,
        userId: userId || null,
        customerId: customerId || null,
        type,
        title,
        message,
        data: data ? JSON.stringify(data) : null,
      },
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error: unknown) {
    console.error('Notifications POST error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create notification';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

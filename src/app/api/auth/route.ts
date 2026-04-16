import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/auth/login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await db.orgUser.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        organization: {
          select: { id: true, name: true, slug: true, isActive: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated. Contact your administrator.' },
        { status: 403 }
      );
    }

    // Demo password: accept "demo123" for any user, or match stored password
    const isDemoPassword = password === 'demo123';
    const isStoredPassword = user.password && password === user.password;

    if (!isDemoPassword && !isStoredPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update lastLoginAt
    await db.orgUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      organizationName: user.organization?.name ?? 'nekkeWiFi Platform',
      organizationSlug: user.organization?.slug ?? 'nekkewifi',
      avatar: user.avatar,
      isActive: user.isActive,
    };

    return NextResponse.json({
      user: userData,
      token: 'demo-session-token',
    });
  } catch (error: unknown) {
    console.error('Auth login error:', error);
    const message = error instanceof Error ? error.message : 'Login failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/auth/me?userId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId query parameter is required' },
        { status: 400 }
      );
    }

    const user = await db.orgUser.findUnique({
      where: { id: userId },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        organizationId: true,
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: {
        ...user,
        organizationName: user.organization?.name ?? 'nekkeWiFi Platform',
        organizationSlug: user.organization?.slug ?? 'nekkewifi',
      },
    });
  } catch (error: unknown) {
    console.error('Auth me error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

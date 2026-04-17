import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { comparePassword, generateToken, getAuthUser, AuthError } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// POST /api/auth — Login
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

    // Check password: try bcrypt compare first, then fall back to demo password "demo123"
    let isPasswordValid = false;

    // 1. If stored password is a bcrypt hash, compare with bcrypt
    if (user.password && user.password.startsWith('$2')) {
      isPasswordValid = await comparePassword(password, user.password);
    }

    // 2. Demo password fallback: accept "demo123" for any user
    const isDemoPassword = password === 'demo123';

    // 3. Legacy plain text comparison (for non-hashed passwords from old seed data)
    const isPlainTextMatch = user.password && password === user.password;

    if (!isDemoPassword && !isPasswordValid && !isPlainTextMatch) {
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

    // Generate real JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    });

    // Log successful login
    await logAudit({
      organizationId: user.organizationId,
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'login',
      resource: 'user',
      resourceId: user.id,
      details: { name: user.name },
      request,
    });

    return NextResponse.json({
      user: userData,
      token,
    });
  } catch (error: unknown) {
    console.error('Auth login error:', error);
    const message = error instanceof Error ? error.message : 'Login failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/auth — Validate existing token
export async function GET(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);

    if (!authUser) {
      return NextResponse.json(
        { error: 'Invalid or missing authentication token' },
        { status: 401 }
      );
    }

    const user = await db.orgUser.findUnique({
      where: { id: authUser.userId },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'User not found or account is deactivated' },
        { status: 401 }
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
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Auth validation error:', error);
    const message = error instanceof Error ? error.message : 'Failed to validate token';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

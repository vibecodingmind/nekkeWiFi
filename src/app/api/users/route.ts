import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission, getOrgFilter, AuthError, hashPassword } from '@/lib/auth';

// GET /api/users?orgId=xxx
export async function GET(request: NextRequest) {
  try {
    const authUser = requirePermission(request, 'users.view');
    const { searchParams } = new URL(request.url);
    const orgIdParam = searchParams.get('orgId');

    const orgId = getOrgFilter(authUser, orgIdParam);

    const users = await db.orgUser.findMany({
      where: { organizationId: orgId },
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
        _count: {
          select: {},
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Users GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch users';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/users
export async function POST(request: NextRequest) {
  try {
    const authUser = requirePermission(request, 'users.manage');
    const body = await request.json();
    const { organizationId, name, email, password, role } = body;

    const orgId = getOrgFilter(authUser, organizationId);

    if (!orgId || !name || !email || !role) {
      return NextResponse.json(
        { error: 'name, email, and role are required' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    const existing = await db.orgUser.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    // Only super_admin can create super_admin role
    const validRoles = ['admin', 'agent', 'viewer'];
    if (!validRoles.includes(role) && !(role === 'super_admin' && authUser.role === 'super_admin')) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    const org = await db.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Hash the password before storing
    const hashedPassword = await hashPassword(password);

    const user = await db.orgUser.create({
      data: {
        organizationId: orgId,
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role,
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
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Users POST error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

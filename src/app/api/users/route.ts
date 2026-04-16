import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/users?orgId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json(
        { error: 'orgId query parameter is required' },
        { status: 400 }
      );
    }

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
          select: {
            // OrgUser doesn't have direct child relations in schema,
            // but we include it for future extensibility
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch (error: unknown) {
    console.error('Users GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch users';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/users
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, name, email, password, role, creatorId } = body;

    if (!organizationId || !name || !email || !role) {
      return NextResponse.json(
        { error: 'organizationId, name, email, and role are required' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // Check creator permissions (admin or super_admin)
    if (creatorId) {
      const creator = await db.orgUser.findUnique({
        where: { id: creatorId },
        select: { role: true, organizationId: true },
      });

      if (!creator) {
        return NextResponse.json(
          { error: 'Creator not found' },
          { status: 404 }
        );
      }

      if (creator.role !== 'admin' && creator.role !== 'super_admin') {
        return NextResponse.json(
          { error: 'Only admins can create users' },
          { status: 403 }
        );
      }
    }

    // Validate email uniqueness
    const existing = await db.orgUser.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    // Validate role
    const validRoles = ['admin', 'agent', 'viewer'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate organization exists
    const org = await db.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const user = await db.orgUser.create({
      data: {
        organizationId,
        name,
        email: email.toLowerCase(),
        password,
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
    console.error('Users POST error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

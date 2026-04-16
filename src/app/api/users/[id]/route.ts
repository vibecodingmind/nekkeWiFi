import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission, AuthError, hashPassword } from '@/lib/auth';

// GET /api/users/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requirePermission(request, 'users.view');
    const { id } = await params;

    const user = await db.orgUser.findUnique({
      where: { id },
      include: {
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

    const { organization, ...rest } = user;

    return NextResponse.json({
      user: {
        ...rest,
        organizationName: organization.name,
        organizationSlug: organization.slug,
      },
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('User GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/users/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = requirePermission(request, 'users.manage');
    const { id } = await params;
    const body = await request.json();
    const { name, email, role, isActive, password } = body;

    const existingUser = await db.orgUser.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Only super_admin can assign super_admin role
    if (role && role === 'super_admin' && authUser.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only super admins can assign the super_admin role' },
        { status: 403 }
      );
    }

    if (role && role !== existingUser.role) {
      const validRoles = ['admin', 'agent', 'viewer'];
      if (!validRoles.includes(role) && !(role === 'super_admin' && authUser.role === 'super_admin')) {
        return NextResponse.json(
          { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
          { status: 400 }
        );
      }
    }

    if (email && email.toLowerCase() !== existingUser.email) {
      const emailExists = await db.orgUser.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (emailExists) {
        return NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 409 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email.toLowerCase();
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    // Hash new password if provided
    if (password !== undefined && password !== '') {
      updateData.password = await hashPassword(password);
    }

    const updatedUser = await db.orgUser.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ user: updatedUser });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('User PUT error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/users/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = requirePermission(request, 'users.delete');
    const { id } = await params;

    const user = await db.orgUser.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Cannot delete self
    if (authUser.userId === id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Non-super_admin cannot delete super_admin
    if (user.role === 'super_admin' && authUser.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only super admins can delete super admin accounts' },
        { status: 403 }
      );
    }

    if (user.role === 'admin') {
      const adminCount = await db.orgUser.count({
        where: {
          organizationId: user.organizationId,
          role: 'admin',
        },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last admin of an organization' },
          { status: 400 }
        );
      }
    }

    await db.orgUser.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `User "${user.name}" has been deleted`,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('User DELETE error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/users/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await db.orgUser.findUnique({
      where: { id },
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

    const { organization, ...rest } = user;

    return NextResponse.json({
      user: {
        ...rest,
        organizationName: organization.name,
        organizationSlug: organization.slug,
      },
    });
  } catch (error: unknown) {
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
    const { id } = await params;
    const body = await request.json();
    const { name, email, role, isActive, password, updaterId } = body;

    // Check if user exists
    const existingUser = await db.orgUser.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // If role is being changed, check updater permissions
    if (role && role !== existingUser.role) {
      if (updaterId) {
        const updater = await db.orgUser.findUnique({
          where: { id: updaterId },
          select: { role: true },
        });

        if (!updater) {
          return NextResponse.json(
            { error: 'Updater not found' },
            { status: 404 }
          );
        }

        if (updater.role !== 'admin' && updater.role !== 'super_admin') {
          return NextResponse.json(
            { error: 'Only admins can change user roles' },
            { status: 403 }
          );
        }
      }

      // Validate role
      const validRoles = ['admin', 'agent', 'viewer'];
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // If email is being changed, check uniqueness
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

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email.toLowerCase();
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password !== undefined && password !== '') updateData.password = password;

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
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const deleterId = searchParams.get('deleterId');

    // Check if user exists
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
    if (deleterId && deleterId === id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Check deleter permissions
    if (deleterId) {
      const deleter = await db.orgUser.findUnique({
        where: { id: deleterId },
        select: { role: true },
      });

      if (!deleter) {
        return NextResponse.json(
          { error: 'Deleter not found' },
          { status: 404 }
        );
      }

      if (deleter.role !== 'admin' && deleter.role !== 'super_admin') {
        return NextResponse.json(
          { error: 'Only admins can delete users' },
          { status: 403 }
        );
      }
    }

    // Check if this is the last admin in the organization
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
    console.error('User DELETE error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete user';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      orgName,
      slug,
      orgEmail,
      orgPhone,
      adminName,
      adminEmail,
      adminPassword,
      phone,
    } = body;

    // Validate required fields
    if (!orgName || !slug || !orgEmail || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      return NextResponse.json(
        { error: 'Invalid admin email address' },
        { status: 400 }
      );
    }

    // Validate password length
    if (adminPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must be lowercase letters, numbers, and hyphens only' },
        { status: 400 }
      );
    }

    // Check if organization slug already exists
    const existingOrg = await db.organization.findUnique({ where: { slug } });
    if (existingOrg) {
      return NextResponse.json(
        { error: 'Organization slug already exists' },
        { status: 409 }
      );
    }

    // Check if admin email already exists
    const existingUser = await db.orgUser.findUnique({ where: { email: adminEmail } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(adminPassword);

    // Create organization and admin user in a transaction
    const organization = await db.organization.create({
      data: {
        name: orgName,
        slug,
        email: orgEmail || adminEmail,
        phone: orgPhone || phone || null,
        country: 'Tanzania',
        currency: 'TZS',
        taxRate: 18.0,
        isActive: true,
      },
    });

    const adminUser = await db.orgUser.create({
      data: {
        organizationId: organization.id,
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        },
        user: {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Signup error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create account';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

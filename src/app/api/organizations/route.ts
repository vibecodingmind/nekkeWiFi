import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const organizations = await db.organization.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            customers: true,
            devices: true,
            subscriptions: true,
            plans: true,
            invoices: true,
          },
        },
      },
    });

    return NextResponse.json(organizations);
  } catch (error: unknown) {
    console.error('Organizations GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch organizations';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug, logo, email, phone, address, country, currency, taxRate, isActive } = body;

    if (!name || !slug || !email) {
      return NextResponse.json(
        { error: 'name, slug, and email are required' },
        { status: 400 }
      );
    }

    // Check for duplicate slug
    const existing = await db.organization.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: 'Organization slug already exists' }, { status: 409 });
    }

    const organization = await db.organization.create({
      data: {
        name,
        slug,
        logo,
        email,
        phone,
        address,
        country: country ?? 'Tanzania',
        currency: currency ?? 'TZS',
        taxRate: taxRate ?? 18.0,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(organization, { status: 201 });
  } catch (error: unknown) {
    console.error('Organizations POST error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create organization';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

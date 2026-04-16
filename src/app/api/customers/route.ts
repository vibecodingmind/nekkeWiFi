import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') ?? '';
    const orgId = searchParams.get('orgId') ?? '';
    const status = searchParams.get('status') ?? '';
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const limit = parseInt(searchParams.get('limit') ?? '20', 10);

    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {};

    if (orgId) where.organizationId = orgId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          organization: { select: { id: true, name: true } },
          _count: { select: { subscriptions: true, invoices: true, payments: true } },
        },
      }),
      db.customer.count({ where }),
    ]);

    return NextResponse.json({
      data: customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error('Customers GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch customers';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, firstName, lastName, email, phone, address, city, region, status, balance, notes } = body;

    if (!organizationId || !firstName || !lastName || !phone) {
      return NextResponse.json(
        { error: 'organizationId, firstName, lastName, and phone are required' },
        { status: 400 }
      );
    }

    // Verify organization exists
    const org = await db.organization.findUnique({ where: { id: organizationId } });
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const customer = await db.customer.create({
      data: {
        organizationId,
        firstName,
        lastName,
        email,
        phone,
        address,
        city,
        region,
        status: status ?? 'active',
        balance: balance ?? 0,
        notes,
      },
      include: {
        organization: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error: unknown) {
    console.error('Customers POST error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create customer';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

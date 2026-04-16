import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission, getOrgFilter, AuthError } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requirePermission(request, 'customers.view');
    const { id } = await params;

    const customer = await db.customer.findUnique({
      where: { id },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        subscriptions: {
          include: {
            plan: { select: { id: true, name: true, speedDown: true, speedUp: true, priceMonthly: true } },
            device: { select: { id: true, name: true, type: true, ipAddress: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            payments: {
              select: { id: true, amount: true, method: true, paidAt: true, status: true },
            },
          },
        },
        _count: {
          select: { payments: true, usageRecords: true },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json(customer);
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Customer GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch customer';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requirePermission(request, 'customers.manage');
    const { id } = await params;
    const body = await request.json();

    const existing = await db.customer.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const { firstName, lastName, email, phone, address, city, region, status, balance, notes } = body;

    const customer = await db.customer.update({
      where: { id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(region !== undefined && { region }),
        ...(status !== undefined && { status }),
        ...(balance !== undefined && { balance }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        organization: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(customer);
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Customer PUT error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update customer';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requirePermission(request, 'customers.delete');
    const { id } = await params;

    const existing = await db.customer.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    await db.customer.delete({ where: { id } });

    return NextResponse.json({ message: 'Customer deleted successfully' });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Customer DELETE error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete customer';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

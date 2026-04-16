import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId') ?? '';
    const type = searchParams.get('type') ?? '';
    const status = searchParams.get('status') ?? '';

    const where: Prisma.DeviceWhereInput = {};

    if (orgId) where.organizationId = orgId;
    if (type) where.type = type;
    if (status) where.status = status;

    const devices = await db.device.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        organization: { select: { id: true, name: true } },
        _count: {
          select: {
            interfaces: true,
            subscriptions: true,
            provisioningRules: true,
          },
        },
      },
    });

    return NextResponse.json(devices);
  } catch (error: unknown) {
    console.error('Devices GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch devices';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organizationId, name, type, model, ipAddress, port,
      apiUser, apiPassword, firmware, serialNumber, location, status, totalBandwidth,
    } = body;

    if (!organizationId || !name || !type || !ipAddress || !apiUser || !apiPassword) {
      return NextResponse.json(
        { error: 'organizationId, name, type, ipAddress, apiUser, and apiPassword are required' },
        { status: 400 }
      );
    }

    // Verify organization exists
    const org = await db.organization.findUnique({ where: { id: organizationId } });
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const device = await db.device.create({
      data: {
        organizationId,
        name,
        type,
        model,
        ipAddress,
        port: port ?? 8728,
        apiUser,
        apiPassword,
        firmware,
        serialNumber,
        location,
        status: status ?? 'online',
        totalBandwidth,
      },
      include: {
        organization: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(device, { status: 201 });
  } catch (error: unknown) {
    console.error('Devices POST error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create device';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

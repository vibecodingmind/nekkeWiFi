import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const device = await db.device.findUnique({
      where: { id },
      include: {
        organization: { select: { id: true, name: true } },
        interfaces: {
          orderBy: { name: 'asc' },
        },
        _count: {
          select: {
            subscriptions: true,
            provisioningRules: true,
          },
        },
      },
    });

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    return NextResponse.json(device);
  } catch (error: unknown) {
    console.error('Device GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch device';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.device.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    const {
      name, type, model, ipAddress, port, apiUser, apiPassword,
      firmware, serialNumber, location, status, totalBandwidth,
    } = body;

    const device = await db.device.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(model !== undefined && { model }),
        ...(ipAddress !== undefined && { ipAddress }),
        ...(port !== undefined && { port }),
        ...(apiUser !== undefined && { apiUser }),
        ...(apiPassword !== undefined && { apiPassword }),
        ...(firmware !== undefined && { firmware }),
        ...(serialNumber !== undefined && { serialNumber }),
        ...(location !== undefined && { location }),
        ...(status !== undefined && { status }),
        ...(totalBandwidth !== undefined && { totalBandwidth }),
      },
      include: {
        organization: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(device);
  } catch (error: unknown) {
    console.error('Device PUT error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update device';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.device.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    await db.device.delete({ where: { id } });

    return NextResponse.json({ message: 'Device deleted successfully' });
  } catch (error: unknown) {
    console.error('Device DELETE error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete device';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

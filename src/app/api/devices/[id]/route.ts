import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission, AuthError } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requirePermission(request, 'devices.view');
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
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
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
    requirePermission(request, 'devices.manage');
    const { id } = await params;
    const body = await request.json();

    const existing = await db.device.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    const {
      name, type, category, model, ipAddress, port,
      connectionProtocol, apiUser, apiPassword,
      snmpVersion, snmpCommunity, sshPort, sshKey, acsUrl,
      firmware, serialNumber, location, status, totalBandwidth,
      cpuUsage, memoryUsage, uptime, temperature,
      capabilities, configProfile,
    } = body;

    const device = await db.device.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(category !== undefined && { category }),
        ...(model !== undefined && { model }),
        ...(ipAddress !== undefined && { ipAddress }),
        ...(port !== undefined && { port }),
        ...(connectionProtocol !== undefined && { connectionProtocol }),
        ...(apiUser !== undefined && { apiUser }),
        ...(apiPassword !== undefined && { apiPassword }),
        ...(snmpVersion !== undefined && { snmpVersion }),
        ...(snmpCommunity !== undefined && { snmpCommunity }),
        ...(sshPort !== undefined && { sshPort }),
        ...(sshKey !== undefined && { sshKey }),
        ...(acsUrl !== undefined && { acsUrl }),
        ...(firmware !== undefined && { firmware }),
        ...(serialNumber !== undefined && { serialNumber }),
        ...(location !== undefined && { location }),
        ...(status !== undefined && { status }),
        ...(totalBandwidth !== undefined && { totalBandwidth }),
        ...(cpuUsage !== undefined && { cpuUsage: Number(cpuUsage) }),
        ...(memoryUsage !== undefined && { memoryUsage: Number(memoryUsage) }),
        ...(uptime !== undefined && { uptime: Number(uptime) }),
        ...(temperature !== undefined && { temperature: Number(temperature) }),
        ...(capabilities !== undefined && { capabilities }),
        ...(configProfile !== undefined && { configProfile }),
      },
      include: {
        organization: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(device);
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
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
    requirePermission(request, 'devices.delete');
    const { id } = await params;

    const existing = await db.device.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    await db.device.delete({ where: { id } });

    return NextResponse.json({ message: 'Device deleted successfully' });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Device DELETE error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete device';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

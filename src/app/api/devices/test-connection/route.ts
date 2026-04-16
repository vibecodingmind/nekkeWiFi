import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { testDeviceConnection } from '@/lib/provisioning';

// POST /api/devices/test-connection
// Body: { deviceId } or { ipAddress, port, connectionProtocol, apiUser, apiPassword, snmpVersion?, snmpCommunity? }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      deviceId,
      ipAddress,
      port,
      connectionProtocol,
      apiUser,
      apiPassword,
      snmpVersion,
      snmpCommunity,
    } = body;

    let deviceInfo;

    if (deviceId) {
      // Test connection using a saved device from DB
      const device = await db.device.findUnique({
        where: { id: deviceId },
        select: {
          id: true,
          name: true,
          type: true,
          category: true,
          ipAddress: true,
          port: true,
          connectionProtocol: true,
          apiUser: true,
          apiPassword: true,
          snmpVersion: true,
          snmpCommunity: true,
          sshPort: true,
          status: true,
        },
      });

      if (!device) {
        return NextResponse.json({ error: 'Device not found' }, { status: 404 });
      }

      deviceInfo = device;
    } else if (ipAddress && connectionProtocol) {
      // Test connection using provided parameters
      deviceInfo = {
        id: 'manual',
        name: ipAddress,
        type: 'generic',
        category: 'router',
        ipAddress,
        port: port ?? 8728,
        connectionProtocol,
        apiUser: apiUser || '',
        apiPassword: apiPassword || '',
        snmpVersion: snmpVersion || null,
        snmpCommunity: snmpCommunity || null,
        sshPort: null,
        status: 'unknown',
      };
    } else {
      return NextResponse.json(
        { error: 'Either deviceId or (ipAddress + connectionProtocol) is required' },
        { status: 400 }
      );
    }

    // Use the real provisioning service to test connectivity
    const result = await testDeviceConnection(deviceInfo);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Device test-connection error:', error);
    const message = error instanceof Error ? error.message : 'Failed to test device connection';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

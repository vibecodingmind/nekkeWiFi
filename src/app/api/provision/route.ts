import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { provisionMikroTikCustomer, testDeviceConnection } from '@/lib/provisioning';

// POST /api/provision
// Body: { deviceId, subscriptionId, action: 'create' | 'update' | 'suspend' | 'delete' }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, subscriptionId, action } = body;

    if (!deviceId || !subscriptionId || !action) {
      return NextResponse.json(
        { error: 'deviceId, subscriptionId, and action are required' },
        { status: 400 }
      );
    }

    const validActions = ['create', 'update', 'suspend', 'delete'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    // Load device from DB
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

    // Load subscription with plan and customer
    const subscription = await db.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        plan: {
          select: { name: true, speedDown: true, speedUp: true },
        },
        customer: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Route to appropriate provisioning function based on device type
    const deviceType = device.type.toLowerCase();

    if (deviceType === 'mikrotik') {
      const result = await provisionMikroTikCustomer(device, {
        id: subscription.id,
        username: subscription.username,
        password: subscription.password,
        plan: subscription.plan,
        customer: subscription.customer,
      }, action);

      return NextResponse.json(result);
    }

    // For other device types, report that SSH provisioning would be needed
    return NextResponse.json({
      success: false,
      message: `Device type "${device.type}" requires SSH-based provisioning. Install an SSH client library (e.g., ssh2) for full ${device.type} support. Device at ${device.ipAddress}:${device.port} using ${device.connectionProtocol} protocol.`,
    });
  } catch (error: unknown) {
    console.error('Provisioning error:', error);
    const message = error instanceof Error ? error.message : 'Failed to provision customer';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

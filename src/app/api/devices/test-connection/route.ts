import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Simulate connection test for a network device
// POST /api/devices/test-connection
// Body: { deviceId } or { ipAddress, port, connectionProtocol, apiUser, apiPassword, snmpVersion?, snmpCommunity? }

const FIRMWARE_VERSIONS = [
  'RouterOS 7.14.3',
  'RouterOS 7.12.1',
  'RouterOS 6.49.10',
  'CE4800_V200R019C10SPC800',
  'ZXR10 ZTE V4.8.23',
  'TL-SG3428X V3.0.3',
  'AirOS 8.7.3',
  'cnMatrix 6.6.6',
];

const MODELS = [
  'CCR2004-1G-12S+2XS',
  'CCR2116-12G-4S+',
  'CRS328-24P-4S+RM',
  'hAP ac³',
  'RB4011iGS+RM',
  'CE4800-48T4S-EI',
  'ZXA10 C600',
  'TL-SG3428X-M2',
  'airFiber 5X HD',
  'ePMP Force 300 CSM',
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function simulateConnectionTest(
  protocol: string,
  ipAddress: string,
  _port: number,
  deviceStatus?: string
): {
  success: boolean;
  latency: number;
  message: string;
  deviceInfo?: {
    model: string;
    firmware: string;
    uptime: number;
    cpu: number;
    memory: number;
  };
} {
  // Base latency
  const baseLatency = randomInt(5, 50);

  // If device exists and is offline, higher chance of failure
  if (deviceStatus === 'offline') {
    const offlineFailChance = Math.random();
    if (offlineFailChance < 0.8) {
      return {
        success: false,
        latency: randomInt(1000, 5000),
        message: `Connection timeout: ${ipAddress}:${_port} did not respond within 5s. Device appears to be offline.`,
      };
    }
  }

  if (deviceStatus === 'maintenance') {
    return {
      success: false,
      latency: baseLatency,
      message: `Connection refused: ${ipAddress}:${_port} — device is in maintenance mode.`,
    };
  }

  switch (protocol) {
    case 'api': {
      // MikroTik RouterOS API simulation
      const success = Math.random() < 0.92;
      if (success) {
        return {
          success: true,
          latency: baseLatency,
          message: `API connection successful to ${ipAddress}:${_port}. RouterOS API v6.43+`,
          deviceInfo: {
            model: MODELS[randomInt(0, MODELS.length - 1)],
            firmware: FIRMWARE_VERSIONS[randomInt(0, 1)],
            uptime: randomInt(3600, 86400 * 365),
            cpu: randomInt(2, 85),
            memory: randomInt(15, 90),
          },
        };
      }
      return {
        success: false,
        latency: randomInt(2000, 10000),
        message: `API authentication failed for ${ipAddress}:${_port}. Invalid credentials or API not enabled.`,
      };
    }

    case 'snmp': {
      // SNMP query simulation
      const success = Math.random() < 0.88;
      if (success) {
        return {
          success: true,
          latency: baseLatency + randomInt(1, 10),
          message: `SNMP query successful. OID 1.3.6.1.2.1.1 (System) responded.`,
          deviceInfo: {
            model: MODELS[randomInt(2, MODELS.length - 1)],
            firmware: FIRMWARE_VERSIONS[randomInt(2, FIRMWARE_VERSIONS.length - 1)],
            uptime: randomInt(3600, 86400 * 180),
            cpu: randomInt(1, 60),
            memory: randomInt(10, 75),
          },
        };
      }
      return {
        success: false,
        latency: randomInt(500, 3000),
        message: `SNMP timeout: No response from ${ipAddress}. Check SNMP community string and firewall rules.`,
      };
    }

    case 'rest': {
      // REST API simulation
      const success = Math.random() < 0.90;
      if (success) {
        return {
          success: true,
          latency: baseLatency + randomInt(5, 30),
          message: `REST API connection successful to ${ipAddress}:${_port}/api/v1. HTTP 200 OK.`,
          deviceInfo: {
            model: MODELS[randomInt(3, MODELS.length - 1)],
            firmware: FIRMWARE_VERSIONS[randomInt(4, FIRMWARE_VERSIONS.length - 1)],
            uptime: randomInt(86400, 86400 * 90),
            cpu: randomInt(5, 70),
            memory: randomInt(20, 80),
          },
        };
      }
      return {
        success: false,
        latency: randomInt(1000, 5000),
        message: `REST API returned HTTP 401 Unauthorized from ${ipAddress}:${_port}. Check API key or token.`,
      };
    }

    case 'ssh': {
      // SSH simulation
      const success = Math.random() < 0.85;
      if (success) {
        return {
          success: true,
          latency: baseLatency + randomInt(10, 50),
          message: `SSH connection established to ${ipAddress}. Key exchange completed.`,
          deviceInfo: {
            model: MODELS[randomInt(0, MODELS.length - 1)],
            firmware: FIRMWARE_VERSIONS[randomInt(0, FIRMWARE_VERSIONS.length - 1)],
            uptime: randomInt(3600, 86400 * 200),
            cpu: randomInt(3, 65),
            memory: randomInt(12, 82),
          },
        };
      }
      return {
        success: false,
        latency: randomInt(500, 8000),
        message: `SSH connection failed to ${ipAddress}. Authentication error or host key mismatch.`,
      };
    }

    default: {
      // Generic protocol simulation
      const success = Math.random() < 0.80;
      if (success) {
        return {
          success: true,
          latency: baseLatency,
          message: `Connection successful to ${ipAddress}:${_port} via ${protocol}.`,
          deviceInfo: {
            model: MODELS[randomInt(0, MODELS.length - 1)],
            firmware: FIRMWARE_VERSIONS[randomInt(0, FIRMWARE_VERSIONS.length - 1)],
            uptime: randomInt(3600, 86400 * 300),
            cpu: randomInt(1, 90),
            memory: randomInt(10, 85),
          },
        };
      }
      return {
        success: false,
        latency: randomInt(1000, 10000),
        message: `Connection failed to ${ipAddress}:${_port} via ${protocol}. Unknown protocol or device unreachable.`,
      };
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, ipAddress, port, connectionProtocol, apiUser, apiPassword, snmpVersion, snmpCommunity } = body;

    let targetIp: string;
    let targetPort: number;
    let protocol: string;
    let deviceStatus: string | undefined;

    if (deviceId) {
      // Test connection using a saved device
      const device = await db.device.findUnique({
        where: { id: deviceId },
        select: {
          ipAddress: true,
          port: true,
          connectionProtocol: true,
          status: true,
        },
      });

      if (!device) {
        return NextResponse.json({ error: 'Device not found' }, { status: 404 });
      }

      targetIp = device.ipAddress;
      targetPort = device.port;
      protocol = device.connectionProtocol;
      deviceStatus = device.status;
    } else if (ipAddress && connectionProtocol) {
      // Test connection using provided parameters
      targetIp = ipAddress;
      targetPort = port ?? 8728;
      protocol = connectionProtocol;
    } else {
      return NextResponse.json(
        { error: 'Either deviceId or (ipAddress + connectionProtocol) is required' },
        { status: 400 }
      );
    }

    // Run simulated connection test
    const result = simulateConnectionTest(protocol, targetIp, targetPort, deviceStatus);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Device test-connection error:', error);
    const message = error instanceof Error ? error.message : 'Failed to test device connection';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

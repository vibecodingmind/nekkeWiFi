import { db } from '../src/lib/db';
import bcrypt from 'bcryptjs';

// Hash password with bcrypt (12 salt rounds)
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals: number = 2): number {
  const val = Math.random() * (max - min) + min;
  return parseFloat(val.toFixed(decimals));
}

function generatePhone(): string {
  const prefixes = ['655', '656', '657', '658', '659', '671', '672', '673', '674', '675', '676', '677', '678', '682', '683', '684', '685', '686', '689', '621', '622', '623', '624', '625', '626', '627', '628', '629'];
  const prefix = pickRandom(prefixes);
  const num = String(randomBetween(1000000, 9999999));
  return `+255 ${prefix} ${num}`;
}

function generatePPPoEUsername(firstName: string, lastName: string, orgSlug: string): string {
  const f = firstName.toLowerCase().replace(/[^a-z]/g, '');
  const l = lastName.toLowerCase().replace(/[^a-z]/g, '');
  const num = randomBetween(10, 999);
  return `${f}.${l}${num}@${orgSlug}`;
}

function generatePPPoEPassword(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pwd = '';
  for (let i = 0; i < 10; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)];
  }
  return pwd;
}

function generateInvoiceNumber(orgPrefix: string, month: number, year: number, index: number): string {
  const mStr = String(month).padStart(2, '0');
  const iStr = String(index).padStart(4, '0');
  return `INV-${orgPrefix}-${year}${mStr}-${iStr}`;
}

// ============================================
// SEED DATA DEFINITIONS
// ============================================

const DAR_STREETS = [
  'Ali Hassan Mwinyi Rd', 'Ohio Street', 'Sokoine Drive', 'Morogoro Road',
  'Bamboo Street', 'Haile Selassie Rd', 'Kivukoni Front', 'Samora Avenue',
  'Kirimandogo Street', 'Luthuli Street', 'Mkwepu Street', 'Ghana Avenue',
  'Azikiwe Street', 'Kalenga Street', 'Kisutu Street', 'Msimbazi Street',
  'Magomeni Road', 'Mwai Kibaki Road', 'Nyerere Road', 'Siemens Street',
  'Ubungo Road', 'Kawe Road', 'Bagamoyo Road', 'Pugu Road',
  'Mbagala Road', 'Temeke Street', 'Mjimwema Road', 'Kigamboni Road',
];

const ARUSHA_STREETS = [
  'Sokoine Road', 'Arusha-Moshi Road', 'Dodoma Road', 'Thika Road',
  'Fire Road', 'Garden Avenue', 'Boma Road', 'India Street',
  'Old Moshi Road', 'Njiro Road', 'Lebenon Road', 'Kijenge Street',
  'Sakina Street', 'Sekei Road', 'Engirash Street', 'Olmoti Street',
  'Baraa Road', 'Kimandolu Road', 'Mianzini Road', 'Kijenge Kati',
  'Naura Street', 'Sombetini Road', 'Terrat Road', 'Lemara Road',
  'Mawenzi Road', 'Ngorongoro Road', 'Serengeti Road', 'Kilimanjaro Road',
];

const DAR_NAMES = [
  { first: 'Juma', last: 'Mwangi' }, { first: 'Fatima', last: 'Hassan' },
  { first: 'Peter', last: 'Kimaro' }, { first: 'Aisha', last: 'Abdallah' },
  { first: 'David', last: 'Muturi' }, { first: 'Grace', last: 'Mkapa' },
  { first: 'Hassan', last: 'Omar' }, { first: 'Mariam', last: 'Juma' },
  { first: 'Joseph', last: 'Nyangoro' }, { first: 'Rehema', last: 'Moshi' },
  { first: 'Frank', last: 'Mrema' }, { first: 'Zainab', last: 'Ali' },
  { first: 'Charles', last: 'Msemwa' }, { first: 'Halima', last: 'Bakari' },
  { first: 'Godfrey', last: 'Mlay' }, { first: 'Nasra', last: 'Mohamed' },
  { first: 'Thomas', last: 'Sitta' }, { first: 'Khadija', last: 'Mussa' },
  { first: 'Emmanuel', last: 'Matiku' }, { first: 'Salma', last: 'Rashid' },
];

const ARUSHA_NAMES = [
  { first: 'Daniel', last: 'Laizer' }, { first: 'Nainai', last: 'Mollel' },
  { first: 'James', last: 'Mlanga' }, { first: 'Loiye', last: 'Maman' },
  { first: 'Michael', last: 'Shirima' }, { first: 'Sidai', last: 'Kongei' },
  { first: 'Robert', last: 'Mushi' }, { first: 'Nashipae', last: 'Olengurai' },
  { first: 'Samuel', last: 'Taraiwa' }, { first: 'Enyu', last: 'Meingori' },
  { first: 'William', last: 'Lema' }, { first: 'Naomi', last: 'Mmbaga' },
  { first: 'Steven', last: 'Kiango' }, { first: 'Yohana', last: 'Makyao' },
  { first: 'Albert', last: 'Mcharo' }, { first: 'Lightness', last: 'Masawe' },
  { first: 'Gideon', last: 'Moshi' }, { first: 'Pendo', last: 'Mlay' },
  { first: 'Ernest', last: 'Kimaro' }, { first: 'Eliana', last: 'Shirima' },
];

async function main() {
  console.log('🌱 Starting seed...');

  // Clean existing data
  console.log('🗑️  Cleaning existing data...');
  await db.usageRecord.deleteMany();
  await db.payment.deleteMany();
  await db.invoiceLineItem.deleteMany();
  await db.invoice.deleteMany();
  await db.subscription.deleteMany();
  await db.provisioningRule.deleteMany();
  await db.deviceInterface.deleteMany();
  await db.device.deleteMany();
  await db.plan.deleteMany();
  await db.paymentGateway.deleteMany();
  await db.customer.deleteMany();
  await db.orgUser.deleteMany();
  await db.organization.deleteMany();

  console.log('✅ Data cleaned');

  // ============================================
  // 1. ORGANIZATIONS
  // ============================================
  console.log('🏢 Creating organizations...');

  const darnet = await db.organization.create({
    data: {
      name: 'DarNet ISP',
      slug: 'darnet',
      email: 'info@darnet.co.tz',
      phone: '+255 22 270 0001',
      address: '42 Bamboosh Street, Upanga West',
      country: 'Tanzania',
      currency: 'TZS',
      taxRate: 18.0,
      isActive: true,
    },
  });

  const arushafiber = await db.organization.create({
    data: {
      name: 'Arusha Fiber',
      slug: 'arushafiber',
      email: 'support@arushafiber.co.tz',
      phone: '+255 27 250 0001',
      address: '15 Sokoine Road, Arusha Central',
      country: 'Tanzania',
      currency: 'TZS',
      taxRate: 18.0,
      isActive: true,
    },
  });

  console.log(`  ✅ DarNet ISP (${darnet.id})`);
  console.log(`  ✅ Arusha Fiber (${arushafiber.id})`);

  // ============================================
  // 2. ORG USERS (3 per org = 6 total)
  // ============================================
  console.log('👥 Creating org users...');

  // Super Admin (belongs to first org for schema, but has cross-org access)
  const superAdmin = await db.orgUser.create({
    data: {
      organizationId: darnet.id,
      name: 'Super Admin',
      email: 'super@nekkewifi.com',
      role: 'super_admin',
      password: await hashPassword('Super@123'),
      isActive: true,
      lastLoginAt: daysAgo(0),
    },
  });

  const darnetUsers = await db.orgUser.createMany({
    data: [
      { organizationId: darnet.id, name: 'Admin Hassan', email: 'hassan@darnet.co.tz', role: 'admin', password: await hashPassword('Admin@123'), isActive: true, lastLoginAt: daysAgo(0) },
      { organizationId: darnet.id, name: 'Agent Grace', email: 'grace@darnet.co.tz', role: 'agent', password: await hashPassword('Agent@123'), isActive: true, lastLoginAt: daysAgo(1) },
      { organizationId: darnet.id, name: 'Viewer Juma', email: 'juma.viewer@darnet.co.tz', role: 'viewer', password: await hashPassword('Viewer@123'), isActive: true, lastLoginAt: daysAgo(3) },
    ],
  });

  const arushaUsers = await db.orgUser.createMany({
    data: [
      { organizationId: arushafiber.id, name: 'Admin Daniel', email: 'daniel@arushafiber.co.tz', role: 'admin', password: await hashPassword('Admin@123'), isActive: true, lastLoginAt: daysAgo(0) },
      { organizationId: arushafiber.id, name: 'Agent Sidai', email: 'sidai@arushafiber.co.tz', role: 'agent', password: await hashPassword('Agent@123'), isActive: true, lastLoginAt: daysAgo(2) },
      { organizationId: arushafiber.id, name: 'Viewer Naomi', email: 'naomi.viewer@arushafiber.co.tz', role: 'viewer', password: await hashPassword('Viewer@123'), isActive: true, lastLoginAt: daysAgo(5) },
    ],
  });

  console.log(`  ✅ Super Admin: ${superAdmin.email}`);
  console.log(`  ✅ DarNet users: ${darnetUsers.count}`);
  console.log(`  ✅ Arusha Fiber users: ${arushaUsers.count}`);

  // ============================================
  // 3. CUSTOMERS (20 per org)
  // ============================================
  console.log('👤 Creating customers...');

  const darnetCustomers: { id: string; firstName: string; lastName: string; phone: string }[] = [];
  for (let i = 0; i < 20; i++) {
    const name = DAR_NAMES[i];
    const statuses = ['active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'suspended', 'suspended', 'suspended', 'trial', 'trial', 'trial', 'active', 'active'];
    const customer = await db.customer.create({
      data: {
        organizationId: darnet.id,
        firstName: name.first,
        lastName: name.last,
        email: `${name.first.toLowerCase()}.${name.last.toLowerCase()}@gmail.com`,
        phone: generatePhone(),
        address: `${randomBetween(1, 999)} ${pickRandom(DAR_STREETS)}`,
        city: 'Dar es Salaam',
        region: pickRandom(['Kinondoni', 'Ilala', 'Temeke', 'Ubungo', 'Kigamboni']),
        status: statuses[i],
        balance: randomBetween(0, 50000),
      },
    });
    darnetCustomers.push({ id: customer.id, firstName: name.first, lastName: name.last, phone: customer.phone });
  }

  const arushaCustomers: { id: string; firstName: string; lastName: string; phone: string }[] = [];
  for (let i = 0; i < 20; i++) {
    const name = ARUSHA_NAMES[i];
    const statuses = ['active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'suspended', 'suspended', 'trial', 'trial', 'active', 'active', 'active', 'active', 'active'];
    const customer = await db.customer.create({
      data: {
        organizationId: arushafiber.id,
        firstName: name.first,
        lastName: name.last,
        email: `${name.first.toLowerCase()}.${name.last.toLowerCase()}@gmail.com`,
        phone: generatePhone(),
        address: `${randomBetween(1, 999)} ${pickRandom(ARUSHA_STREETS)}`,
        city: 'Arusha',
        region: pickRandom(['Arusha City', 'Arusha Rural', 'Meru']),
        status: statuses[i],
        balance: randomBetween(0, 40000),
      },
    });
    arushaCustomers.push({ id: customer.id, firstName: name.first, lastName: name.last, phone: customer.phone });
  }

  console.log(`  ✅ DarNet customers: ${darnetCustomers.length}`);
  console.log(`  ✅ Arusha Fiber customers: ${arushaCustomers.length}`);

  // ============================================
  // 4. NETWORK DEVICES (10 for DarNet, 8 for Arusha)
  // ============================================
  console.log('🖥️  Creating network devices...');

  // ---------- DarNet ISP Devices ----------
  const darnetDevice1 = await db.device.create({
    data: {
      organizationId: darnet.id,
      name: 'MikroTik CCR1009 - Core Router',
      type: 'mikrotik',
      category: 'router',
      model: 'CCR1009-7G-1C-1C+',
      ipAddress: '10.0.0.1',
      port: 8728,
      connectionProtocol: 'api',
      apiUser: 'admin',
      apiPassword: 'DarnetCore!2024',
      firmware: 'RouterOS 7.14.3',
      serialNumber: 'HK0923Z4Q7X',
      location: 'DarNet NOC, Upanga DC1',
      status: 'online',
      lastSeenAt: new Date(),
      totalBandwidth: '10Gbps',
      cpuUsage: 42,
      memoryUsage: 58,
      uptime: 1209600,
      temperature: 48,
      capabilities: 'bandwidth_shaping,pppoe_server,dhcp_server,firewall,vlan,qos,nat,routing,hotspot',
      configProfile: 'mikrotik_core_router',
      interfaces: {
        create: [
          { name: 'ether1', type: 'ethernet', macAddress: 'E4:8D:8C:3A:1F:01', status: 'up', speed: '1Gbps', rxBytes: 584320000000, txBytes: 492100000000 },
          { name: 'ether2', type: 'ethernet', macAddress: 'E4:8D:8C:3A:1F:02', status: 'up', speed: '1Gbps', rxBytes: 320100000000, txBytes: 278900000000 },
          { name: 'sfp1', type: 'sfp', macAddress: 'E4:8D:8C:3A:1F:03', status: 'up', speed: '10Gbps', rxBytes: 1250000000000, txBytes: 980000000000 },
          { name: 'bridge-lo', type: 'bridge', status: 'up', rxBytes: 0, txBytes: 0 },
        ],
      },
    },
  });

  const darnetDevice2 = await db.device.create({
    data: {
      organizationId: darnet.id,
      name: 'MikroTik CCR2004 - Distribution Router',
      type: 'mikrotik',
      category: 'router',
      model: 'CCR2004-1G-12S+2XS',
      ipAddress: '10.0.0.2',
      port: 8728,
      connectionProtocol: 'api',
      apiUser: 'admin',
      apiPassword: 'DarnetDist!2024',
      firmware: 'RouterOS 7.14.3',
      serialNumber: 'HG1082Z8K5M',
      location: 'DarNet NOC, Upanga DC1',
      status: 'online',
      lastSeenAt: new Date(),
      totalBandwidth: '10Gbps',
      cpuUsage: 38,
      memoryUsage: 52,
      uptime: 1209600,
      temperature: 46,
      capabilities: 'bandwidth_shaping,pppoe_server,dhcp_server,firewall,vlan,qos,nat,routing,hotspot',
      configProfile: 'mikrotik_core_router',
      interfaces: {
        create: [
          { name: 'ether1', type: 'ethernet', macAddress: '4C:5E:0C:A1:B2:01', status: 'up', speed: '1Gbps', rxBytes: 412000000000, txBytes: 385000000000 },
          { name: 'sfp1', type: 'sfp', macAddress: '4C:5E:0C:A1:B2:02', status: 'up', speed: '10Gbps', rxBytes: 870000000000, txBytes: 720000000000 },
          { name: 'sfp2', type: 'sfp', macAddress: '4C:5E:0C:A1:B2:03', status: 'up', speed: '10Gbps', rxBytes: 630000000000, txBytes: 510000000000 },
        ],
      },
    },
  });

  const darnetDevice3 = await db.device.create({
    data: {
      organizationId: darnet.id,
      name: 'TP-Link EAP660 HD - Office AP',
      type: 'tplink',
      category: 'access_point',
      model: 'EAP660 HD',
      ipAddress: '10.0.1.10',
      port: 80,
      connectionProtocol: 'rest',
      apiUser: 'admin',
      apiPassword: 'DarnetAP!2024',
      firmware: '4.0.3 Build 20231117',
      serialNumber: 'TL-EAP660HD-8823',
      location: 'DarNet HQ, Upanga',
      status: 'online',
      lastSeenAt: new Date(),
      totalBandwidth: '1.775Gbps',
      cpuUsage: 25,
      memoryUsage: 40,
      uptime: 864000,
      temperature: 44,
      capabilities: 'bandwidth_shaping,dhcp_server,vlan',
      interfaces: {
        create: [
          { name: 'eth0', type: 'ethernet', macAddress: 'A8:42:E1:7F:2A:01', status: 'up', speed: '1Gbps', rxBytes: 52000000000, txBytes: 48000000000 },
          { name: 'wlan0', type: 'wireless', macAddress: 'A8:42:E1:7F:2A:02', status: 'up', speed: '1775Mbps', rxBytes: 185000000000, txBytes: 162000000000 },
          { name: 'wlan1', type: 'wireless', macAddress: 'A8:42:E1:7F:2A:03', status: 'up', speed: '574Mbps', rxBytes: 42000000000, txBytes: 38000000000 },
        ],
      },
    },
  });

  const darnetDevice4 = await db.device.create({
    data: {
      organizationId: darnet.id,
      name: 'Huawei MA5608T OLT - GPON',
      type: 'huawei',
      category: 'olt',
      model: 'MA5608T',
      ipAddress: '10.0.2.1',
      port: 161,
      connectionProtocol: 'snmp',
      apiUser: 'root',
      apiPassword: 'Huawei@Root2024',
      snmpVersion: 'v2c',
      snmpCommunity: 'Huawei@123',
      firmware: 'MA5608V800R018C10',
      serialNumber: '21023518AEG0980012',
      location: 'DarNet POP, Kijitonyama',
      status: 'online',
      lastSeenAt: new Date(),
      totalBandwidth: '40Gbps',
      cpuUsage: 55,
      memoryUsage: 62,
      uptime: 2592000,
      temperature: 52,
      capabilities: 'gpon provisioning,bandwidth_shaping,vlan',
      configProfile: 'huawei_olt_gpon',
      interfaces: {
        create: [
          { name: 'gpon-olt-0/1', type: 'pon_olt', status: 'up', speed: '10Gbps', rxBytes: 920000000000, txBytes: 780000000000, opticalTxPower: 4.5, opticalRxPower: -18.2 },
          { name: 'gpon-olt-0/2', type: 'pon_olt', status: 'up', speed: '10Gbps', rxBytes: 680000000000, txBytes: 540000000000, opticalTxPower: 4.8, opticalRxPower: -17.5 },
          { name: 'gpon-olt-0/3', type: 'pon_olt', status: 'up', speed: '10Gbps', rxBytes: 450000000000, txBytes: 320000000000, opticalTxPower: 3.9, opticalRxPower: -19.8 },
          { name: 'ge-0/1', type: 'ethernet', macAddress: '00:E0:FC:A1:22:01', status: 'up', speed: '1Gbps', rxBytes: 2100000000000, txBytes: 1850000000000 },
        ],
      },
    },
  });

  const darnetDevice5 = await db.device.create({
    data: {
      organizationId: darnet.id,
      name: 'ZTE ZXA10 C600 OLT - GPON',
      type: 'zte',
      category: 'olt',
      model: 'ZXA10 C600',
      ipAddress: '10.0.2.2',
      port: 161,
      connectionProtocol: 'snmp',
      apiUser: 'root',
      apiPassword: 'ZTE@Root2024',
      snmpVersion: 'v2c',
      snmpCommunity: 'ZTE@456',
      firmware: 'V4.0.12P1T2',
      serialNumber: 'ZTE20230815001',
      location: 'DarNet POP, Mbagala',
      status: 'online',
      lastSeenAt: new Date(),
      totalBandwidth: '40Gbps',
      cpuUsage: 60,
      memoryUsage: 65,
      uptime: 2160000,
      temperature: 50,
      capabilities: 'gpon provisioning,bandwidth_shaping,vlan',
      configProfile: 'zte_olt_gpon',
      interfaces: {
        create: [
          { name: 'gpon-olt-1/1', type: 'pon_olt', status: 'up', speed: '10Gbps', rxBytes: 750000000000, txBytes: 620000000000, opticalTxPower: 4.2, opticalRxPower: -20.1 },
          { name: 'gpon-olt-1/2', type: 'pon_olt', status: 'up', speed: '10Gbps', rxBytes: 530000000000, txBytes: 410000000000, opticalTxPower: 3.8, opticalRxPower: -21.5 },
          { name: 'gpon-olt-1/3', type: 'pon_olt', status: 'down', speed: '10Gbps', rxBytes: 0, txBytes: 0, opticalTxPower: 0, opticalRxPower: -40.0 },
        ],
      },
    },
  });

  const darnetDevice6 = await db.device.create({
    data: {
      organizationId: darnet.id,
      name: 'Nokia G-240W-A ONT - Customer Premises',
      type: 'nokia',
      category: 'ont',
      model: 'G-240W-A',
      ipAddress: '10.0.10.101',
      port: 80,
      connectionProtocol: 'tr069',
      apiUser: 'admin',
      apiPassword: 'NokiaOnt!2024',
      acsUrl: 'https://acs.darnet.co.tz:7547',
      firmware: '3FE48267ABTC23',
      serialNumber: 'NK48267ABTC23001',
      location: 'Customer: Juma Mwangi, Kinondoni',
      status: 'online',
      lastSeenAt: new Date(),
      totalBandwidth: '1Gbps',
      cpuUsage: 15,
      memoryUsage: 32,
      uptime: 1728000,
      temperature: 38,
      capabilities: 'bandwidth_shaping,vlan,wifi',
      interfaces: {
        create: [
          { name: 'gpon-ont-0/1', type: 'pon_ont', status: 'up', speed: '2.5Gbps', rxBytes: 185000000000, txBytes: 92000000000, opticalRxPower: -22.5, opticalTxPower: 2.1, distance: 5.2 },
          { name: 'eth1', type: 'ethernet', macAddress: 'EC:0E:B4:3A:1F:01', status: 'up', speed: '1Gbps', rxBytes: 145000000000, txBytes: 78000000000 },
          { name: 'wlan0', type: 'wireless', macAddress: 'EC:0E:B4:3A:1F:02', status: 'up', speed: '300Mbps', rxBytes: 62000000000, txBytes: 48000000000 },
        ],
      },
    },
  });

  const darnetDevice7 = await db.device.create({
    data: {
      organizationId: darnet.id,
      name: 'ZTE MC888 5G Router - Airtel Fixed Wireless',
      type: 'zte',
      category: '5g_router',
      model: 'ZTE MC888',
      ipAddress: '10.0.3.50',
      port: 443,
      connectionProtocol: 'rest',
      apiUser: 'admin',
      apiPassword: 'ZTE5G!2024',
      firmware: 'ZTE_MC888_1.0.0.12',
      serialNumber: 'ZTEM88820230001',
      location: 'DarNet POP, Temeke',
      status: 'online',
      lastSeenAt: new Date(),
      totalBandwidth: '3.5Gbps',
      cpuUsage: 35,
      memoryUsage: 45,
      uptime: 432000,
      temperature: 42,
      capabilities: 'bandwidth_shaping,nat,dhcp_server,firewall',
      configProfile: 'zte_5g_router_airtel',
      interfaces: {
        create: [
          { name: 'lan0', type: 'ethernet', macAddress: '88:63:E1:7F:2A:01', status: 'up', speed: '1Gbps', rxBytes: 92000000000, txBytes: 65000000000 },
          { name: 'lan1', type: 'ethernet', macAddress: '88:63:E1:7F:2A:02', status: 'down', speed: '1Gbps', rxBytes: 0, txBytes: 0 },
          { name: 'wwan0', type: 'wireless', status: 'up', speed: '3500Mbps', rxBytes: 425000000000, txBytes: 185000000000 },
          { name: 'wlan0', type: 'wireless', macAddress: '88:63:E1:7F:2A:05', status: 'up', speed: '1200Mbps', rxBytes: 310000000000, txBytes: 210000000000 },
        ],
      },
    },
  });

  const darnetDevice8 = await db.device.create({
    data: {
      organizationId: darnet.id,
      name: 'Cambium ePMP Force 300 - PtMP Base',
      type: 'cambium',
      category: 'radio',
      model: 'ePMP Force 300',
      ipAddress: '10.0.4.1',
      port: 80,
      connectionProtocol: 'rest',
      apiUser: 'admin',
      apiPassword: 'CambiumPtMP!2024',
      firmware: '4.7.2',
      serialNumber: 'CMBF30020230801',
      location: 'DarNet Tower, Kigamboni',
      status: 'online',
      lastSeenAt: new Date(),
      totalBandwidth: '600Mbps',
      cpuUsage: 30,
      memoryUsage: 38,
      uptime: 1728000,
      temperature: 55,
      capabilities: 'bandwidth_shaping,tdma,gps_sync',
      configProfile: 'cambium_epmp_basestation',
      interfaces: {
        create: [
          { name: 'eth0', type: 'ethernet', macAddress: '00:04:56:B2:1C:01', status: 'up', speed: '1Gbps', rxBytes: 380000000000, txBytes: 290000000000 },
          { name: 'wlan0', type: 'wireless', macAddress: '00:04:56:B2:1C:02', status: 'up', speed: '600Mbps', rxBytes: 520000000000, txBytes: 410000000000 },
        ],
      },
    },
  });

  const darnetDevice9 = await db.device.create({
    data: {
      organizationId: darnet.id,
      name: 'ZTE F601 ODU - Outdoor Unit',
      type: 'zte',
      category: 'odu',
      model: 'ZTE F601 ODU',
      ipAddress: '10.0.10.201',
      port: 161,
      connectionProtocol: 'snmp',
      apiUser: 'root',
      apiPassword: 'ZTE@ODU2024',
      snmpVersion: 'v2c',
      snmpCommunity: 'ODU@789',
      firmware: 'V6.0.10P3T8',
      serialNumber: 'ZTEF60120230101',
      location: 'Customer: Fatima Hassan, Temeke',
      status: 'online',
      lastSeenAt: new Date(),
      totalBandwidth: '1Gbps',
      cpuUsage: 18,
      memoryUsage: 28,
      uptime: 2592000,
      temperature: 49,
      capabilities: 'pon,bandwidth_shaping',
      configProfile: 'zte_odu_outdoor',
      interfaces: {
        create: [
          { name: 'gpon-odu-0/1', type: 'pon', status: 'up', speed: '2.5Gbps', rxBytes: 125000000000, txBytes: 68000000000, opticalRxPower: -24.8, opticalTxPower: 2.3, distance: 8.7 },
          { name: 'eth0', type: 'ethernet', macAddress: '2C:3B:A1:44:5E:01', status: 'up', speed: '1Gbps', rxBytes: 98000000000, txBytes: 55000000000 },
        ],
      },
    },
  });

  const darnetDevice10 = await db.device.create({
    data: {
      organizationId: darnet.id,
      name: 'Ubiquiti Dream Machine Pro - Security Gateway',
      type: 'ubiquiti',
      category: 'gateway',
      model: 'UXG-Pro',
      ipAddress: '10.0.0.254',
      port: 443,
      connectionProtocol: 'rest',
      apiUser: 'admin',
      apiPassword: 'UbntGateway!2024',
      firmware: '4.0.69',
      serialNumber: 'UBNTDMP20230001',
      location: 'DarNet NOC, Upanga DC1',
      status: 'online',
      lastSeenAt: new Date(),
      totalBandwidth: '3.5Gbps',
      cpuUsage: 28,
      memoryUsage: 55,
      uptime: 2592000,
      temperature: 44,
      capabilities: 'firewall,nat,vlan,ids_ips,vpn,bandwidth_shaping,dhcp_server',
      configProfile: 'ubiquiti_gateway_pro',
      interfaces: {
        create: [
          { name: 'eth0', type: 'ethernet', macAddress: 'FC:EC:DA:88:1A:01', status: 'up', speed: '1Gbps', rxBytes: 2150000000000, txBytes: 1820000000000 },
          { name: 'eth1', type: 'ethernet', macAddress: 'FC:EC:DA:88:1A:02', status: 'up', speed: '2.5Gbps', rxBytes: 1850000000000, txBytes: 1560000000000 },
          { name: 'eth2', type: 'ethernet', macAddress: 'FC:EC:DA:88:1A:03', status: 'up', speed: '10Gbps', rxBytes: 950000000000, txBytes: 820000000000 },
        ],
      },
    },
  });

  const darnetDevices = [darnetDevice1, darnetDevice2, darnetDevice3, darnetDevice4, darnetDevice5, darnetDevice6, darnetDevice7, darnetDevice8, darnetDevice9, darnetDevice10];

  // ---------- Arusha Fiber Devices ----------
  const arushaDevice1 = await db.device.create({
    data: {
      organizationId: arushafiber.id,
      name: 'MikroTik CCR1009 - Core Router',
      type: 'mikrotik',
      category: 'router',
      model: 'CCR1009-7G-1C-1C+',
      ipAddress: '192.168.0.1',
      port: 8728,
      connectionProtocol: 'api',
      apiUser: 'admin',
      apiPassword: 'ArushaCore!2024',
      firmware: 'RouterOS 7.14.3',
      serialNumber: 'HK0923Z4Q8N',
      location: 'Arusha Fiber NOC, Sokoine Rd',
      status: 'online',
      lastSeenAt: new Date(),
      totalBandwidth: '10Gbps',
      cpuUsage: 35,
      memoryUsage: 48,
      uptime: 3456000,
      temperature: 42,
      capabilities: 'bandwidth_shaping,pppoe_server,dhcp_server,firewall,vlan,qos,nat,routing',
      configProfile: 'mikrotik_core_router',
      interfaces: {
        create: [
          { name: 'ether1', type: 'ethernet', macAddress: 'E4:8D:8C:4B:2A:01', status: 'up', speed: '1Gbps', rxBytes: 320000000000, txBytes: 280000000000 },
          { name: 'sfp1', type: 'sfp', macAddress: 'E4:8D:8C:4B:2A:02', status: 'up', speed: '10Gbps', rxBytes: 850000000000, txBytes: 710000000000 },
          { name: 'sfp2', type: 'sfp', macAddress: 'E4:8D:8C:4B:2A:03', status: 'up', speed: '10Gbps', rxBytes: 420000000000, txBytes: 350000000000 },
        ],
      },
    },
  });

  const arushaDevice2 = await db.device.create({
    data: {
      organizationId: arushafiber.id,
      name: 'MikroTik hAP ax3 - Distribution AP',
      type: 'mikrotik',
      category: 'access_point',
      model: 'C53UiG+5HPaxD2HPaxD',
      ipAddress: '192.168.1.10',
      port: 8728,
      connectionProtocol: 'api',
      apiUser: 'admin',
      apiPassword: 'ArushaAP!2024',
      firmware: 'RouterOS 7.14.3',
      serialNumber: 'HK9021Z9M4P',
      location: 'Arusha Fiber HQ',
      status: 'online',
      lastSeenAt: new Date(),
      totalBandwidth: '1Gbps',
      cpuUsage: 22,
      memoryUsage: 35,
      uptime: 2592000,
      temperature: 40,
      capabilities: 'bandwidth_shaping,dhcp_server,vlan,hotspot',
      configProfile: 'mikrotik_hap_ax3',
      interfaces: {
        create: [
          { name: 'ether1', type: 'ethernet', macAddress: 'D4:02:A1:5C:3B:01', status: 'up', speed: '1Gbps', rxBytes: 28000000000, txBytes: 22000000000 },
          { name: 'wlan1', type: 'wireless', macAddress: 'D4:02:A1:5C:3B:02', status: 'up', speed: '1800Mbps', rxBytes: 95000000000, txBytes: 72000000000 },
          { name: 'wlan2', type: 'wireless', macAddress: 'D4:02:A1:5C:3B:03', status: 'up', speed: '574Mbps', rxBytes: 35000000000, txBytes: 28000000000 },
        ],
      },
    },
  });

  const arushaDevice3 = await db.device.create({
    data: {
      organizationId: arushafiber.id,
      name: 'Huawei MA5608T OLT - GPON',
      type: 'huawei',
      category: 'olt',
      model: 'MA5608T',
      ipAddress: '192.168.2.1',
      port: 161,
      connectionProtocol: 'snmp',
      apiUser: 'root',
      apiPassword: 'Huawei@Arusha2024',
      snmpVersion: 'v2c',
      snmpCommunity: 'ArushaFiber@SNMP',
      firmware: 'MA5608V800R018C10',
      serialNumber: '21023518AEG0980099',
      location: 'Arusha Fiber POP, Njiro',
      status: 'online',
      lastSeenAt: new Date(),
      totalBandwidth: '40Gbps',
      cpuUsage: 48,
      memoryUsage: 58,
      uptime: 3456000,
      temperature: 50,
      capabilities: 'gpon provisioning,bandwidth_shaping,vlan',
      configProfile: 'huawei_olt_gpon',
      interfaces: {
        create: [
          { name: 'gpon-olt-0/1', type: 'pon_olt', status: 'up', speed: '10Gbps', rxBytes: 620000000000, txBytes: 510000000000, opticalTxPower: 4.0, opticalRxPower: -19.5 },
          { name: 'gpon-olt-0/2', type: 'pon_olt', status: 'up', speed: '10Gbps', rxBytes: 410000000000, txBytes: 330000000000, opticalTxPower: 4.3, opticalRxPower: -18.8 },
          { name: 'ge-0/1', type: 'ethernet', macAddress: '00:E0:FC:B2:33:01', status: 'up', speed: '1Gbps', rxBytes: 1050000000000, txBytes: 880000000000 },
          { name: 'ge-0/2', type: 'ethernet', macAddress: '00:E0:FC:B2:33:02', status: 'up', speed: '1Gbps', rxBytes: 780000000000, txBytes: 620000000000 },
        ],
      },
    },
  });

  const arushaDevice4 = await db.device.create({
    data: {
      organizationId: arushafiber.id,
      name: 'ZTE MC888 5G Router - Airtel Fixed Wireless',
      type: 'zte',
      category: '5g_router',
      model: 'ZTE MC888',
      ipAddress: '192.168.3.50',
      port: 443,
      connectionProtocol: 'rest',
      apiUser: 'admin',
      apiPassword: 'Arusha5G!2024',
      firmware: 'ZTE_MC888_1.0.0.12',
      serialNumber: 'ZTEM88820230002',
      location: 'Arusha Fiber POP, Sakina',
      status: 'online',
      lastSeenAt: new Date(),
      totalBandwidth: '3.5Gbps',
      cpuUsage: 32,
      memoryUsage: 42,
      uptime: 864000,
      temperature: 41,
      capabilities: 'bandwidth_shaping,nat,dhcp_server,firewall',
      configProfile: 'zte_5g_router_airtel',
      interfaces: {
        create: [
          { name: 'lan0', type: 'ethernet', macAddress: '88:63:E1:8A:3B:01', status: 'up', speed: '1Gbps', rxBytes: 62000000000, txBytes: 45000000000 },
          { name: 'lan1', type: 'ethernet', macAddress: '88:63:E1:8A:3B:02', status: 'down', speed: '1Gbps', rxBytes: 0, txBytes: 0 },
          { name: 'lan2', type: 'ethernet', macAddress: '88:63:E1:8A:3B:03', status: 'down', speed: '1Gbps', rxBytes: 0, txBytes: 0 },
          { name: 'wwan0', type: 'wireless', status: 'up', speed: '3500Mbps', rxBytes: 310000000000, txBytes: 145000000000 },
        ],
      },
    },
  });

  const arushaDevice5 = await db.device.create({
    data: {
      organizationId: arushafiber.id,
      name: 'Huawei F680 ODU - Outdoor Unit',
      type: 'huawei',
      category: 'odu',
      model: 'Huawei F680 ODU',
      ipAddress: '192.168.10.201',
      port: 161,
      connectionProtocol: 'snmp',
      apiUser: 'root',
      apiPassword: 'Huawei@ODU2024',
      snmpVersion: 'v2c',
      snmpCommunity: 'ArushaODU@SNMP',
      firmware: 'V5R019C00S108',
      serialNumber: 'HWF68020230101',
      location: 'Customer: Daniel Laizer, Njiro',
      status: 'online',
      lastSeenAt: new Date(),
      totalBandwidth: '1Gbps',
      cpuUsage: 20,
      memoryUsage: 30,
      uptime: 2160000,
      temperature: 47,
      capabilities: 'pon,bandwidth_shaping',
      configProfile: 'huawei_odu_outdoor',
      interfaces: {
        create: [
          { name: 'gpon-odu-0/1', type: 'pon', status: 'up', speed: '2.5Gbps', rxBytes: 98000000000, txBytes: 52000000000, opticalRxPower: -23.2, opticalTxPower: 1.8, distance: 12.4 },
          { name: 'eth0', type: 'ethernet', macAddress: '48:5B:39:A2:C1:01', status: 'up', speed: '1Gbps', rxBytes: 75000000000, txBytes: 42000000000 },
          { name: 'wifi0', type: 'wireless', macAddress: '48:5B:39:A2:C1:02', status: 'up', speed: '300Mbps', rxBytes: 38000000000, txBytes: 28000000000 },
        ],
      },
    },
  });

  const arushaDevice6 = await db.device.create({
    data: {
      organizationId: arushafiber.id,
      name: 'Cambium ePMP 3000 - PtMP Base',
      type: 'cambium',
      category: 'radio',
      model: 'ePMP 3000',
      ipAddress: '192.168.4.1',
      port: 80,
      connectionProtocol: 'rest',
      apiUser: 'admin',
      apiPassword: 'ArushaRadio!2024',
      firmware: '4.7.2',
      serialNumber: 'CMB300020230801',
      location: 'Arusha Fiber Tower, Sekei',
      status: 'online',
      lastSeenAt: new Date(),
      totalBandwidth: '1Gbps',
      cpuUsage: 27,
      memoryUsage: 35,
      uptime: 2160000,
      temperature: 53,
      capabilities: 'bandwidth_shaping,tdma,gps_sync, mimo',
      configProfile: 'cambium_epmp3000_basestation',
      interfaces: {
        create: [
          { name: 'eth0', type: 'ethernet', macAddress: '00:04:56:C3:2D:01', status: 'up', speed: '1Gbps', rxBytes: 210000000000, txBytes: 170000000000 },
          { name: 'wlan0', type: 'wireless', macAddress: '00:04:56:C3:2D:02', status: 'up', speed: '1000Mbps', rxBytes: 380000000000, txBytes: 290000000000 },
        ],
      },
    },
  });

  const arushaDevice7 = await db.device.create({
    data: {
      organizationId: arushafiber.id,
      name: 'TP-Link EAP245 - Office AP',
      type: 'tplink',
      category: 'access_point',
      model: 'EAP245',
      ipAddress: '192.168.1.11',
      port: 80,
      connectionProtocol: 'rest',
      apiUser: 'admin',
      apiPassword: 'ArushaEAP!2024',
      firmware: '3.0.0 Build 20220722',
      serialNumber: 'TL-EAP245-7712',
      location: 'Arusha Fiber Branch, Kijenge',
      status: 'online',
      lastSeenAt: new Date(),
      totalBandwidth: '867Mbps',
      cpuUsage: 20,
      memoryUsage: 30,
      uptime: 1728000,
      temperature: 39,
      capabilities: 'bandwidth_shaping,vlan',
      interfaces: {
        create: [
          { name: 'eth0', type: 'ethernet', macAddress: 'B0:4E:26:F1:8C:01', status: 'up', speed: '1Gbps', rxBytes: 18000000000, txBytes: 15000000000 },
          { name: 'wlan0', type: 'wireless', macAddress: 'B0:4E:26:F1:8C:02', status: 'up', speed: '867Mbps', rxBytes: 95000000000, txBytes: 72000000000 },
        ],
      },
    },
  });

  const arushaDevice8 = await db.device.create({
    data: {
      organizationId: arushafiber.id,
      name: 'Nokia XS-010X-Q ONT - Customer Premises',
      type: 'nokia',
      category: 'ont',
      model: 'XS-010X-Q',
      ipAddress: '192.168.10.101',
      port: 80,
      connectionProtocol: 'rest',
      apiUser: 'admin',
      apiPassword: 'ArushaNokia!2024',
      firmware: '3FE49218ABTC23',
      serialNumber: 'NK49218ABTC23001',
      location: 'Customer: James Mlanga, Sekei',
      status: 'online',
      lastSeenAt: new Date(),
      totalBandwidth: '1Gbps',
      cpuUsage: 12,
      memoryUsage: 28,
      uptime: 2592000,
      temperature: 36,
      capabilities: 'bandwidth_shaping,vlan,wifi',
      interfaces: {
        create: [
          { name: 'gpon-ont-0/1', type: 'pon_ont', status: 'up', speed: '2.5Gbps', rxBytes: 150000000000, txBytes: 78000000000, opticalRxPower: -25.1, opticalTxPower: 2.5, distance: 15.8 },
          { name: 'eth1', type: 'ethernet', macAddress: 'AC:1F:6B:44:9E:01', status: 'up', speed: '1Gbps', rxBytes: 120000000000, txBytes: 65000000000 },
          { name: 'wlan0', type: 'wireless', macAddress: 'AC:1F:6B:44:9E:02', status: 'up', speed: '300Mbps', rxBytes: 55000000000, txBytes: 38000000000 },
        ],
      },
    },
  });

  const arushaDevices = [arushaDevice1, arushaDevice2, arushaDevice3, arushaDevice4, arushaDevice5, arushaDevice6, arushaDevice7, arushaDevice8];

  console.log(`  ✅ DarNet devices: ${darnetDevices.length}`);
  console.log(`  ✅ Arusha Fiber devices: ${arushaDevices.length}`);

  // ============================================
  // 5. PLANS (5 per org)
  // ============================================
  console.log('📋 Creating plans...');

  const darnetPlans = await db.plan.createMany({
    data: [
      { organizationId: darnet.id, name: 'Starter 5Mbps', description: 'Basic home plan with 5Mbps download and 2Mbps upload', speedDown: '5Mbps', speedUp: '2Mbps', priceMonthly: 20000, priceQuarterly: 54000, priceYearly: 192000, setupFee: 50000, isActive: true, isPopular: false },
      { organizationId: darnet.id, name: 'Home 10Mbps', description: 'Great for small families with streaming needs', speedDown: '10Mbps', speedUp: '5Mbps', priceMonthly: 35000, priceQuarterly: 94500, priceYearly: 336000, setupFee: 50000, isActive: true, isPopular: true },
      { organizationId: darnet.id, name: 'Standard 25Mbps', description: 'Ideal for work from home and video calls', speedDown: '25Mbps', speedUp: '10Mbps', priceMonthly: 65000, priceQuarterly: 175500, priceYearly: 624000, setupFee: 30000, isActive: true, isPopular: true },
      { organizationId: darnet.id, name: 'Premium 50Mbps', description: 'High-speed fiber for power users', speedDown: '50Mbps', speedUp: '20Mbps', priceMonthly: 120000, priceQuarterly: 324000, priceYearly: 1152000, setupFee: 0, isActive: true, isPopular: false },
      { organizationId: darnet.id, name: 'Business 100Mbps', description: 'Enterprise-grade fiber with SLA', speedDown: '100Mbps', speedUp: '50Mbps', priceMonthly: 300000, priceQuarterly: 810000, priceYearly: 2880000, setupFee: 0, isActive: true, isPopular: false },
    ],
  });

  const arushaPlans = await db.plan.createMany({
    data: [
      { organizationId: arushafiber.id, name: 'Basic 5Mbps', description: 'Entry-level fiber plan for casual browsing', speedDown: '5Mbps', speedUp: '2Mbps', priceMonthly: 25000, priceQuarterly: 67500, priceYearly: 240000, setupFee: 40000, isActive: true, isPopular: false },
      { organizationId: arushafiber.id, name: 'Home 10Mbps', description: 'Suitable for small households with light streaming', speedDown: '10Mbps', speedUp: '5Mbps', priceMonthly: 40000, priceQuarterly: 108000, priceYearly: 384000, setupFee: 40000, isActive: true, isPopular: true },
      { organizationId: arushafiber.id, name: 'Family 25Mbps', description: 'Perfect for families and remote workers', speedDown: '25Mbps', speedUp: '10Mbps', priceMonthly: 75000, priceQuarterly: 202500, priceYearly: 720000, setupFee: 0, isActive: true, isPopular: true },
      { organizationId: arushafiber.id, name: 'Pro 50Mbps', description: 'Business-class connectivity for SMEs', speedDown: '50Mbps', speedUp: '20Mbps', priceMonthly: 150000, priceQuarterly: 405000, priceYearly: 1440000, setupFee: 0, isActive: true, isPopular: false },
      { organizationId: arushafiber.id, name: 'Enterprise 100Mbps', description: 'Dedicated fiber with priority support', speedDown: '100Mbps', speedUp: '50Mbps', priceMonthly: 250000, priceQuarterly: 675000, priceYearly: 2400000, setupFee: 0, isActive: true, isPopular: false },
    ],
  });

  console.log(`  ✅ DarNet plans: ${darnetPlans.count}`);
  console.log(`  ✅ Arusha Fiber plans: ${arushaPlans.count}`);

  // Fetch plans back to get IDs
  const allDarnetPlans = await db.plan.findMany({ where: { organizationId: darnet.id } });
  const allArushaPlans = await db.plan.findMany({ where: { organizationId: arushafiber.id } });

  // ============================================
  // 6. PAYMENT GATEWAYS (1 per org)
  // ============================================
  console.log('💳 Creating payment gateways...');

  await db.paymentGateway.create({
    data: {
      organizationId: darnet.id,
      gateway: 'pesapal',
      consumerKey: 'darnet_test_key',
      consumerSecret: 'darnet_test_secret',
      isLive: false,
      isEnabled: true,
      callbackUrl: 'https://billing.darnet.co.tz/api/payments/pesapal/callback',
      ipnUrl: 'https://billing.darnet.co.tz/api/payments/pesapal/ipn',
    },
  });

  await db.paymentGateway.create({
    data: {
      organizationId: arushafiber.id,
      gateway: 'pesapal',
      consumerKey: 'arushafiber_test_key',
      consumerSecret: 'arushafiber_test_secret',
      isLive: false,
      isEnabled: true,
      callbackUrl: 'https://billing.arushafiber.co.tz/api/payments/pesapal/callback',
      ipnUrl: 'https://billing.arushafiber.co.tz/api/payments/pesapal/ipn',
    },
  });

  console.log('  ✅ Payment gateways created');

  // ============================================
  // 7. PROVISIONING RULES (link devices to plans)
  // ============================================
  console.log('🔗 Creating provisioning rules...');

  // DarNet provisioning rules - link MikroTik core router to plans via PPPoE
  for (const plan of allDarnetPlans) {
    await db.provisioningRule.create({
      data: {
        deviceId: darnetDevice1.id,
        planId: plan.id,
        planName: plan.name,
        speedDown: plan.speedDown,
        speedUp: plan.speedUp,
        dataCap: plan.dataCap,
        queueType: 'pcq',
        priority: 1,
        isActive: true,
      },
    });
  }

  // Link OLT devices to fiber plans
  for (const plan of allDarnetPlans.slice(2)) {
    await db.provisioningRule.create({
      data: {
        deviceId: darnetDevice4.id,
        planId: plan.id,
        planName: plan.name,
        speedDown: plan.speedDown,
        speedUp: plan.speedUp,
        queueType: 'simple',
        priority: 2,
        isActive: true,
      },
    });
    await db.provisioningRule.create({
      data: {
        deviceId: darnetDevice5.id,
        planId: plan.id,
        planName: plan.name,
        speedDown: plan.speedDown,
        speedUp: plan.speedUp,
        queueType: 'simple',
        priority: 2,
        isActive: true,
      },
    });
  }

  // Link 5G router to plans
  await db.provisioningRule.create({
    data: {
      deviceId: darnetDevice7.id,
      planId: allDarnetPlans[0].id,
      planName: allDarnetPlans[0].name,
      speedDown: allDarnetPlans[0].speedDown,
      speedUp: allDarnetPlans[0].speedUp,
      queueType: 'simple',
      priority: 1,
      isActive: true,
    },
  });

  // Arusha Fiber provisioning rules
  for (const plan of allArushaPlans) {
    await db.provisioningRule.create({
      data: {
        deviceId: arushaDevice1.id,
        planId: plan.id,
        planName: plan.name,
        speedDown: plan.speedDown,
        speedUp: plan.speedUp,
        queueType: 'pcq',
        priority: 1,
        isActive: true,
      },
    });
  }

  for (const plan of allArushaPlans.slice(1)) {
    await db.provisioningRule.create({
      data: {
        deviceId: arushaDevice3.id,
        planId: plan.id,
        planName: plan.name,
        speedDown: plan.speedDown,
        speedUp: plan.speedUp,
        queueType: 'simple',
        priority: 2,
        isActive: true,
      },
    });
  }

  console.log('  ✅ Provisioning rules created');

  // ============================================
  // 8. SUBSCRIPTIONS (14 per org, with PPPoE credentials)
  // ============================================
  console.log('📡 Creating subscriptions...');

  // DarNet Subscriptions
  const darnetSubscriptions: { id: string; customerId: string; planId: string; status: string; startDate: Date }[] = [];
  const darnetActiveCustomers = darnetCustomers.filter((_, i) => i < 15);
  const darnetSuspendedCustomers = darnetCustomers.filter((_, i) => i >= 12 && i < 15);
  const darnetTrialCustomers = darnetCustomers.filter((_, i) => i >= 15 && i < 18);

  let subCounter = 0;
  for (let i = 0; i < 14; i++) {
    const customer = darnetActiveCustomers[i];
    const plan = allDarnetPlans[i % 5];
    const device = pickRandom(darnetDevices.filter(d => d.category === 'router' || d.category === 'olt' || d.category === '5g_router' || d.category === 'radio'));
    const status = i < 11 ? 'active' : (i < 13 ? 'suspended' : 'active');
    const startDate = daysAgo(randomBetween(30, 365));

    const sub = await db.subscription.create({
      data: {
        organizationId: darnet.id,
        customerId: customer.id,
        planId: plan.id,
        deviceId: device.id,
        status,
        startDate,
        endDate: status === 'suspended' ? daysAgo(randomBetween(1, 15)) : undefined,
        billingCycle: pickRandom(['monthly', 'monthly', 'monthly', 'quarterly', 'yearly']),
        autoRenew: status === 'active',
        username: generatePPPoEUsername(customer.firstName, customer.lastName, 'darnet'),
        password: generatePPPoEPassword(),
        ipAssignment: `10.100.${Math.floor(i / 10)}.${(i % 10) * 10 + 2}`,
      },
    });
    darnetSubscriptions.push({ id: sub.id, customerId: customer.id, planId: plan.id, status, startDate });
    subCounter++;
  }

  // Arusha Fiber Subscriptions
  const arushaSubscriptions: { id: string; customerId: string; planId: string; status: string; startDate: Date }[] = [];
  const arushaActiveCustomers = arushaCustomers.filter((_, i) => i < 15);

  for (let i = 0; i < 13; i++) {
    const customer = arushaActiveCustomers[i];
    const plan = allArushaPlans[i % 5];
    const device = pickRandom(arushaDevices.filter(d => d.category === 'router' || d.category === 'olt' || d.category === '5g_router' || d.category === 'radio'));
    const status = i < 10 ? 'active' : (i < 12 ? 'suspended' : 'active');
    const startDate = daysAgo(randomBetween(30, 365));

    const sub = await db.subscription.create({
      data: {
        organizationId: arushafiber.id,
        customerId: customer.id,
        planId: plan.id,
        deviceId: device.id,
        status,
        startDate,
        endDate: status === 'suspended' ? daysAgo(randomBetween(1, 15)) : undefined,
        billingCycle: pickRandom(['monthly', 'monthly', 'monthly', 'quarterly']),
        autoRenew: status === 'active',
        username: generatePPPoEUsername(customer.firstName, customer.lastName, 'arushafiber'),
        password: generatePPPoEPassword(),
        ipAssignment: `10.200.${Math.floor(i / 10)}.${(i % 10) * 10 + 2}`,
      },
    });
    arushaSubscriptions.push({ id: sub.id, customerId: customer.id, planId: plan.id, status, startDate });
  }

  console.log(`  ✅ DarNet subscriptions: ${darnetSubscriptions.length}`);
  console.log(`  ✅ Arusha Fiber subscriptions: ${arushaSubscriptions.length}`);

  // ============================================
  // 9. USAGE RECORDS (30 days per active subscription, batched)
  // ============================================
  console.log('📊 Creating usage records (this may take a moment)...');

  const batchSize = 100;
  let totalUsageRecords = 0;

  // DarNet usage records
  for (const sub of darnetSubscriptions.filter(s => s.status === 'active')) {
    const plan = allDarnetPlans.find(p => p.id === sub.planId)!;
    const speedDownMbps = parseInt(plan.speedDown);
    const dailyMaxBytes = speedDownMbps * 1000000 * 3600 * 8; // 8 hours of peak usage
    const records: { organizationId: string; customerId: string; subscriptionId: string; date: Date; downloadBytes: number; uploadBytes: number; totalBytes: number; sessionTime: number }[] = [];

    for (let day = 29; day >= 0; day--) {
      const dl = randomBetween(
        Math.floor(dailyMaxBytes * 0.15),
        Math.floor(dailyMaxBytes * 0.75)
      );
      const ul = Math.floor(dl * randomFloat(0.15, 0.35));
      const sessionTime = randomBetween(28800, 72000); // 8-20 hours

      records.push({
        organizationId: darnet.id,
        customerId: sub.customerId,
        subscriptionId: sub.id,
        date: daysAgo(day),
        downloadBytes: dl,
        uploadBytes: ul,
        totalBytes: dl + ul,
        sessionTime,
      });
    }

    // Insert in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await db.usageRecord.createMany({ data: batch });
      totalUsageRecords += batch.length;
    }
  }

  // Arusha Fiber usage records
  for (const sub of arushaSubscriptions.filter(s => s.status === 'active')) {
    const plan = allArushaPlans.find(p => p.id === sub.planId)!;
    const speedDownMbps = parseInt(plan.speedDown);
    const dailyMaxBytes = speedDownMbps * 1000000 * 3600 * 8;
    const records: { organizationId: string; customerId: string; subscriptionId: string; date: Date; downloadBytes: number; uploadBytes: number; totalBytes: number; sessionTime: number }[] = [];

    for (let day = 29; day >= 0; day--) {
      const dl = randomBetween(
        Math.floor(dailyMaxBytes * 0.1),
        Math.floor(dailyMaxBytes * 0.65)
      );
      const ul = Math.floor(dl * randomFloat(0.15, 0.35));
      const sessionTime = randomBetween(25200, 68400);

      records.push({
        organizationId: arushafiber.id,
        customerId: sub.customerId,
        subscriptionId: sub.id,
        date: daysAgo(day),
        downloadBytes: dl,
        uploadBytes: ul,
        totalBytes: dl + ul,
        sessionTime,
      });
    }

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await db.usageRecord.createMany({ data: batch });
      totalUsageRecords += batch.length;
    }
  }

  console.log(`  ✅ Total usage records: ${totalUsageRecords}`);

  // ============================================
  // 10. INVOICES (3 months: Jan, Feb, Mar 2025)
  // ============================================
  console.log('🧾 Creating invoices...');

  const months = [
    { month: 1, year: 2025, label: 'Jan 2025' },
    { month: 2, year: 2025, label: 'Feb 2025' },
    { month: 3, year: 2025, label: 'Mar 2025' },
  ];

  const darnetInvoices: { id: string; customerId: string; subscriptionId: string; amount: number; status: string; dueDate: Date }[] = [];
  const arushaInvoices: { id: string; customerId: string; subscriptionId: string; amount: number; status: string; dueDate: Date }[] = [];

  // DarNet invoices
  let darnetInvIdx = 1;
  for (const monthData of months) {
    for (let i = 0; i < darnetSubscriptions.length; i++) {
      const sub = darnetSubscriptions[i];
      const plan = allDarnetPlans.find(p => p.id === sub.planId)!;
      let price: number;
      if (sub.status === 'active') {
        price = plan.priceMonthly;
      } else if (sub.status === 'suspended' && monthData.month === 3) {
        // Some suspended subs don't get invoices for recent months
        continue;
      } else {
        price = plan.priceMonthly;
      }

      const tax = price * 0.18;
      const total = price + tax;
      const dueDay = randomBetween(5, 28);
      const dueDate = new Date(monthData.year, monthData.month - 1, dueDay);

      // Determine status
      let status: string;
      if (monthData.year === 2025 && monthData.month === 1) {
        status = pickRandom(['paid', 'paid', 'paid', 'paid', 'paid', 'paid', 'paid', 'overdue', 'overdue']);
      } else if (monthData.year === 2025 && monthData.month === 2) {
        status = pickRandom(['paid', 'paid', 'paid', 'paid', 'paid', 'paid', 'overdue', 'pending', 'pending']);
      } else {
        status = pickRandom(['paid', 'paid', 'paid', 'pending', 'pending', 'pending', 'overdue', 'pending']);
      }

      const invoiceNumber = generateInvoiceNumber('DNT', monthData.month, monthData.year, darnetInvIdx);

      const invoice = await db.invoice.create({
        data: {
          organizationId: darnet.id,
          customerId: sub.customerId,
          subscriptionId: sub.id,
          invoiceNumber,
          status,
          subtotal: price,
          tax,
          discount: 0,
          total,
          dueDate,
          paidAt: status === 'paid' ? new Date(monthData.year, monthData.month - 1, randomBetween(1, dueDay)) : undefined,
          notes: status === 'overdue' ? 'Payment overdue - follow up required' : undefined,
          lineItems: {
            create: [
              {
                description: `${plan.name} - ${monthData.label}`,
                quantity: 1,
                unitPrice: price,
                total: price,
              },
            ],
          },
        },
      });

      darnetInvoices.push({
        id: invoice.id,
        customerId: sub.customerId,
        subscriptionId: sub.id,
        amount: total,
        status,
        dueDate,
      });
      darnetInvIdx++;
    }
  }

  // Arusha Fiber invoices
  let arushaInvIdx = 1;
  for (const monthData of months) {
    for (let i = 0; i < arushaSubscriptions.length; i++) {
      const sub = arushaSubscriptions[i];
      const plan = allArushaPlans.find(p => p.id === sub.planId)!;

      if (sub.status === 'suspended' && monthData.month === 3) {
        continue;
      }

      const price = plan.priceMonthly;
      const tax = price * 0.18;
      const total = price + tax;
      const dueDay = randomBetween(5, 28);
      const dueDate = new Date(monthData.year, monthData.month - 1, dueDay);

      let status: string;
      if (monthData.year === 2025 && monthData.month === 1) {
        status = pickRandom(['paid', 'paid', 'paid', 'paid', 'paid', 'paid', 'overdue', 'overdue']);
      } else if (monthData.year === 2025 && monthData.month === 2) {
        status = pickRandom(['paid', 'paid', 'paid', 'paid', 'paid', 'overdue', 'pending', 'pending']);
      } else {
        status = pickRandom(['paid', 'paid', 'pending', 'pending', 'pending', 'overdue', 'pending']);
      }

      const invoiceNumber = generateInvoiceNumber('AFB', monthData.month, monthData.year, arushaInvIdx);

      const invoice = await db.invoice.create({
        data: {
          organizationId: arushafiber.id,
          customerId: sub.customerId,
          subscriptionId: sub.id,
          invoiceNumber,
          status,
          subtotal: price,
          tax,
          discount: 0,
          total,
          dueDate,
          paidAt: status === 'paid' ? new Date(monthData.year, monthData.month - 1, randomBetween(1, dueDay)) : undefined,
          notes: status === 'overdue' ? 'Payment overdue - reminder sent' : undefined,
          lineItems: {
            create: [
              {
                description: `${plan.name} - ${monthData.label}`,
                quantity: 1,
                unitPrice: price,
                total: price,
              },
            ],
          },
        },
      });

      arushaInvoices.push({
        id: invoice.id,
        customerId: sub.customerId,
        subscriptionId: sub.id,
        amount: total,
        status,
        dueDate,
      });
      arushaInvIdx++;
    }
  }

  console.log(`  ✅ DarNet invoices: ${darnetInvoices.length}`);
  console.log(`  ✅ Arusha Fiber invoices: ${arushaInvoices.length}`);

  // ============================================
  // 11. PAYMENTS (mix of Pesapal + manual)
  // ============================================
  console.log('💰 Creating payments...');

  const pesapalMethods = ['M-PESA', 'AIRTEL MONEY', 'TIGO PESA'];
  const pesapalChannels = ['mpesa', 'airtel_money', 'tigo_pesa'];
  const manualMethods = [
    { method: 'cash', channel: null },
    { method: 'bank_transfer', channel: null },
    { method: 'mobile_money', channel: 'mpesa' },
    { method: 'mobile_money', channel: 'airtel_money' },
  ];

  // DarNet Pesapal payments (10 payments)
  for (let i = 0; i < 10; i++) {
    const paidInvoice = darnetInvoices.filter(inv => inv.status === 'paid')[i];
    if (!paidInvoice) break;

    const methodIdx = i % 3;
    const pesapalStatus = i >= 8 ? 'processing' : 'completed';

    await db.payment.create({
      data: {
        organizationId: darnet.id,
        customerId: paidInvoice.customerId,
        invoiceId: paidInvoice.id,
        amount: paidInvoice.amount,
        method: 'pesapal',
        paymentChannel: pesapalChannels[methodIdx],
        gateway: 'pesapal',
        pesapalTrackingId: `PSP-TZ-${randomBetween(100000, 999999)}`,
        pesapalMerchantRef: `ISP-DNT-${randomBetween(10000, 99999)}`,
        pesapalPaymentMethod: pesapalMethods[methodIdx],
        reference: `PES-${daysAgo(randomBetween(1, 90)).toISOString().slice(0, 10)}`,
        status: pesapalStatus,
        receiptNumber: pesapalStatus === 'completed' ? `RCP-${randomBetween(100000, 999999)}` : undefined,
        notes: pesapalStatus === 'processing' ? 'Payment initiated, awaiting confirmation' : null,
        paidAt: pesapalStatus === 'completed' ? daysAgo(randomBetween(1, 30)) : undefined,
      },
    });
  }

  // DarNet manual payments (8 payments)
  for (let i = 0; i < 8; i++) {
    const paidInvoice = darnetInvoices.filter(inv => inv.status === 'paid')[10 + i];
    if (!paidInvoice) break;

    const manual = pickRandom(manualMethods);

    await db.payment.create({
      data: {
        organizationId: darnet.id,
        customerId: paidInvoice.customerId,
        invoiceId: paidInvoice.id,
        amount: paidInvoice.amount,
        method: manual.method,
        paymentChannel: manual.channel,
        gateway: 'manual',
        reference: `${manual.method.toUpperCase()}-${randomBetween(100000, 999999)}`,
        status: 'completed',
        receiptNumber: `RCP-MNL-${randomBetween(100000, 999999)}`,
        paidAt: daysAgo(randomBetween(1, 60)),
        notes: manual.method === 'cash' ? 'Cash payment at office' : manual.method === 'bank_transfer' ? 'Bank transfer - CRDB' : 'Mobile money direct',
      },
    });
  }

  // Arusha Fiber Pesapal payments (8 payments)
  for (let i = 0; i < 8; i++) {
    const paidInvoice = arushaInvoices.filter(inv => inv.status === 'paid')[i];
    if (!paidInvoice) break;

    const methodIdx = i % 3;
    const pesapalStatus = i >= 6 ? 'processing' : 'completed';

    await db.payment.create({
      data: {
        organizationId: arushafiber.id,
        customerId: paidInvoice.customerId,
        invoiceId: paidInvoice.id,
        amount: paidInvoice.amount,
        method: 'pesapal',
        paymentChannel: pesapalChannels[methodIdx],
        gateway: 'pesapal',
        pesapalTrackingId: `PSP-TZ-${randomBetween(100000, 999999)}`,
        pesapalMerchantRef: `ISP-AFB-${randomBetween(10000, 99999)}`,
        pesapalPaymentMethod: pesapalMethods[methodIdx],
        reference: `PES-${daysAgo(randomBetween(1, 90)).toISOString().slice(0, 10)}`,
        status: pesapalStatus,
        receiptNumber: pesapalStatus === 'completed' ? `RCP-${randomBetween(100000, 999999)}` : undefined,
        notes: pesapalStatus === 'processing' ? 'Awaiting mobile money confirmation' : null,
        paidAt: pesapalStatus === 'completed' ? daysAgo(randomBetween(1, 30)) : undefined,
      },
    });
  }

  // Arusha Fiber manual payments (7 payments)
  for (let i = 0; i < 7; i++) {
    const paidInvoice = arushaInvoices.filter(inv => inv.status === 'paid')[8 + i];
    if (!paidInvoice) break;

    const manual = pickRandom(manualMethods);

    await db.payment.create({
      data: {
        organizationId: arushafiber.id,
        customerId: paidInvoice.customerId,
        invoiceId: paidInvoice.id,
        amount: paidInvoice.amount,
        method: manual.method,
        paymentChannel: manual.channel,
        gateway: 'manual',
        reference: `${manual.method.toUpperCase()}-${randomBetween(100000, 999999)}`,
        status: 'completed',
        receiptNumber: `RCP-MNL-${randomBetween(100000, 999999)}`,
        paidAt: daysAgo(randomBetween(1, 60)),
        notes: manual.method === 'cash' ? 'Cash payment at office' : manual.method === 'bank_transfer' ? 'Bank transfer - NMB' : 'Mobile money direct',
      },
    });
  }

  console.log('  ✅ DarNet payments: 18 (10 Pesapal + 8 manual)');
  console.log('  ✅ Arusha Fiber payments: 15 (8 Pesapal + 7 manual)');

  // ============================================
  // SUMMARY
  // ============================================
  console.log('');
  console.log('========================================');
  console.log('🌱 Seed completed successfully!');
  console.log('========================================');
  console.log('📊 Summary:');
  console.log(`  Organizations:        2`);
  console.log(`  Org Users:            6 (3 per org)`);
  console.log(`  Customers:            ${darnetCustomers.length + arushaCustomers.length} (${darnetCustomers.length} + ${arushaCustomers.length})`);
  console.log(`  Devices:              ${darnetDevices.length + arushaDevices.length} (${darnetDevices.length} + ${arushaDevices.length})`);
  console.log(`  Plans:                10 (5 per org)`);
  console.log(`  Payment Gateways:     2`);
  console.log(`  Subscriptions:        ${darnetSubscriptions.length + arushaSubscriptions.length} (${darnetSubscriptions.length} + ${arushaSubscriptions.length})`);
  console.log(`  Usage Records:        ${totalUsageRecords}`);
  console.log(`  Invoices:             ${darnetInvoices.length + arushaInvoices.length} (${darnetInvoices.length} + ${arushaInvoices.length})`);
  console.log(`  Payments:             33 (18 + 15)`);
  console.log('========================================');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

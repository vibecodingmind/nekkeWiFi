import { db } from '../src/lib/db';

// ─────────────────────────────────────────────────
// Helper utilities
// ─────────────────────────────────────────────────

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86400000);
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 86400000);
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals = 2): number {
  const val = Math.random() * (max - min) + min;
  return parseFloat(val.toFixed(decimals));
}

function generatePPPoEUsername(firstName: string, lastName: string, orgSlug: string): string {
  const clean = `${firstName.toLowerCase()}${lastName.toLowerCase()}`.replace(/[^a-z]/g, '');
  return `${clean}@${orgSlug}.co.tz`;
}

function generatePPPoEPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pass = '';
  for (let i = 0; i < 10; i++) pass += chars[randomBetween(0, chars.length - 1)];
  return pass;
}

function generateReceiptNumber(orgPrefix: string, index: number): string {
  return `RCP-${orgPrefix}-${String(index).padStart(5, '0')}`;
}

function generateInvoiceNumber(orgPrefix: string, month: number, year: number, index: number): string {
  return `INV-${orgPrefix}-${year}${String(month).padStart(2, '0')}-${String(index).padStart(4, '0')}`;
}

// ─────────────────────────────────────────────────
// Tanzanian names and addresses
// ─────────────────────────────────────────────────

const DAR_SALAAM_ADDRESSES = [
  '123 Ohio Street, City Centre',
  '45 Ali Hassan Mwinyi Road, Upanga',
  '78 Morocco Street, Magomeni',
  '12 Uhuru Street, Posta',
  '56 Sokoine Drive, Kivukoni',
  '90 Bagamoyo Road, Kinondoni',
  '34 Mwai Kibaki Road, Mikocheni',
  '67 Nelson Mandela Road, Msasani',
  '23 Julius Nyerere Road, Kariakoo',
  '88 Sam Nujoma Road, Mbagala',
  '15 Pugu Road, Njamese',
  '41 Kaunda Street, Kisutu',
  '67 Luthuli Street, Upanga West',
  '29 Msimbazi Street, Jangwani',
  '53 Barack Obama Drive, Oysterbay',
  '76 Mnazi Mmoja Road, Ilala',
  '18 Gerezani Street, Gerezani',
  '92 Tandale Road, Tandale',
  '7 Kijitonyama Road, Kijitonyama',
  '61 Maktaba Street, Buguruni',
];

const ARUSHA_ADDRESSES = [
  '14 Sokoine Road, Arusha Central',
  '38 Dodoma Road, Sekei',
  '52 Fire Road, Themi',
  '7 Goliondoi Street, Ngarenaro',
  '91 Moshi Road, Sakina',
  '26 Old Moshi Road, Kaloleni',
  '63 Kijenge Road, Kijenge',
  '45 Engiu Road, Moshono',
  '82 Arusha-Moshi Highway, Usa River',
  '19 Njiro Road, Njiro',
  '71 Lemara Road, Lemara',
  '33 Terrat Road, Olasiti',
  '55 Uhuru Road, Arusha CBD',
  '10 Serengeti Road, Sinoni',
  '47 Kijenge Juu, Kijenge',
  '68 Magomeni Road, Magomeni',
  '84 Mianzini Road, Mianzini',
  '22 Enaboishu Road, Enaboishu',
  '59 Sakina Road, Sakina',
  '16 Terrat Kaskazini, Terrat',
];

const TANZANIAN_FIRST_NAMES = [
  'Amani', 'Baraka', 'Charles', 'Daudi', 'Emmanuel', 'Fatima', 'Grace',
  'Halima', 'Ibrahim', 'Janeth', 'Joseph', 'Khadija', 'Lusajo',
  'Mariam', 'Neema', 'Omary', 'Peter', 'Qadir', 'Rehema', 'Samuel',
  'Tatu', 'Ussi', 'Violet', 'William', 'Yusuf', 'Zainab', 'Asha',
  'Benedict', 'Catherine', 'Daniel', 'Elizabeth', 'Farid', 'George',
  'Happiness', 'Isack', 'Jenipher', 'Kevin', 'Loyce', 'Moses',
  'Naomi', 'Obed', 'Prisca', 'Ramadhani', 'Stella', 'Thomas',
];

const TANZANIAN_LAST_NAMES = [
  'Mushi', 'Kimaro', 'Shayo', 'Mrema', 'Massawe', 'Mbwana', 'Semiono',
  'Mosha', 'Makoi', 'Temu', 'Kileo', 'Matonya', 'Mndeme', 'Mkude',
  'Mwalimu', 'Kyara', 'Mlacha', 'Moshi', 'Laizer', 'Olengurumwa',
  'Shirima', 'Gabriel', 'Mzigwa', 'Mbise', 'Mwenda', 'Chanyenga',
  'Mazara', 'Makene', 'Kaaya', 'Mfinanga', 'Mrema', 'Nkya',
  'Swai', 'Mushi', 'Kirobo', 'Mwankenja', 'Sanka', 'Kasuga',
  'Mbai', 'Matemu', 'Makalla', 'Kaduma',
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePhone(): string {
  const prefixes = ['0655', '0653', '0671', '0672', '0673', '0674', '0675', '0676', '0677', '0678', '0656', '0658', '0682', '0683', '0684', '0685', '0686', '0612', '0613'];
  const prefix = pickRandom(prefixes);
  const num = String(randomBetween(1000000, 9999999));
  return `+255 ${prefix} ${num}`;
}

// ─────────────────────────────────────────────────
// Main seed function
// ─────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting ISP Billing Platform seed...\n');

  try {
    // ==================================================
    // 1. ORGANIZATIONS
    // ==================================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Step 1: Creating Organizations...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const orgDarNet = await db.organization.create({
      data: {
        name: 'DarNet ISP',
        slug: 'darnet',
        logo: null,
        email: 'admin@darnet.co.tz',
        phone: '+255 22 123 4567',
        address: '12 Ohio Street, City Centre, Dar es Salaam',
        country: 'Tanzania',
        currency: 'TZS',
        taxRate: 18.0,
        isActive: true,
      },
    });
    console.log(`  ✅ Created organization: ${orgDarNet.name} (${orgDarNet.id})`);

    const orgArushaFiber = await db.organization.create({
      data: {
        name: 'Arusha Fiber',
        slug: 'arushafiber',
        logo: null,
        email: 'info@arushafiber.co.tz',
        phone: '+255 27 987 6543',
        address: '14 Sokoine Road, Arusha Central, Arusha',
        country: 'Tanzania',
        currency: 'TZS',
        taxRate: 18.0,
        isActive: true,
      },
    });
    console.log(`  ✅ Created organization: ${orgArushaFiber.name} (${orgArushaFiber.id})`);

    // ==================================================
    // 2. ORG USERS
    // ==================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Step 2: Creating Organization Users...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const darnetUsers = await db.$transaction([
      db.orgUser.create({
        data: {
          organizationId: orgDarNet.id,
          name: 'Amiri Juma',
          email: 'amiri.juma@darnet.co.tz',
          password: '$2b$10$hashed_admin_password_here',
          role: 'admin',
          isActive: true,
          lastLoginAt: daysAgo(0.5),
        },
      }),
      db.orgUser.create({
        data: {
          organizationId: orgDarNet.id,
          name: 'Rehema Kimaro',
          email: 'rehema.kimaro@darnet.co.tz',
          password: '$2b$10$hashed_agent_password_here',
          role: 'agent',
          isActive: true,
          lastLoginAt: daysAgo(1),
        },
      }),
      db.orgUser.create({
        data: {
          organizationId: orgDarNet.id,
          name: 'Thomas Mushi',
          email: 'thomas.mushi@darnet.co.tz',
          password: '$2b$10$hashed_viewer_password_here',
          role: 'viewer',
          isActive: true,
          lastLoginAt: daysAgo(3),
        },
      }),
    ]);
    darnetUsers.forEach(u => console.log(`  ✅ DarNet user: ${u.name} (${u.role})`));

    const arushaUsers = await db.$transaction([
      db.orgUser.create({
        data: {
          organizationId: orgArushaFiber.id,
          name: 'Grace Laizer',
          email: 'grace.laizer@arushafiber.co.tz',
          password: '$2b$10$hashed_admin_password_here',
          role: 'admin',
          isActive: true,
          lastLoginAt: daysAgo(0.2),
        },
      }),
      db.orgUser.create({
        data: {
          organizationId: orgArushaFiber.id,
          name: 'Ibrahim Temu',
          email: 'ibrahim.temu@arushafiber.co.tz',
          password: '$2b$10$hashed_agent_password_here',
          role: 'agent',
          isActive: true,
          lastLoginAt: daysAgo(2),
        },
      }),
      db.orgUser.create({
        data: {
          organizationId: orgArushaFiber.id,
          name: 'Asha Mndeme',
          email: 'asha.mndeme@arushafiber.co.tz',
          password: '$2b$10$hashed_viewer_password_here',
          role: 'viewer',
          isActive: true,
          lastLoginAt: daysAgo(5),
        },
      }),
    ]);
    arushaUsers.forEach(u => console.log(`  ✅ Arusha Fiber user: ${u.name} (${u.role})`));

    // ==================================================
    // 3. CUSTOMERS
    // ==================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Step 3: Creating Customers...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const darnetCustomerData = [
      { first: 'Baraka', last: 'Shayo', status: 'active', email: 'baraka.shayo@gmail.com' },
      { first: 'Fatima', last: 'Massawe', status: 'active', email: 'fatima.massawe@yahoo.com' },
      { first: 'Daudi', last: 'Mrema', status: 'active', email: null },
      { first: 'Halima', last: 'Mbwana', status: 'active', email: 'halima.mbwana@hotmail.com' },
      { first: 'Joseph', last: 'Semiono', status: 'suspended', email: 'joseph.semiono@gmail.com' },
      { first: 'Lusajo', last: 'Mosha', status: 'active', email: 'lusajo.mosha@gmail.com' },
      { first: 'Neema', last: 'Makoi', status: 'trial', email: 'neema.makoi@yahoo.com' },
      { first: 'Peter', last: 'Temu', status: 'active', email: 'peter.temu@gmail.com' },
      { first: 'Rehema', last: 'Kileo', status: 'active', email: null },
      { first: 'Samuel', last: 'Matonya', status: 'active', email: 'samuel.matonya@hotmail.com' },
      { first: 'Ussi', last: 'Mndeme', status: 'suspended', email: null },
      { first: 'William', last: 'Mkude', status: 'active', email: 'william.mkude@gmail.com' },
      { first: 'Yusuf', last: 'Mwalimu', status: 'active', email: 'yusuf.mwalimu@yahoo.com' },
      { first: 'Zainab', last: 'Kyara', status: 'trial', email: 'zainab.kyara@gmail.com' },
      { first: 'Asha', last: 'Mlacha', status: 'active', email: null },
      { first: 'George', last: 'Moshi', status: 'active', email: 'george.moshi@gmail.com' },
      { first: 'Happiness', last: 'Laizer', status: 'active', email: 'happiness.laizer@yahoo.com' },
      { first: 'Kevin', last: 'Olengurumwa', status: 'suspended', email: null },
    ];

    const darnetCustomers: Array<Awaited<ReturnType<typeof db.customer.create>>> = [];
    for (let i = 0; i < darnetCustomerData.length; i++) {
      const c = darnetCustomerData[i];
      const customer = await db.customer.create({
        data: {
          organizationId: orgDarNet.id,
          firstName: c.first,
          lastName: c.last,
          email: c.email,
          phone: generatePhone(),
          address: DAR_SALAAM_ADDRESSES[i % DAR_SALAAM_ADDRESSES.length],
          city: 'Dar es Salaam',
          region: 'Dar es Salaam',
          status: c.status,
          balance: c.status === 'suspended' ? -randomBetween(20000, 80000) : randomBetween(0, 5000),
          notes: c.status === 'trial' ? 'Trial customer - started 7 days ago' : null,
          createdAt: daysAgo(randomBetween(30, 365)),
        },
      });
      darnetCustomers.push(customer);
    }
    console.log(`  ✅ Created ${darnetCustomers.length} DarNet customers`);

    const arushaCustomerData = [
      { first: 'Emmanuel', last: 'Shirima', status: 'active', email: 'emma.shirima@gmail.com' },
      { first: 'Mariam', last: 'Gabriel', status: 'active', email: 'mariam.gabriel@yahoo.com' },
      { first: 'Charles', last: 'Mzigwa', status: 'active', email: null },
      { first: 'Janeth', last: 'Mbise', status: 'active', email: 'janeth.mbise@gmail.com' },
      { first: 'Khadija', last: 'Mwenda', status: 'active', email: 'khadija.mwenda@hotmail.com' },
      { first: 'Omary', last: 'Chanyenga', status: 'suspended', email: null },
      { first: 'Tatu', last: 'Mazara', status: 'active', email: 'tatu.mazara@gmail.com' },
      { first: 'Violet', last: 'Makene', status: 'trial', email: 'violet.makene@yahoo.com' },
      { first: 'Daniel', last: 'Kaaya', status: 'active', email: 'daniel.kaaya@gmail.com' },
      { first: 'Farid', last: 'Mfinanga', status: 'active', email: null },
      { first: 'Catherine', last: 'Nkya', status: 'active', email: 'catherine.nkya@hotmail.com' },
      { first: 'Isack', last: 'Swai', status: 'active', email: 'isack.swai@gmail.com' },
      { first: 'Jenipher', last: 'Kirobo', status: 'active', email: null },
      { first: 'Loyce', last: 'Mwankenja', status: 'suspended', email: 'loyce.mwankenja@yahoo.com' },
      { first: 'Moses', last: 'Sanka', status: 'active', email: 'moses.sanka@gmail.com' },
      { first: 'Naomi', last: 'Kasuga', status: 'active', email: 'naomi.kasuga@hotmail.com' },
      { first: 'Prisca', last: 'Mbai', status: 'active', email: null },
      { first: 'Ramadhani', last: 'Matemu', status: 'trial', email: 'ramadhani.matemu@gmail.com' },
      { first: 'Stella', last: 'Makalla', status: 'active', email: 'stella.makalla@yahoo.com' },
      { first: 'Benedict', last: 'Kaduma', status: 'active', email: 'benedict.kaduma@gmail.com' },
    ];

    const arushaCustomers: Array<Awaited<ReturnType<typeof db.customer.create>>> = [];
    for (let i = 0; i < arushaCustomerData.length; i++) {
      const c = arushaCustomerData[i];
      const customer = await db.customer.create({
        data: {
          organizationId: orgArushaFiber.id,
          firstName: c.first,
          lastName: c.last,
          email: c.email,
          phone: generatePhone(),
          address: ARUSHA_ADDRESSES[i % ARUSHA_ADDRESSES.length],
          city: 'Arusha',
          region: 'Arusha',
          status: c.status,
          balance: c.status === 'suspended' ? -randomBetween(25000, 90000) : randomBetween(0, 5000),
          notes: c.status === 'trial' ? 'Trial customer - started 5 days ago' : null,
          createdAt: daysAgo(randomBetween(25, 350)),
        },
      });
      arushaCustomers.push(customer);
    }
    console.log(`  ✅ Created ${arushaCustomers.length} Arusha Fiber customers`);

    // ==================================================
    // 4. NETWORK DEVICES + INTERFACES
    // ==================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Step 4: Creating Network Devices...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // DarNet Devices
    const darnetDevices: Array<Awaited<ReturnType<typeof db.device.create>>> = [];

    const darnetDevice1 = await db.device.create({
      data: {
        organizationId: orgDarNet.id,
        name: 'DarNet-MikroTik-CCR1009-Core',
        type: 'mikrotik',
        model: 'CCR1009-7G-1C-1C+',
        ipAddress: '192.168.1.1',
        port: 8728,
        apiUser: 'admin',
        apiPassword: 'SecureP@ss2024!',
        firmware: 'RouterOS 7.14.3',
        serialNumber: 'HE50893ZBKG',
        location: 'DarNet NOC, Ohio Street, Dar es Salaam',
        status: 'online',
        lastSeenAt: daysAgo(0.01),
        totalBandwidth: '1Gbps',
        interfaces: {
          create: [
            { name: 'ether1', type: 'ethernet', macAddress: 'E4:8D:8C:3A:11:01', status: 'up', speed: '1Gbps', rxBytes: 45_892_301_056, txBytes: 12_456_780_224 },
            { name: 'ether2', type: 'ethernet', macAddress: 'E4:8D:8C:3A:11:02', status: 'up', speed: '1Gbps', rxBytes: 38_234_561_024, txBytes: 9_876_543_210 },
            { name: 'sfp1', type: 'sfp', macAddress: 'E4:8D:8C:3A:11:03', status: 'up', speed: '10Gbps', rxBytes: 156_789_012_345, txBytes: 89_012_345_678 },
            { name: 'ether7', type: 'ethernet', macAddress: 'E4:8D:8C:3A:11:07', status: 'down', speed: '1Gbps', rxBytes: 0, txBytes: 0 },
          ],
        },
      },
    });
    darnetDevices.push(darnetDevice1);

    const darnetDevice2 = await db.device.create({
      data: {
        organizationId: orgDarNet.id,
        name: 'DarNet-MikroTik-CCR1009-Distribution',
        type: 'mikrotik',
        model: 'CCR1009-7G-1C-1C+',
        ipAddress: '192.168.2.1',
        port: 8728,
        apiUser: 'admin',
        apiPassword: 'DstrP@ss2024!',
        firmware: 'RouterOS 7.14.3',
        serialNumber: 'HE50894ZBKH',
        location: 'DarNet POP Kijitonyama, Dar es Salaam',
        status: 'online',
        lastSeenAt: daysAgo(0.02),
        totalBandwidth: '1Gbps',
        interfaces: {
          create: [
            { name: 'ether1', type: 'ethernet', macAddress: 'E4:8D:8C:3B:22:01', status: 'up', speed: '1Gbps', rxBytes: 32_456_789_012, txBytes: 8_765_432_100 },
            { name: 'ether2', type: 'ethernet', macAddress: 'E4:8D:8C:3B:22:02', status: 'up', speed: '1Gbps', rxBytes: 28_901_234_567, txBytes: 7_654_321_098 },
            { name: 'ether3', type: 'ethernet', macAddress: 'E4:8D:8C:3B:22:03', status: 'up', speed: '1Gbps', rxBytes: 21_345_678_901, txBytes: 5_432_109_876 },
          ],
        },
      },
    });
    darnetDevices.push(darnetDevice2);

    const darnetDevice3 = await db.device.create({
      data: {
        organizationId: orgDarNet.id,
        name: 'DarNet-TP-Link-EAP660-Office',
        type: 'tplink',
        model: 'EAP660 HD',
        ipAddress: '192.168.1.10',
        port: 80,
        apiUser: 'admin',
        apiPassword: 'TpLinkAdm1n!',
        firmware: '3.0.3 Build 20231130',
        serialNumber: '2453TL0689001',
        location: 'DarNet Office, Ohio Street, Dar es Salaam',
        status: 'online',
        lastSeenAt: daysAgo(0.05),
        totalBandwidth: '2.4Gbps',
        interfaces: {
          create: [
            { name: 'eth0', type: 'ethernet', macAddress: 'A0:CE:C8:1D:45:01', status: 'up', speed: '1Gbps', rxBytes: 5_678_901_234, txBytes: 2_345_678_901 },
            { name: 'wlan0', type: 'wireless', macAddress: 'A0:CE:C8:1D:45:02', status: 'up', speed: '1.8Gbps', rxBytes: 3_456_789_012, txBytes: 1_234_567_890 },
          ],
        },
      },
    });
    darnetDevices.push(darnetDevice3);

    const darnetDevice4 = await db.device.create({
      data: {
        organizationId: orgDarNet.id,
        name: 'DarNet-UniFi-Gateway-Pro',
        type: 'ubiquiti',
        model: 'UniFi Dream Machine Pro',
        ipAddress: '192.168.1.254',
        port: 443,
        apiUser: 'ubnt',
        apiPassword: 'UniFiS3cure!',
        firmware: '8.0.26',
        serialNumber: 'FC8C188XXXXX',
        location: 'DarNet NOC, Ohio Street, Dar es Salaam',
        status: 'warning',
        lastSeenAt: daysAgo(0.5),
        totalBandwidth: '2.5Gbps',
        interfaces: {
          create: [
            { name: 'eth0', type: 'ethernet', macAddress: '78:8A:20:1C:F4:01', status: 'up', speed: '1Gbps', rxBytes: 89_012_345_678, txBytes: 45_678_901_234 },
            { name: 'eth1', type: 'ethernet', macAddress: '78:8A:20:1C:F4:02', status: 'up', speed: '1Gbps', rxBytes: 67_890_123_456, txBytes: 34_567_890_123 },
            { name: 'eth2', type: 'ethernet', macAddress: '78:8A:20:1C:F4:03', status: 'down', speed: '1Gbps', rxBytes: 0, txBytes: 0 },
            { name: 'sfp0', type: 'sfp', macAddress: '78:8A:20:1C:F4:04', status: 'up', speed: '10Gbps', rxBytes: 234_567_890_123, txBytes: 123_456_789_012 },
          ],
        },
      },
    });
    darnetDevices.push(darnetDevice4);

    darnetDevices.forEach(d => console.log(`  ✅ DarNet device: ${d.name} [${d.status}]`));

    // Arusha Fiber Devices
    const arushaDevices: Array<Awaited<ReturnType<typeof db.device.create>>> = [];

    const arushaDevice1 = await db.device.create({
      data: {
        organizationId: orgArushaFiber.id,
        name: 'ArushaFiber-MikroTik-CCR1009-Main',
        type: 'mikrotik',
        model: 'CCR1009-7G-1C-1C+',
        ipAddress: '10.0.0.1',
        port: 8728,
        apiUser: 'admin',
        apiPassword: 'AFSecure!2024',
        firmware: 'RouterOS 7.15.1',
        serialNumber: 'HG71294ZCKN',
        location: 'Arusha Fiber NOC, Sokoine Road, Arusha',
        status: 'online',
        lastSeenAt: daysAgo(0.01),
        totalBandwidth: '1Gbps',
        interfaces: {
          create: [
            { name: 'ether1', type: 'ethernet', macAddress: 'F0:B4:D2:4C:91:01', status: 'up', speed: '1Gbps', rxBytes: 56_789_012_345, txBytes: 15_678_901_234 },
            { name: 'ether2', type: 'ethernet', macAddress: 'F0:B4:D2:4C:91:02', status: 'up', speed: '1Gbps', rxBytes: 41_234_567_890, txBytes: 11_234_567_890 },
            { name: 'sfp1', type: 'sfp', macAddress: 'F0:B4:D2:4C:91:03', status: 'up', speed: '10Gbps', rxBytes: 178_901_234_567, txBytes: 92_345_678_901 },
            { name: 'ether3', type: 'ethernet', macAddress: 'F0:B4:D2:4C:91:04', status: 'up', speed: '1Gbps', rxBytes: 19_876_543_210, txBytes: 5_432_109_876 },
          ],
        },
      },
    });
    arushaDevices.push(arushaDevice1);

    const arushaDevice2 = await db.device.create({
      data: {
        organizationId: orgArushaFiber.id,
        name: 'ArushaFiber-MikroTik-CCR1009-Branch',
        type: 'mikrotik',
        model: 'CCR1009-7G-1C-1C+',
        ipAddress: '10.0.1.1',
        port: 8728,
        apiUser: 'admin',
        apiPassword: 'AFBranch!2024',
        firmware: 'RouterOS 7.15.1',
        serialNumber: 'HG71295ZCKO',
        location: 'Arusha Fiber Branch, Usa River',
        status: 'online',
        lastSeenAt: daysAgo(0.03),
        totalBandwidth: '1Gbps',
        interfaces: {
          create: [
            { name: 'ether1', type: 'ethernet', macAddress: 'F0:B4:D2:4D:AA:01', status: 'up', speed: '1Gbps', rxBytes: 23_456_789_012, txBytes: 6_789_012_345 },
            { name: 'ether2', type: 'ethernet', macAddress: 'F0:B4:D2:4D:AA:02', status: 'up', speed: '1Gbps', rxBytes: 18_765_432_109, txBytes: 5_432_109_876 },
          ],
        },
      },
    });
    arushaDevices.push(arushaDevice2);

    const arushaDevice3 = await db.device.create({
      data: {
        organizationId: orgArushaFiber.id,
        name: 'ArushaFiber-TP-Link-EAP660-Lobby',
        type: 'tplink',
        model: 'EAP660 HD',
        ipAddress: '10.0.0.10',
        port: 80,
        apiUser: 'admin',
        apiPassword: 'AFtpLink!2024',
        firmware: '3.0.3 Build 20231130',
        serialNumber: '2453TL0912005',
        location: 'Arusha Fiber Office, Sokoine Road, Arusha',
        status: 'offline',
        lastSeenAt: daysAgo(2),
        totalBandwidth: '2.4Gbps',
        interfaces: {
          create: [
            { name: 'eth0', type: 'ethernet', macAddress: 'B0:CE:C8:2E:56:01', status: 'down', speed: '1Gbps', rxBytes: 2_345_678_901, txBytes: 987_654_321 },
            { name: 'wlan0', type: 'wireless', macAddress: 'B0:CE:C8:2E:56:02', status: 'down', speed: '1.8Gbps', rxBytes: 1_234_567_890, txBytes: 567_890_123 },
          ],
        },
      },
    });
    arushaDevices.push(arushaDevice3);

    const arushaDevice4 = await db.device.create({
      data: {
        organizationId: orgArushaFiber.id,
        name: 'ArushaFiber-UniFi-AP-AC-Pro',
        type: 'ubiquiti',
        model: 'UniFi AP AC Pro',
        ipAddress: '10.0.0.20',
        port: 443,
        apiUser: 'ubnt',
        apiPassword: 'AFUniFi!2024',
        firmware: '6.6.65',
        serialNumber: 'FC8C19XXXXX2',
        location: 'Arusha Fiber NOC, Sokoine Road, Arusha',
        status: 'online',
        lastSeenAt: daysAgo(0.04),
        totalBandwidth: '1.3Gbps',
        interfaces: {
          create: [
            { name: 'eth0', type: 'ethernet', macAddress: '78:8A:20:2D:E5:01', status: 'up', speed: '1Gbps', rxBytes: 12_345_678_901, txBytes: 4_567_890_123 },
            { name: 'wlan0', type: 'wireless', macAddress: '78:8A:20:2D:E5:02', status: 'up', speed: '1.3Gbps', rxBytes: 8_901_234_567, txBytes: 3_456_789_012 },
          ],
        },
      },
    });
    arushaDevices.push(arushaDevice4);

    arushaDevices.forEach(d => console.log(`  ✅ Arusha Fiber device: ${d.name} [${d.status}]`));

    // ==================================================
    // 5. PLANS
    // ==================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Step 5: Creating Plans...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const darnetPlans = await db.$transaction([
      db.plan.create({
        data: {
          organizationId: orgDarNet.id,
          name: 'Basic 5Mbps',
          description: 'Perfect for light browsing and email. Includes 50GB monthly data cap.',
          speedDown: '5Mbps',
          speedUp: '2Mbps',
          dataCap: 51200, // 50GB in MB
          priceMonthly: 20000,
          priceQuarterly: 56000,
          priceYearly: null,
          setupFee: 15000,
          isActive: true,
          isPopular: false,
        },
      }),
      db.plan.create({
        data: {
          organizationId: orgDarNet.id,
          name: 'Standard 10Mbps',
          description: 'Great for streaming and video calls. Unlimited data.',
          speedDown: '10Mbps',
          speedUp: '5Mbps',
          dataCap: null, // unlimited
          priceMonthly: 40000,
          priceQuarterly: 112000,
          priceYearly: 420000,
          setupFee: 20000,
          isActive: true,
          isPopular: true, // Most popular
        },
      }),
      db.plan.create({
        data: {
          organizationId: orgDarNet.id,
          name: 'Premium 25Mbps',
          description: 'Ideal for families and home offices. Unlimited data.',
          speedDown: '25Mbps',
          speedUp: '10Mbps',
          dataCap: null,
          priceMonthly: 80000,
          priceQuarterly: 224000,
          priceYearly: 840000,
          setupFee: 25000,
          isActive: true,
          isPopular: false,
        },
      }),
      db.plan.create({
        data: {
          organizationId: orgDarNet.id,
          name: 'Business 50Mbps',
          description: 'Reliable connection for small businesses. Unlimited data with priority support.',
          speedDown: '50Mbps',
          speedUp: '25Mbps',
          dataCap: null,
          priceMonthly: 150000,
          priceQuarterly: 420000,
          priceYearly: 1560000,
          setupFee: 50000,
          isActive: true,
          isPopular: false,
        },
      }),
      db.plan.create({
        data: {
          organizationId: orgDarNet.id,
          name: 'Enterprise 100Mbps',
          description: 'High-performance fiber for enterprises. Unlimited data with SLA guarantee.',
          speedDown: '100Mbps',
          speedUp: '50Mbps',
          dataCap: null,
          priceMonthly: 300000,
          priceQuarterly: 840000,
          priceYearly: 3000000, // 3000 per month * 10 months discount
          setupFee: 100000,
          isActive: true,
          isPopular: false,
        },
      }),
    ]);
    darnetPlans.forEach(p => console.log(`  ✅ DarNet plan: ${p.name} - TZS ${p.priceMonthly.toLocaleString()}/mo`));

    const arushaPlans = await db.$transaction([
      db.plan.create({
        data: {
          organizationId: orgArushaFiber.id,
          name: 'Fiber Basic 5Mbps',
          description: 'Affordable fiber for basic internet needs. 50GB monthly data.',
          speedDown: '5Mbps',
          speedUp: '2Mbps',
          dataCap: 51200, // 50GB
          priceMonthly: 20000,
          priceQuarterly: 55000,
          priceYearly: null,
          setupFee: 10000,
          isActive: true,
          isPopular: false,
        },
      }),
      db.plan.create({
        data: {
          organizationId: orgArushaFiber.id,
          name: 'Fiber Standard 10Mbps',
          description: 'Popular plan for home users. Unlimited fiber.',
          speedDown: '10Mbps',
          speedUp: '5Mbps',
          dataCap: null,
          priceMonthly: 40000,
          priceQuarterly: 110000,
          priceYearly: 400000,
          setupFee: 15000,
          isActive: true,
          isPopular: false,
        },
      }),
      db.plan.create({
        data: {
          organizationId: orgArushaFiber.id,
          name: 'Fiber Premium 25Mbps',
          description: 'Best value for streaming and work from home. Unlimited fiber.',
          speedDown: '25Mbps',
          speedUp: '10Mbps',
          dataCap: null,
          priceMonthly: 80000,
          priceQuarterly: 220000,
          priceYearly: 820000,
          setupFee: 20000,
          isActive: true,
          isPopular: true, // Most popular
        },
      }),
      db.plan.create({
        data: {
          organizationId: orgArushaFiber.id,
          name: 'Fiber Business 50Mbps',
          description: 'Dedicated fiber for businesses with priority support.',
          speedDown: '50Mbps',
          speedUp: '25Mbps',
          dataCap: null,
          priceMonthly: 150000,
          priceQuarterly: 415000,
          priceYearly: 1550000,
          setupFee: 40000,
          isActive: true,
          isPopular: false,
        },
      }),
      db.plan.create({
        data: {
          organizationId: orgArushaFiber.id,
          name: 'Fiber Enterprise 100Mbps',
          description: 'Enterprise-grade fiber with SLA. 2 free months on yearly billing.',
          speedDown: '100Mbps',
          speedUp: '50Mbps',
          dataCap: null,
          priceMonthly: 300000,
          priceQuarterly: 840000,
          priceYearly: 3000000, // 2 months free
          setupFee: 75000,
          isActive: true,
          isPopular: false,
        },
      }),
    ]);
    arushaPlans.forEach(p => console.log(`  ✅ Arusha Fiber plan: ${p.name} - TZS ${p.priceMonthly.toLocaleString()}/mo`));

    // ==================================================
    // 6. PROVISIONING RULES
    // ==================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Step 6: Creating Provisioning Rules...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // DarNet provisioning rules - link first MikroTik to all plans
    const darnetProvisioningRules = [];
    for (let i = 0; i < darnetPlans.length; i++) {
      const rule = await db.provisioningRule.create({
        data: {
          deviceId: darnetDevices[0].id,
          planId: darnetPlans[i].id,
          planName: darnetPlans[i].name,
          speedDown: darnetPlans[i].speedDown,
          speedUp: darnetPlans[i].speedUp,
          dataCap: darnetPlans[i].dataCap,
          queueType: i >= 3 ? 'pcq' : 'simple',
          priority: i + 1,
          isActive: true,
        },
      });
      darnetProvisioningRules.push(rule);
    }

    // Also link second MikroTik to some plans
    for (let i = 0; i < 3; i++) {
      const rule = await db.provisioningRule.create({
        data: {
          deviceId: darnetDevices[1].id,
          planId: darnetPlans[i].id,
          planName: darnetPlans[i].name,
          speedDown: darnetPlans[i].speedDown,
          speedUp: darnetPlans[i].speedUp,
          dataCap: darnetPlans[i].dataCap,
          queueType: 'simple',
          priority: i + 1,
          isActive: true,
        },
      });
      darnetProvisioningRules.push(rule);
    }

    console.log(`  ✅ Created ${darnetProvisioningRules.length} DarNet provisioning rules`);

    // Arusha Fiber provisioning rules
    const arushaProvisioningRules = [];
    for (let i = 0; i < arushaPlans.length; i++) {
      const rule = await db.provisioningRule.create({
        data: {
          deviceId: arushaDevices[0].id,
          planId: arushaPlans[i].id,
          planName: arushaPlans[i].name,
          speedDown: arushaPlans[i].speedDown,
          speedUp: arushaPlans[i].speedUp,
          dataCap: arushaPlans[i].dataCap,
          queueType: i >= 3 ? 'pcq' : 'simple',
          priority: i + 1,
          isActive: true,
        },
      });
      arushaProvisioningRules.push(rule);
    }

    // Link branch MikroTik to first 3 plans
    for (let i = 0; i < 3; i++) {
      const rule = await db.provisioningRule.create({
        data: {
          deviceId: arushaDevices[1].id,
          planId: arushaPlans[i].id,
          planName: arushaPlans[i].name,
          speedDown: arushaPlans[i].speedDown,
          speedUp: arushaPlans[i].speedUp,
          dataCap: arushaPlans[i].dataCap,
          queueType: 'simple',
          priority: i + 1,
          isActive: true,
        },
      });
      arushaProvisioningRules.push(rule);
    }

    console.log(`  ✅ Created ${arushaProvisioningRules.length} Arusha Fiber provisioning rules`);

    // ==================================================
    // 7. SUBSCRIPTIONS
    // ==================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Step 7: Creating Subscriptions...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Helper to create subscriptions for an org
    async function createOrgSubscriptions(
      orgId: string,
      customers: Array<{ id: string; status: string; firstName: string; lastName: string }>,
      plans: Array<{ id: string; priceMonthly: number }>,
      devices: Array<{ id: string }>,
      orgSlug: string,
      maxSubs: number,
    ) {
      const subscriptions: Array<Awaited<ReturnType<typeof db.subscription.create>>> = [];
      const activeCustomers = customers.filter(c => c.status === 'active' || c.status === 'trial');
      const suspendedCustomers = customers.filter(c => c.status === 'suspended');

      // Active/trial subscriptions
      for (let i = 0; i < Math.min(activeCustomers.length, maxSubs - 3); i++) {
        const customer = activeCustomers[i];
        const planIdx = i % plans.length;
        const plan = plans[planIdx];
        const deviceIdx = i % devices.length;
        const isTrial = customer.status === 'trial';
        const startDaysAgo = isTrial ? randomBetween(3, 10) : randomBetween(30, 300);
        const pppoeUser = generatePPPoEUsername(customer.firstName, customer.lastName, orgSlug);
        const pppoePass = generatePPPoEPassword();

        const subscription = await db.subscription.create({
          data: {
            organizationId: orgId,
            customerId: customer.id,
            planId: plan.id,
            deviceId: devices[deviceIdx].id,
            status: isTrial ? 'active' : 'active',
            startDate: daysAgo(startDaysAgo),
            endDate: null,
            billingCycle: planIdx >= 4 ? 'yearly' : planIdx >= 2 ? 'quarterly' : 'monthly',
            autoRenew: true,
            username: pppoeUser,
            password: pppoePass,
            ipAssignment: `10.${orgSlug === 'darnet' ? '50' : '100'}.${Math.floor(i / 256)}.${(i % 254) + 2}`,
            notes: isTrial ? `Trial subscription - plan: ${plan.name}` : null,
          },
        });
        subscriptions.push(subscription);
      }

      // Suspended subscriptions
      for (const customer of suspendedCustomers) {
        const plan = plans[randomBetween(0, plans.length - 1)];
        const device = devices[randomBetween(0, devices.length - 1)];
        const pppoeUser = generatePPPoEUsername(customer.firstName, customer.lastName, orgSlug);
        const pppoePass = generatePPPoEPassword();

        const subscription = await db.subscription.create({
          data: {
            organizationId: orgId,
            customerId: customer.id,
            planId: plan.id,
            deviceId: device.id,
            status: 'suspended',
            startDate: daysAgo(randomBetween(60, 200)),
            endDate: null,
            billingCycle: 'monthly',
            autoRenew: false,
            username: pppoeUser,
            password: pppoePass,
            notes: 'Suspended due to non-payment',
          },
        });
        subscriptions.push(subscription);
      }

      return subscriptions;
    }

    const darnetSubscriptions = await createOrgSubscriptions(
      orgDarNet.id,
      darnetCustomers,
      darnetPlans,
      darnetDevices,
      'darnet',
      14,
    );
    console.log(`  ✅ Created ${darnetSubscriptions.length} DarNet subscriptions`);

    const arushaSubscriptions = await createOrgSubscriptions(
      orgArushaFiber.id,
      arushaCustomers,
      arushaPlans,
      arushaDevices,
      'arushafiber',
      15,
    );
    console.log(`  ✅ Created ${arushaSubscriptions.length} Arusha Fiber subscriptions`);

    // ==================================================
    // 8. USAGE RECORDS
    // ==================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Step 8: Creating Usage Records (30 days per active subscription)...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    let totalUsageRecords = 0;

    async function createUsageRecords(
      orgId: string,
      subscriptions: Array<{ id: string; customerId: string; deviceId: string | null; status: string }>,
      plansMap: Map<string, { speedDown: string; dataCap: number | null }>,
    ) {
      const activeSubs = subscriptions.filter(s => s.status === 'active');
      const batchSize = 100;
      const allRecords: Array<{
        organizationId: string;
        customerId: string;
        subscriptionId: string;
        deviceId: string | null;
        date: Date;
        downloadBytes: number;
        uploadBytes: number;
        totalBytes: number;
        sessionTime: number;
      }> = [];

      for (const sub of activeSubs) {
        const plan = plansMap.get(sub.id);
        // Determine typical daily usage based on plan speed
        const speedMbps = plan ? parseInt(plan.speedDown) : 10;
        const maxDailyGB = (speedMbps * 3600 * 24) / (8 * 1000); // theoretical max in GB

        for (let day = 29; day >= 0; day--) {
          const date = daysAgo(day);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          // Realistic usage: 10-30% of theoretical max on weekdays, 20-40% on weekends
          const usagePercent = isWeekend
            ? randomBetween(20, 40) / 100
            : randomBetween(10, 30) / 100;
          const dailyGB = randomFloat(
            maxDailyGB * usagePercent * 0.3,
            maxDailyGB * usagePercent * 0.8,
            3,
          );
          const downloadBytes = Math.round(dailyGB * 0.75 * 1024 * 1024 * 1024);
          const uploadBytes = Math.round(dailyGB * 0.25 * 1024 * 1024 * 1024);
          const sessionTime = randomBetween(
            Math.round(3600 * 2),
            Math.round(3600 * 18),
          );

          allRecords.push({
            organizationId: orgId,
            customerId: sub.customerId,
            subscriptionId: sub.id,
            deviceId: sub.deviceId,
            date: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0),
            downloadBytes,
            uploadBytes,
            totalBytes: downloadBytes + uploadBytes,
            sessionTime,
          });
        }
      }

      // Insert in batches
      for (let i = 0; i < allRecords.length; i += batchSize) {
        const batch = allRecords.slice(i, i + batchSize);
        await db.usageRecord.createMany({ data: batch });
      }

      return allRecords.length;
    }

    // Build plans map for usage calculation
    const darnetPlansMap = new Map<string, { speedDown: string; dataCap: number | null }>();
    for (const sub of darnetSubscriptions) {
      const plan = darnetPlans.find(p => p.id === sub.planId);
      if (plan) {
        darnetPlansMap.set(sub.id, { speedDown: plan.speedDown, dataCap: plan.dataCap });
      }
    }

    const darnetUsageCount = await createUsageRecords(orgDarNet.id, darnetSubscriptions, darnetPlansMap);
    totalUsageRecords += darnetUsageCount;
    console.log(`  ✅ Created ${darnetUsageCount} DarNet usage records`);

    const arushaPlansMap = new Map<string, { speedDown: string; dataCap: number | null }>();
    for (const sub of arushaSubscriptions) {
      const plan = arushaPlans.find(p => p.id === sub.planId);
      if (plan) {
        arushaPlansMap.set(sub.id, { speedDown: plan.speedDown, dataCap: plan.dataCap });
      }
    }

    const arushaUsageCount = await createUsageRecords(orgArushaFiber.id, arushaSubscriptions, arushaPlansMap);
    totalUsageRecords += arushaUsageCount;
    console.log(`  ✅ Created ${arushaUsageCount} Arusha Fiber usage records`);

    console.log(`  📊 Total usage records: ${totalUsageRecords.toLocaleString()}`);

    // ==================================================
    // 9-11. INVOICES, LINE ITEMS, AND PAYMENTS
    // ==================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Step 9-11: Creating Invoices, Line Items, and Payments...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const PAYMENT_METHODS = ['cash', 'mobile_money', 'bank_transfer'] as const;
    const MOBILE_MONEY_REFS = ['M-Pesa', 'Tigo Pesa', 'Airtel Money', 'Halotel', 'Hakikisha'];

    let totalInvoices = 0;
    let totalPayments = 0;
    let invoiceCounter = 0;
    let receiptCounter = 0;

    // Generate invoices for last 3 months
    const now = new Date();
    const months = [];
    for (let m = 2; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      months.push({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        label: d.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
        isCurrentMonth: m === 0,
      });
    }

    async function createInvoicesForOrg(
      orgId: string,
      orgPrefix: string,
      subscriptions: Array<{
        id: string;
        customerId: string;
        planId: string;
        status: string;
        startDate: Date;
        billingCycle: string;
      }>,
      plans: Array<{
        id: string;
        name: string;
        priceMonthly: number;
        priceQuarterly: number | null;
        priceYearly: number | null;
        setupFee: number;
      }>,
      taxRate: number,
      customers: Array<{ id: string; status: string }>,
    ) {
      let orgInvoiceCount = 0;
      let orgPaymentCount = 0;

      for (const sub of subscriptions) {
        if (sub.status === 'cancelled' || sub.status === 'expired') continue;

        const customer = customers.find(c => c.id === sub.customerId);
        if (!customer) continue;

        const plan = plans.find(p => p.id === sub.planId);
        if (!plan) continue;

        // Determine base price based on billing cycle
        let basePrice = plan.priceMonthly;
        let cycleLabel = 'Monthly Internet Service';
        if (sub.billingCycle === 'quarterly' && plan.priceQuarterly) {
          basePrice = plan.priceQuarterly;
          cycleLabel = 'Quarterly Internet Service';
        } else if (sub.billingCycle === 'yearly' && plan.priceYearly) {
          basePrice = plan.priceYearly;
          cycleLabel = 'Yearly Internet Service';
        }

        for (const monthInfo of months) {
          // Skip months before subscription started
          const subStartDate = new Date(sub.startDate);
          const monthStart = new Date(monthInfo.year, monthInfo.month - 1, 1);
          if (subStartDate > monthStart) continue;

          // Skip suspended subscriptions after suspension (only generate for months they were active)
          if (sub.status === 'suspended' && monthInfo.isCurrentMonth) continue;

          invoiceCounter++;
          const invoiceNumber = generateInvoiceNumber(orgPrefix, monthInfo.month, monthInfo.year, invoiceCounter);

          // Determine invoice status
          let invoiceStatus: string;
          let paidAt: Date | null = null;

          if (sub.status === 'suspended') {
            invoiceStatus = monthInfo.isCurrentMonth ? 'overdue' : 'overdue';
          } else if (monthInfo.isCurrentMonth) {
            // Current month invoices are mostly pending
            invoiceStatus = 'pending';
          } else if (monthInfo.month === (now.getMonth())) {
            invoiceStatus = Math.random() > 0.5 ? 'paid' : 'pending';
          } else {
            // Older months: mostly paid, some overdue for suspended customers
            invoiceStatus = Math.random() > 0.15 ? 'paid' : 'overdue';
          }

          if (invoiceStatus === 'paid') {
            const paidDaysAgo = randomBetween(1, 15);
            paidAt = new Date(monthInfo.year, monthInfo.month - 1, randomBetween(5, 25));
          }

          // Calculate amounts
          const subtotal = basePrice;
          const hasSetupFee = monthStart.getTime() - subStartDate.getTime() < 86400000 * 35; // first month
          const setupFeeAmount = hasSetupFee ? plan.setupFee : 0;
          const hasEquipmentRental = Math.random() > 0.6;
          const equipmentRentalAmount = hasEquipmentRental ? randomBetween(5000, 15000) : 0;

          const totalSubtotal = subtotal + setupFeeAmount + equipmentRentalAmount;
          const tax = Math.round(totalSubtotal * taxRate);
          const discount = invoiceStatus === 'paid' && hasSetupFee ? Math.round(setupFeeAmount * 0.5) : 0; // 50% setup fee discount for prompt payers
          const total = totalSubtotal + tax - discount;

          // Due date is 15th of the billing month
          const dueDate = new Date(monthInfo.year, monthInfo.month - 1, 15);

          // Create invoice with line items
          const invoice = await db.invoice.create({
            data: {
              organizationId: orgId,
              customerId: sub.customerId,
              subscriptionId: sub.id,
              invoiceNumber,
              status: invoiceStatus,
              subtotal: totalSubtotal,
              tax,
              discount,
              total,
              dueDate,
              paidAt,
              notes: hasSetupFee && discount > 0 ? 'First-month setup fee 50% waiver applied' : null,
              lineItems: {
                create: [
                  {
                    description: cycleLabel,
                    quantity: 1,
                    unitPrice: basePrice,
                    total: basePrice,
                  },
                  ...(hasSetupFee
                    ? [
                        {
                          description: 'One-time Setup / Installation Fee',
                          quantity: 1,
                          unitPrice: plan.setupFee,
                          total: plan.setupFee,
                        },
                      ]
                    : []),
                  ...(hasEquipmentRental
                    ? [
                        {
                          description: 'Equipment Rental (Router/ONT)',
                          quantity: 1,
                          unitPrice: equipmentRentalAmount,
                          total: equipmentRentalAmount,
                        },
                      ]
                    : []),
                ],
              },
            },
          });

          orgInvoiceCount++;

          // Create payment for paid invoices
          if (invoiceStatus === 'paid' && paidAt) {
            receiptCounter++;
            const method = PAYMENT_METHODS[randomBetween(0, PAYMENT_METHODS.length - 1)] as string;
            let reference: string | null = null;

            if (method === 'mobile_money') {
              const provider = MOBILE_MONEY_REFS[randomBetween(0, MOBILE_MONEY_REFS.length - 1)];
              reference = `${provider} TXN${randomBetween(100000000, 999999999)}`;
            } else if (method === 'bank_transfer') {
              reference = `CRB${randomBetween(100000, 999999)}`;
            } else {
              reference = `CASH-${String(receiptCounter).padStart(4, '0')}`;
            }

            await db.payment.create({
              data: {
                organizationId: orgId,
                customerId: sub.customerId,
                invoiceId: invoice.id,
                amount: total,
                method,
                reference,
                status: 'completed',
                receiptNumber: generateReceiptNumber(orgPrefix, receiptCounter),
                notes:
                  method === 'mobile_money'
                    ? `Paid via ${reference}`
                    : method === 'bank_transfer'
                      ? `Bank deposit reference: ${reference}`
                      : 'Cash payment received at office',
                paidAt,
              },
            });

            orgPaymentCount++;
          }

          // Create a partial payment for some overdue invoices
          if (invoiceStatus === 'overdue' && Math.random() > 0.5) {
            receiptCounter++;
            const partialAmount = Math.round(total * randomBetween(20, 60) / 100);

            await db.payment.create({
              data: {
                organizationId: orgId,
                customerId: sub.customerId,
                invoiceId: invoice.id,
                amount: partialAmount,
                method: 'mobile_money',
                reference: `${MOBILE_MONEY_REFS[randomBetween(0, MOBILE_MONEY_REFS.length - 1)]} TXN${randomBetween(100000000, 999999999)}`,
                status: 'completed',
                receiptNumber: generateReceiptNumber(orgPrefix, receiptCounter),
                notes: `Partial payment - outstanding balance: TZS ${(total - partialAmount).toLocaleString()}`,
                paidAt: new Date(monthInfo.year, monthInfo.month - 1, randomBetween(20, 28)),
              },
            });

            orgPaymentCount++;
          }
        }
      }

      return { invoices: orgInvoiceCount, payments: orgPaymentCount };
    }

    const darnetResults = await createInvoicesForOrg(
      orgDarNet.id,
      'DNT',
      darnetSubscriptions,
      darnetPlans,
      orgDarNet.taxRate,
      darnetCustomers,
    );
    totalInvoices += darnetResults.invoices;
    totalPayments += darnetResults.payments;
    console.log(`  ✅ DarNet: ${darnetResults.invoices} invoices, ${darnetResults.payments} payments`);

    const arushaResults = await createInvoicesForOrg(
      orgArushaFiber.id,
      'AFC',
      arushaSubscriptions,
      arushaPlans,
      orgArushaFiber.taxRate,
      arushaCustomers,
    );
    totalInvoices += arushaResults.invoices;
    totalPayments += arushaResults.payments;
    console.log(`  ✅ Arusha Fiber: ${arushaResults.invoices} invoices, ${arushaResults.payments} payments`);

    // ==================================================
    // SUMMARY
    // ==================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ SEED COMPLETE - Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  📦 Organizations:       2`);
    console.log(`  👥 Org Users:          ${darnetUsers.length + arushaUsers.length}`);
    console.log(`  🧑‍💻 Customers:           ${darnetCustomers.length + arushaCustomers.length}`);
    console.log(`  📡 Devices:             ${darnetDevices.length + arushaDevices.length}`);
    console.log(`  📋 Plans:               ${darnetPlans.length + arushaPlans.length}`);
    console.log(`  ⚙️  Provisioning Rules:  ${darnetProvisioningRules.length + arushaProvisioningRules.length}`);
    console.log(`  🔗 Subscriptions:       ${darnetSubscriptions.length + arushaSubscriptions.length}`);
    console.log(`  📊 Usage Records:       ${totalUsageRecords.toLocaleString()}`);
    console.log(`  🧾 Invoices:            ${totalInvoices}`);
    console.log(`  💰 Payments:            ${totalPayments}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 All seed data created successfully!\n');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
    }
    process.exit(1);
  } finally {
    await db.$disconnect();
    console.log('🔌 Database connection closed.');
  }
}

main();

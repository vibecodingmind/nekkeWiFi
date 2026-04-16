export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

export function formatTZS(amount: number | undefined | null): string {
  if (amount == null || isNaN(amount)) return 'TZS 0';
  return `TZS ${amount.toLocaleString()}`;
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'active':
    case 'paid':
    case 'completed':
    case 'online':
    case 'up':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'suspended':
    case 'overdue':
    case 'offline':
    case 'down':
    case 'failed':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'trial':
    case 'partial':
    case 'pending':
    case 'warning':
    case 'processing':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'disconnected':
    case 'cancelled':
    case 'expired':
    case 'disabled':
    case 'maintenance':
      return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
    case 'refunded':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    default:
      return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
  }
}

export function getDeviceTypeInfo(type: string, category?: string): { label: string; color: string } {
  const t = type.toLowerCase();
  const c = (category || '').toLowerCase();

  if (c === 'ont' || t === 'nokia' || c === 'ont')
    return { label: 'ONT', color: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30' };
  if (c === 'olt')
    return { label: 'OLT', color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30' };
  if (c === '5g_router' || c === 'modem')
    return { label: '5G', color: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30' };
  if (c === 'odu' || c === 'outdoor_unit')
    return { label: 'ODU', color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' };
  if (c === 'radio' || t === 'cambium')
    return { label: 'PTP', color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30' };
  if (c === 'access_point' || t === 'tplink')
    return { label: 'AP', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' };
  if (c === 'switch')
    return { label: 'SW', color: 'text-teal-600 bg-teal-100 dark:bg-teal-900/30' };
  if (c === 'firewall')
    return { label: 'FW', color: 'text-red-600 bg-red-100 dark:bg-red-900/30' };
  if (c === 'gateway' || t === 'ubiquiti')
    return { label: 'GW', color: 'text-violet-600 bg-violet-100 dark:bg-violet-900/30' };
  if (c === 'balancer')
    return { label: 'LB', color: 'text-fuchsia-600 bg-fuchsia-100 dark:bg-fuchsia-900/30' };
  if (t === 'mikrotik')
    return { label: 'MKT', color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' };
  if (t === 'cisco')
    return { label: 'CSCO', color: 'text-sky-600 bg-sky-100 dark:bg-sky-900/30' };
  if (t === 'juniper')
    return { label: 'JNP', color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30' };
  if (t === 'huawei')
    return { label: 'HW', color: 'text-red-600 bg-red-100 dark:bg-red-900/30' };
  if (t === 'zte')
    return { label: 'ZTE', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' };

  return { label: 'DEV', color: 'text-zinc-600 bg-zinc-100 dark:bg-zinc-800' };
}

export function getDeviceTypeIcon(type: string): string {
  switch (type.toLowerCase()) {
    case 'mikrotik':
      return 'Router';
    case 'tplink':
      return 'Wifi';
    case 'ubiquiti':
      return 'Radio';
    case 'cisco':
      return 'Server';
    case 'juniper':
      return 'Network';
    default:
      return 'Router';
  }
}

export function getDeviceTypeColor(type: string): string {
  switch (type.toLowerCase()) {
    case 'mikrotik': return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30';
    case 'tplink': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
    case 'ubiquiti': return 'text-violet-600 bg-violet-100 dark:bg-violet-900/30';
    case 'cisco': return 'text-sky-600 bg-sky-100 dark:bg-sky-900/30';
    case 'juniper': return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30';
    case 'huawei': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
    case 'zte': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
    case 'nokia': return 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30';
    case 'cambium': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
    case 'ericsson': return 'text-blue-700 bg-blue-100 dark:bg-blue-900/30';
    default: return 'text-zinc-600 bg-zinc-100 dark:bg-zinc-800';
  }
}

export function getDeviceCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    router: 'Router',
    switch: 'Switch',
    access_point: 'Access Point',
    ont: 'ONT (Optical)',
    olt: 'OLT',
    modem: 'Modem',
    firewall: 'Firewall',
    radio: 'Radio/PTP',
    balancer: 'Load Balancer',
    gateway: 'Gateway',
    '5g_router': '5G Router',
    odu: 'ODU',
  };
  return labels[category?.toLowerCase()] || category || 'Unknown';
}

export function getConnectionProtocolLabel(protocol: string): string {
  const labels: Record<string, string> = {
    api: 'API',
    snmp: 'SNMP',
    ssh: 'SSH',
    rest: 'REST API',
    tr069: 'TR-069',
    telnet: 'Telnet',
    http: 'HTTP',
    https: 'HTTPS',
  };
  return labels[protocol?.toLowerCase()] || protocol || 'API';
}

export function getPaymentMethodColor(method: string): string {
  const m = method.toLowerCase();
  if (m === 'cash') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
  if (m === 'mobile_money' || m === 'mobilemoney') return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400';
  if (m === 'bank_transfer' || m === 'banktransfer') return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400';
  if (m === 'card') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  if (m === 'pesapal') return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400';
  if (m === 'online') return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
  return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
}

export function getPaymentChannelColor(channel: string): string {
  const c = channel?.toLowerCase() || '';
  if (c.includes('mpesa')) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  if (c.includes('airtel')) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  if (c.includes('tigo')) return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400';
  if (c.includes('halotel')) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
  if (c.includes('ttcl')) return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
  if (c.includes('visa')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  if (c.includes('mastercard')) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  if (c.includes('bank')) return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400';
  return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
}

export function formatPaymentMethod(method: string): string {
  const m = method.toLowerCase();
  if (m === 'mobile_money' || m === 'mobilemoney') return 'Mobile Money';
  if (m === 'bank_transfer' || m === 'banktransfer') return 'Bank Transfer';
  if (m === 'pesapal') return 'Pesapal';
  return method.charAt(0).toUpperCase() + method.slice(1);
}

export function formatPaymentChannel(channel: string): string {
  const c = channel?.toLowerCase() || '';
  if (c === 'mpesa') return 'M-Pesa';
  if (c === 'airtel_money') return 'Airtel Money';
  if (c === 'tigo_pesa') return 'Tigo Pesa';
  if (c === 'halotel') return 'Halotel';
  if (c === 'ttcl_pesa') return 'TTCL Pesa';
  if (c === 'visa') return 'Visa';
  if (c === 'mastercard') return 'Mastercard';
  if (c === 'bank_transfer') return 'Bank Transfer';
  if (c === 'pesapal_card') return 'Card (Pesapal)';
  if (c === 'pesapal_bank') return 'Bank (Pesapal)';
  return channel || '-';
}

export function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return `${days}d ${hours}h`;
}

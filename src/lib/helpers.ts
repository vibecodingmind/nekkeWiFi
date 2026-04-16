export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

export function formatTZS(amount: number): string {
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

export function getPaymentMethodColor(method: string): string {
  switch (method.toLowerCase()) {
    case 'cash':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'mobile_money':
    case 'mobilemoney':
      return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400';
    case 'bank_transfer':
    case 'banktransfer':
      return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400';
    case 'card':
    case 'online':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    default:
      return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
  }
}

export function formatPaymentMethod(method: string): string {
  switch (method.toLowerCase()) {
    case 'mobile_money':
    case 'mobilemoney':
      return 'Mobile Money';
    case 'bank_transfer':
    case 'banktransfer':
      return 'Bank Transfer';
    default:
      return method.charAt(0).toUpperCase() + method.slice(1);
  }
}

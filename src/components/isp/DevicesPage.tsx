'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Router,
  Wifi,
  Radio,
  Server,
  Network,
  Plus,
  Eye,
  Clock,
  MapPin,
  Thermometer,
  Cpu,
  HardDrive,
  Zap,
  Signal,
  Building,
  Shield,
  Antenna,
  Activity,
  MonitorSmartphone,
  AlertTriangle,
  Power,
  Loader2,
} from 'lucide-react';
import {
  formatDate,
  formatDateTime,
  formatBytes,
  getStatusColor,
  getDeviceTypeInfo,
  getDeviceTypeColor,
  getDeviceCategoryLabel,
  getConnectionProtocolLabel,
  formatUptime,
} from '@/lib/helpers';
import { toast } from '@/hooks/use-toast';

// ============================================================
// Constants
// ============================================================

const DEVICE_TYPES = [
  { value: 'mikrotik', label: 'MikroTik' },
  { value: 'tplink', label: 'TP-Link' },
  { value: 'huawei', label: 'Huawei' },
  { value: 'zte', label: 'ZTE' },
  { value: 'cisco', label: 'Cisco' },
  { value: 'juniper', label: 'Juniper' },
  { value: 'ubiquiti', label: 'Ubiquiti' },
  { value: 'cambium', label: 'Cambium' },
  { value: 'nokia', label: 'Nokia' },
  { value: 'ericsson', label: 'Ericsson' },
  { value: 'generic', label: 'Generic' },
] as const;

const DEVICE_CATEGORIES = [
  { value: 'router', label: 'Router' },
  { value: 'switch', label: 'Switch' },
  { value: 'access_point', label: 'Access Point' },
  { value: 'ont', label: 'ONT (Optical)' },
  { value: 'olt', label: 'OLT' },
  { value: '5g_router', label: '5G Router' },
  { value: 'odu', label: 'ODU (Outdoor Unit)' },
  { value: 'modem', label: 'Modem' },
  { value: 'firewall', label: 'Firewall' },
  { value: 'radio', label: 'Radio/PTP' },
  { value: 'balancer', label: 'Load Balancer' },
  { value: 'gateway', label: 'Gateway' },
] as const;

const CONNECTION_PROTOCOLS = [
  { value: 'api', label: 'API' },
  { value: 'snmp', label: 'SNMP' },
  { value: 'ssh', label: 'SSH' },
  { value: 'rest', label: 'REST API' },
  { value: 'tr069', label: 'TR-069' },
  { value: 'telnet', label: 'Telnet' },
] as const;

const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Types' },
  ...DEVICE_TYPES.map((t) => ({ value: t.value, label: t.label })),
];

const CATEGORY_FILTER_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  ...DEVICE_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
];

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
  { value: 'warning', label: 'Warning' },
  { value: 'maintenance', label: 'Maintenance' },
] as const;

// ============================================================
// Interfaces
// ============================================================

interface DevicesPageProps {
  orgId: string | null;
}

interface DeviceInterface {
  id: string;
  name: string;
  type: string | null;
  macAddress: string | null;
  status: string;
  speed: string | null;
  rxBytes: number;
  txBytes: number;
  opticalRxPower: number | null;
  opticalTxPower: number | null;
  distance: number | null;
}

interface Device {
  id: string;
  name: string;
  type: string;
  category: string;
  model: string | null;
  ipAddress: string;
  port: number;
  connectionProtocol: string;
  snmpVersion: string | null;
  snmpCommunity: string | null;
  firmware: string | null;
  serialNumber: string | null;
  location: string | null;
  status: string;
  lastSeenAt: string | null;
  totalBandwidth: string | null;
  cpuUsage: number | null;
  memoryUsage: number | null;
  uptime: number | null;
  temperature: number | null;
  capabilities: string | null;
  configProfile: string | null;
  createdAt: string;
  organization: { id: string; name: string };
  _count: { interfaces: number; subscriptions: number; provisioningRules: number };
}

interface DeviceDetail extends Device {
  interfaces: DeviceInterface[];
}

interface TestConnectionResult {
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
}

interface CreateFormData {
  name: string;
  type: string;
  category: string;
  connectionProtocol: string;
  model: string;
  ipAddress: string;
  port: string;
  snmpVersion: string;
  snmpCommunity: string;
  apiUser: string;
  apiPassword: string;
  location: string;
  totalBandwidth: string;
  firmware: string;
  serialNumber: string;
  capabilities: string;
  configProfile: string;
}

// ============================================================
// Helpers
// ============================================================

const getDeviceIcon = (type: string, category?: string) => {
  const c = category?.toLowerCase();
  if (c === 'ont') return <Building className="h-5 w-5" />;
  if (c === 'olt') return <Building className="h-5 w-5" />;
  if (c === '5g_router') return <Signal className="h-5 w-5" />;
  if (c === 'odu') return <Antenna className="h-5 w-5" />;
  if (c === 'radio' || type === 'cambium') return <Radio className="h-5 w-5" />;
  if (c === 'access_point' || type === 'tplink') return <Wifi className="h-5 w-5" />;
  if (c === 'switch') return <Server className="h-5 w-5" />;
  if (c === 'firewall') return <Shield className="h-5 w-5" />;
  if (c === 'gateway' || type === 'ubiquiti') return <Network className="h-5 w-5" />;
  if (type === 'mikrotik') return <Router className="h-5 w-5" />;
  if (type === 'cisco') return <Server className="h-5 w-5" />;
  if (type === 'huawei') return <Zap className="h-5 w-5" />;
  if (type === 'zte') return <Signal className="h-5 w-5" />;
  return <Router className="h-5 w-5" />;
};

const getStatusDotColor = (status: string) => {
  switch (status) {
    case 'online': return 'bg-emerald-500';
    case 'offline': return 'bg-red-500';
    case 'warning': return 'bg-amber-500';
    case 'maintenance': return 'bg-zinc-400';
    default: return 'bg-zinc-400';
  }
};

const getHealthColor = (type: 'cpu' | 'memory' | 'temp', value: number): string => {
  if (type === 'temp') {
    if (value < 50) return 'bg-emerald-500';
    if (value < 65) return 'bg-amber-500';
    return 'bg-red-500';
  }
  // CPU or Memory
  if (value < 60) return 'bg-emerald-500';
  if (value < 80) return 'bg-amber-500';
  return 'bg-red-500';
};

const getHealthTextColor = (type: 'cpu' | 'memory' | 'temp', value: number): string => {
  if (type === 'temp') {
    if (value < 50) return 'text-emerald-600 dark:text-emerald-400';
    if (value < 65) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  }
  if (value < 60) return 'text-emerald-600 dark:text-emerald-400';
  if (value < 80) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
};

const DEFAULT_FORM_DATA: CreateFormData = {
  name: '',
  type: 'mikrotik',
  category: 'router',
  connectionProtocol: 'api',
  model: '',
  ipAddress: '',
  port: '8728',
  snmpVersion: 'v2c',
  snmpCommunity: 'public',
  apiUser: '',
  apiPassword: '',
  location: '',
  totalBandwidth: '',
  firmware: '',
  serialNumber: '',
  capabilities: '',
  configProfile: '',
};

// ============================================================
// Component
// ============================================================

export default function DevicesPage({ orgId }: DevicesPageProps) {
  const queryClient = useQueryClient();

  // Filters
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<DeviceDetail | null>(null);

  // Form
  const [formData, setFormData] = useState<CreateFormData>(DEFAULT_FORM_DATA);
  const [formError, setFormError] = useState('');

  // Test connection tracking per device
  const [testingDeviceId, setTestingDeviceId] = useState<string | null>(null);

  // ============================================================
  // Queries & Mutations
  // ============================================================

  const { data: devices, isLoading, isError } = useQuery<Device[]>({
    queryKey: ['devices', orgId, typeFilter, categoryFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (orgId) params.set('orgId', orgId);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/devices?${params}`);
      if (!res.ok) throw new Error('Failed to load devices');
      return res.json();
    },
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: async (form: CreateFormData) => {
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: orgId,
          name: form.name,
          type: form.type,
          category: form.category,
          connectionProtocol: form.connectionProtocol,
          model: form.model || undefined,
          ipAddress: form.ipAddress,
          port: parseInt(form.port) || 8728,
          apiUser: form.apiUser,
          apiPassword: form.apiPassword,
          snmpVersion: form.snmpVersion || undefined,
          snmpCommunity: form.snmpCommunity || undefined,
          location: form.location || undefined,
          totalBandwidth: form.totalBandwidth || undefined,
          firmware: form.firmware || undefined,
          serialNumber: form.serialNumber || undefined,
          capabilities: form.capabilities || undefined,
          configProfile: form.configProfile || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create device');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      setCreateOpen(false);
      setFormData(DEFAULT_FORM_DATA);
      setFormError('');
      toast({
        title: 'Device Added',
        description: 'The device has been registered successfully.',
      });
    },
    onError: (err) => {
      setFormError(err.message);
    },
  });

  const testConnection = useCallback(async (deviceId: string) => {
    setTestingDeviceId(deviceId);
    try {
      const res = await fetch('/api/devices/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      });
      const result: TestConnectionResult = await res.json();
      toast({
        title: result.success ? 'Connection Successful' : 'Connection Failed',
        description: result.message + (result.success ? ` (${result.latency}ms)` : ''),
        variant: result.success ? 'default' : 'destructive',
      });
    } catch {
      toast({
        title: 'Connection Test Error',
        description: 'Failed to test connection. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setTestingDeviceId(null);
    }
  }, []);

  const viewDevice = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/devices/${id}`);
      if (res.ok) {
        const detail = await res.json();
        setSelectedDevice(detail);
        setDetailOpen(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleCreate = () => {
    if (!formData.name || !formData.ipAddress || !formData.apiUser || !formData.apiPassword) {
      setFormError('Name, IP address, credentials (username and password) are required');
      return;
    }
    createMutation.mutate(formData);
  };

  // ============================================================
  // Computed: Summary Stats
  // ============================================================

  const totalDevices = devices?.length ?? 0;
  const onlineDevices = devices?.filter((d) => d.status === 'online').length ?? 0;
  const offlineDevices = devices?.filter((d) => d.status === 'offline').length ?? 0;
  const warningDevices = devices?.filter((d) => d.status === 'warning').length ?? 0;

  // ============================================================
  // Render helpers
  // ============================================================

  const renderHealthBar = (
    label: string,
    value: number | null | undefined,
    type: 'cpu' | 'memory' | 'temp',
    unit: string,
    icon: React.ReactNode,
  ) => {
    if (value === null || value === undefined) return null;
    const color = getHealthColor(type, value);
    const textColor = getHealthTextColor(type, value);
    return (
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1 text-muted-foreground shrink-0">
            {icon}
            <span className="text-[11px] font-medium">{label}</span>
          </div>
          <span className={`text-xs font-semibold ${textColor}`}>
            {type === 'temp' ? `${value.toFixed(0)}${unit}` : `${value.toFixed(0)}${unit}`}
          </span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${color}`}
            style={{ width: `${Math.min(value, 100)}%` }}
          />
        </div>
      </div>
    );
  };

  // ============================================================
  // Summary Stats Cards
  // ============================================================

  const renderSummaryStats = () => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <Server className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none">{totalDevices}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Devices</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none text-emerald-600 dark:text-emerald-400">{onlineDevices}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Online</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <Power className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none text-red-600 dark:text-red-400">{offlineDevices}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Offline</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-none text-amber-600 dark:text-amber-400">{warningDevices}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Warning</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ============================================================
  // Filter Controls
  // ============================================================

  const renderFilters = () => (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={typeFilter} onValueChange={setTypeFilter}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Device Type" />
        </SelectTrigger>
        <SelectContent>
          {TYPE_FILTER_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          {CATEGORY_FILTER_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  // ============================================================
  // Device Card
  // ============================================================

  const renderDeviceCard = (device: Device) => {
    const typeInfo = getDeviceTypeInfo(device.type, device.category);
    const typeColor = getDeviceTypeColor(device.type);
    const protocolLabel = getConnectionProtocolLabel(device.connectionProtocol);
    const isTesting = testingDeviceId === device.id;
    const hasPonData = device.category === 'ont' || device.category === 'olt';

    return (
      <Card key={device.id} className="group hover:shadow-md transition-all duration-200">
        <CardContent className="p-4 space-y-3">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${typeColor}`}>
                {getDeviceIcon(device.type, device.category)}
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm leading-tight truncate">{device.name}</h3>
                <p className="text-xs text-muted-foreground capitalize truncate">
                  {device.type} {device.model ? `- ${device.model}` : ''}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <div className="flex items-center gap-1.5">
                <div className={`h-2 w-2 rounded-full ${getStatusDotColor(device.status)}`} />
                <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${getStatusColor(device.status)}`}>
                  {device.status}
                </Badge>
              </div>
              <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${typeInfo.color}`}>
                {typeInfo.label}
              </Badge>
            </div>
          </div>

          {/* IP + Protocol */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-muted-foreground">
              {device.ipAddress}:{device.port}
            </span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
              {protocolLabel}
            </Badge>
          </div>

          {/* Location */}
          {device.location && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{device.location}</span>
            </div>
          )}

          {/* Last Seen */}
          {device.lastSeenAt && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3 shrink-0" />
              <span>{formatDateTime(device.lastSeenAt)}</span>
            </div>
          )}

          {/* Health Metrics */}
          {(device.cpuUsage !== null || device.memoryUsage !== null || device.temperature !== null) && (
            <div className="space-y-1.5 pt-1">
              {renderHealthBar('CPU', device.cpuUsage, 'cpu', '%', <Cpu className="h-3 w-3" />)}
              {renderHealthBar('MEM', device.memoryUsage, 'memory', '%', <HardDrive className="h-3 w-3" />)}
              {renderHealthBar('TEMP', device.temperature, 'temp', '°C', <Thermometer className="h-3 w-3" />)}
              {device.uptime !== null && device.uptime !== undefined && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span>Uptime: {formatUptime(device.uptime)}</span>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{device._count.interfaces} interfaces</span>
              <span>{device._count.subscriptions} subs</span>
            </div>
            <div className="flex items-center gap-1">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        testConnection(device.id);
                      }}
                      disabled={isTesting}
                    >
                      {isTesting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Test Connection</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        viewDevice(device.id);
                      }}
                    >
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>View Details</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ============================================================
  // Device List Row (Table View)
  // ============================================================

  const renderDeviceListRow = (device: Device) => {
    const typeInfo = getDeviceTypeInfo(device.type, device.category);
    const typeColor = getDeviceTypeColor(device.type);
    const protocolLabel = getConnectionProtocolLabel(device.connectionProtocol);
    const isTesting = testingDeviceId === device.id;

    return (
      <TableRow key={device.id} className="cursor-pointer hover:bg-muted/50" onClick={() => viewDevice(device.id)}>
        <TableCell>
          <div className="flex items-center gap-2.5">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${typeColor}`}>
              {getDeviceIcon(device.type, device.category)}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{device.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{device.model || device.type}</p>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${typeInfo.color}`}>
            {typeInfo.label}
          </Badge>
        </TableCell>
        <TableCell>
          <span className="font-mono text-xs">{device.ipAddress}:{device.port}</span>
          <span className="text-[10px] text-muted-foreground ml-1.5">{protocolLabel}</span>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1.5">
            <div className={`h-2 w-2 rounded-full ${getStatusDotColor(device.status)}`} />
            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${getStatusColor(device.status)}`}>
              {device.status}
            </Badge>
          </div>
        </TableCell>
        <TableCell className="hidden md:table-cell">
          {device.cpuUsage !== null ? (
            <span className={`text-xs font-medium ${getHealthTextColor('cpu', device.cpuUsage)}`}>
              {device.cpuUsage.toFixed(0)}%
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </TableCell>
        <TableCell className="hidden lg:table-cell">
          {device.memoryUsage !== null ? (
            <span className={`text-xs font-medium ${getHealthTextColor('memory', device.memoryUsage)}`}>
              {device.memoryUsage.toFixed(0)}%
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </TableCell>
        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
          {device.location || '-'}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                testConnection(device.id);
              }}
              disabled={isTesting}
            >
              {isTesting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                viewDevice(device.id);
              }}
            >
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  // ============================================================
  // Device Detail Modal
  // ============================================================

  const renderDetailModal = () => {
    if (!selectedDevice) return null;

    const dev = selectedDevice;
    const typeInfo = getDeviceTypeInfo(dev.type, dev.category);
    const typeColor = getDeviceTypeColor(dev.type);
    const protocolLabel = getConnectionProtocolLabel(dev.connectionProtocol);
    const categoryLabel = getDeviceCategoryLabel(dev.category);
    const isTesting = testingDeviceId === dev.id;
    const isPonDevice = dev.category === 'ont' || dev.category === 'olt';

    return (
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${typeColor}`}>
                {getDeviceIcon(dev.type, dev.category)}
              </div>
              <div className="min-w-0">
                <DialogTitle className="truncate">{dev.name}</DialogTitle>
                <DialogDescription className="truncate">
                  <span className="capitalize">{dev.type}</span>
                  {dev.model ? ` \u00B7 ${dev.model}` : ''}
                  {' \u00B7 '}
                  <span className="font-mono">{dev.ipAddress}:{dev.port}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Status + Type Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className={getStatusColor(dev.status)}>
                <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${getStatusDotColor(dev.status)}`} />
                {dev.status}
              </Badge>
              <Badge variant="secondary" className={typeInfo.color}>
                {typeInfo.label}
              </Badge>
              <Badge variant="outline">{categoryLabel}</Badge>
              <Badge variant="outline" className="font-mono">{protocolLabel}</Badge>
              {dev.totalBandwidth && (
                <Badge variant="outline">{dev.totalBandwidth}</Badge>
              )}
            </div>

            {/* Summary Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-xl font-bold">{dev.interfaces?.length ?? dev._count.interfaces}</p>
                <p className="text-xs text-muted-foreground">Interfaces</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-xl font-bold">{dev._count.subscriptions}</p>
                <p className="text-xs text-muted-foreground">Subscribers</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-xl font-bold">{dev._count.provisioningRules}</p>
                <p className="text-xs text-muted-foreground">Prov. Rules</p>
              </div>
            </div>

            {/* Health Metrics */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Health Metrics</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Cpu className="h-4 w-4" />
                      <span>CPU Usage</span>
                    </div>
                    <span className={`text-sm font-semibold ${dev.cpuUsage !== null ? getHealthTextColor('cpu', dev.cpuUsage) : 'text-muted-foreground'}`}>
                      {dev.cpuUsage !== null ? `${dev.cpuUsage.toFixed(0)}%` : 'N/A'}
                    </span>
                  </div>
                  {dev.cpuUsage !== null && (
                    <Progress value={dev.cpuUsage} className="h-2 [&>div]:bg-emerald-500" />
                  )}
                </div>
                <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <HardDrive className="h-4 w-4" />
                      <span>Memory Usage</span>
                    </div>
                    <span className={`text-sm font-semibold ${dev.memoryUsage !== null ? getHealthTextColor('memory', dev.memoryUsage) : 'text-muted-foreground'}`}>
                      {dev.memoryUsage !== null ? `${dev.memoryUsage.toFixed(0)}%` : 'N/A'}
                    </span>
                  </div>
                  {dev.memoryUsage !== null && (
                    <Progress value={dev.memoryUsage} className="h-2 [&>div]:bg-emerald-500" />
                  )}
                </div>
                <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Thermometer className="h-4 w-4" />
                      <span>Temperature</span>
                    </div>
                    <span className={`text-sm font-semibold ${dev.temperature !== null ? getHealthTextColor('temp', dev.temperature) : 'text-muted-foreground'}`}>
                      {dev.temperature !== null ? `${dev.temperature.toFixed(0)}°C` : 'N/A'}
                    </span>
                  </div>
                  {dev.temperature !== null && (
                    <Progress value={Math.min(dev.temperature, 100)} className="h-2 [&>div]:bg-emerald-500" />
                  )}
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Uptime</span>
                  </div>
                  <p className="text-lg font-semibold mt-1">
                    {dev.uptime !== null ? formatUptime(dev.uptime) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Device Info */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Device Information</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="capitalize font-medium">{dev.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <span className="font-medium">{categoryLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Model</span>
                  <span className="font-medium">{dev.model || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Firmware</span>
                  <span className="font-medium font-mono text-xs">{dev.firmware || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Serial</span>
                  <span className="font-medium font-mono text-xs">{dev.serialNumber || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-medium">{dev.location || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">{formatDate(dev.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Seen</span>
                  <span className="font-medium">{dev.lastSeenAt ? formatDateTime(dev.lastSeenAt) : '-'}</span>
                </div>
              </div>
            </div>

            {/* Connection Details */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Connection Details</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Protocol</span>
                  <Badge variant="outline" className="font-mono">{protocolLabel}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Port</span>
                  <span className="font-mono">{dev.port}</span>
                </div>
                {(dev.connectionProtocol === 'snmp') && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SNMP Version</span>
                      <span className="font-medium">{dev.snmpVersion || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SNMP Community</span>
                      <span className="font-medium font-mono">{dev.snmpCommunity || '-'}</span>
                    </div>
                  </>
                )}
                {dev.configProfile && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Config Profile</span>
                    <span className="font-medium">{dev.configProfile}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Capabilities */}
            {dev.capabilities && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Capabilities</h4>
                <div className="flex flex-wrap gap-1.5">
                  {dev.capabilities.split(',').map((cap) => {
                    const trimmed = cap.trim();
                    if (!trimmed) return null;
                    return (
                      <Badge key={trimmed} variant="secondary" className="text-xs">
                        {trimmed.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Interfaces Table */}
            {dev.interfaces && dev.interfaces.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3">
                  Interfaces ({dev.interfaces.length})
                </h4>
                <div className="max-h-64 overflow-y-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Name</TableHead>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Speed</TableHead>
                        <TableHead className="text-xs">MAC</TableHead>
                        <TableHead className="text-xs text-right">RX</TableHead>
                        <TableHead className="text-xs text-right">TX</TableHead>
                        {isPonDevice && (
                          <>
                            <TableHead className="text-xs text-right">Opt. RX</TableHead>
                            <TableHead className="text-xs text-right">Opt. TX</TableHead>
                            <TableHead className="text-xs text-right">Distance</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dev.interfaces.map((iface) => (
                        <TableRow key={iface.id}>
                          <TableCell className="font-mono text-xs">{iface.name}</TableCell>
                          <TableCell className="text-xs">{iface.type ?? '-'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${getStatusColor(iface.status)}`}>
                              {iface.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{iface.speed ?? '-'}</TableCell>
                          <TableCell className="font-mono text-[11px] text-muted-foreground">{iface.macAddress ?? '-'}</TableCell>
                          <TableCell className="text-xs text-right">{formatBytes(iface.rxBytes)}</TableCell>
                          <TableCell className="text-xs text-right">{formatBytes(iface.txBytes)}</TableCell>
                          {isPonDevice && (
                            <>
                              <TableCell className="text-xs text-right">
                                {iface.opticalRxPower !== null ? `${iface.opticalRxPower.toFixed(1)} dBm` : '-'}
                              </TableCell>
                              <TableCell className="text-xs text-right">
                                {iface.opticalTxPower !== null ? `${iface.opticalTxPower.toFixed(1)} dBm` : '-'}
                              </TableCell>
                              <TableCell className="text-xs text-right">
                                {iface.distance !== null ? `${iface.distance.toFixed(1)} km` : '-'}
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => testConnection(dev.id)}
                disabled={isTesting}
              >
                {isTesting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // ============================================================
  // Create Dialog
  // ============================================================

  const renderCreateDialog = () => (
    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Add Device
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Network Device</DialogTitle>
          <DialogDescription>
            Register a new device. Supports routers, switches, ONTs, OLTs, 5G routers, ODUs, and more.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {formError && (
            <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">{formError}</p>
          )}

          {/* Row 1: Name + Device Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dev-name">Device Name *</Label>
              <Input
                id="dev-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Core Router 1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dev-type">Device Type *</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger id="dev-type">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {DEVICE_TYPES.map((dt) => (
                    <SelectItem key={dt.value} value={dt.value}>
                      {dt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Category + Protocol */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dev-category">Category *</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger id="dev-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {DEVICE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dev-protocol">Connection Protocol *</Label>
              <Select value={formData.connectionProtocol} onValueChange={(v) => setFormData({ ...formData, connectionProtocol: v })}>
                <SelectTrigger id="dev-protocol">
                  <SelectValue placeholder="Select protocol" />
                </SelectTrigger>
                <SelectContent>
                  {CONNECTION_PROTOCOLS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Model + IP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dev-model">Model</Label>
              <Input
                id="dev-model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="e.g. CCR2004-1G-12S+2XS"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dev-ip">IP Address *</Label>
              <Input
                id="dev-ip"
                value={formData.ipAddress}
                onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                placeholder="192.168.1.1"
              />
            </div>
          </div>

          {/* Row 4: Port + Credentials */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dev-port">Port</Label>
              <Input
                id="dev-port"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                placeholder="8728"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dev-user">Username *</Label>
              <Input
                id="dev-user"
                value={formData.apiUser}
                onChange={(e) => setFormData({ ...formData, apiUser: e.target.value })}
                placeholder="admin"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dev-pass">Password *</Label>
              <Input
                id="dev-pass"
                type="password"
                value={formData.apiPassword}
                onChange={(e) => setFormData({ ...formData, apiPassword: e.target.value })}
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* SNMP fields (conditional) */}
          {formData.connectionProtocol === 'snmp' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dev-snmp-ver">SNMP Version</Label>
                <Select value={formData.snmpVersion} onValueChange={(v) => setFormData({ ...formData, snmpVersion: v })}>
                  <SelectTrigger id="dev-snmp-ver">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="v1">v1</SelectItem>
                    <SelectItem value="v2c">v2c</SelectItem>
                    <SelectItem value="v3">v3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dev-snmp-comm">SNMP Community</Label>
                <Input
                  id="dev-snmp-comm"
                  value={formData.snmpCommunity}
                  onChange={(e) => setFormData({ ...formData, snmpCommunity: e.target.value })}
                  placeholder="public"
                />
              </div>
            </div>
          )}

          <Separator />

          {/* Optional fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dev-location">Location</Label>
              <Input
                id="dev-location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Data Center A, Rack 12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dev-bandwidth">Total Bandwidth</Label>
              <Input
                id="dev-bandwidth"
                value={formData.totalBandwidth}
                onChange={(e) => setFormData({ ...formData, totalBandwidth: e.target.value })}
                placeholder="e.g. 1Gbps"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dev-firmware">Firmware</Label>
              <Input
                id="dev-firmware"
                value={formData.firmware}
                onChange={(e) => setFormData({ ...formData, firmware: e.target.value })}
                placeholder="e.g. RouterOS 7.14.3"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dev-serial">Serial Number</Label>
              <Input
                id="dev-serial"
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                placeholder="e.g. ABC123DEF456"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dev-capabilities">Capabilities</Label>
              <Input
                id="dev-capabilities"
                value={formData.capabilities}
                onChange={(e) => setFormData({ ...formData, capabilities: e.target.value })}
                placeholder="bandwidth_shaping,pppoe_server,dhcp_server"
              />
              <p className="text-[11px] text-muted-foreground">Comma-separated capability names</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dev-profile">Config Profile</Label>
              <Input
                id="dev-profile"
                value={formData.configProfile}
                onChange={(e) => setFormData({ ...formData, configProfile: e.target.value })}
                placeholder="e.g. isp-core-router"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setCreateOpen(false); setFormError(''); }}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={createMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Device'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ============================================================
  // Loading State
  // ============================================================

  const renderLoadingSkeleton = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-3 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-20" />
              <Separator />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // ============================================================
  // Main Render
  // ============================================================

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Devices</h1>
          <p className="text-muted-foreground mt-1">
            Manage network devices — routers, switches, ONTs, OLTs, 5G routers, ODUs & more
          </p>
        </div>
        {renderCreateDialog()}
      </div>

      {!orgId ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center">
              <MonitorSmartphone className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">Select an organization to view devices</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Stats */}
          {renderSummaryStats()}

          {/* Filters + View Toggle */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            {renderFilters()}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'cards' | 'list')}>
              <TabsList className="h-8">
                <TabsTrigger value="cards" className="text-xs px-3">Cards</TabsTrigger>
                <TabsTrigger value="list" className="text-xs px-3">List</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Content */}
          {isLoading ? (
            renderLoadingSkeleton()
          ) : isError ? (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                <div className="text-center">
                  <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">Failed to load devices</p>
                  <p className="text-sm text-muted-foreground mt-1">Please check your connection and try again</p>
                </div>
              </CardContent>
            </Card>
          ) : !devices || devices.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                <div className="text-center">
                  <MonitorSmartphone className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">No devices found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {typeFilter !== 'all' || categoryFilter !== 'all' || statusFilter !== 'all'
                      ? 'Try adjusting your filters or add a new device'
                      : 'Get started by adding your first network device'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {devices.map(renderDeviceCard)}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="max-h-[70vh] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Device</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden md:table-cell">CPU</TableHead>
                        <TableHead className="hidden lg:table-cell">Memory</TableHead>
                        <TableHead className="hidden lg:table-cell">Location</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {devices.map(renderDeviceListRow)}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Device Detail Modal */}
      {renderDetailModal()}
    </div>
  );
}

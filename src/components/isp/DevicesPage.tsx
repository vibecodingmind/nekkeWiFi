'use client';

import { useState } from 'react';
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
import {
  Plus,
  Router,
  Wifi,
  Radio,
  Server,
  Network,
  Eye,
  Clock,
  MapPin,
} from 'lucide-react';
import { formatDate, formatDateTime, getStatusColor, getDeviceTypeIcon } from '@/lib/helpers';

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
}

interface Device {
  id: string;
  name: string;
  type: string;
  model: string | null;
  ipAddress: string;
  port: number;
  firmware: string | null;
  serialNumber: string | null;
  location: string | null;
  status: string;
  lastSeenAt: string | null;
  totalBandwidth: string | null;
  createdAt: string;
  organization: { id: string; name: string };
  _count: {
    interfaces: number;
    subscriptions: number;
    provisioningRules: number;
  };
}

interface DeviceDetail extends Device {
  interfaces: DeviceInterface[];
}

export default function DevicesPage({ orgId }: DevicesPageProps) {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<DeviceDetail | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'mikrotik',
    model: '',
    ipAddress: '',
    port: '8728',
    apiUser: '',
    apiPassword: '',
    location: '',
    totalBandwidth: '',
  });
  const [formError, setFormError] = useState('');

  const { data: devices, isLoading } = useQuery<Device[]>({
    queryKey: ['devices', orgId, typeFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (orgId) params.set('orgId', orgId);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/devices?${params}`);
      if (!res.ok) throw new Error('Failed to load devices');
      return res.json();
    },
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: async (form: typeof formData) => {
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: orgId,
          ...form,
          port: parseInt(form.port),
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
      setFormData({
        name: '', type: 'mikrotik', model: '', ipAddress: '',
        port: '8728', apiUser: '', apiPassword: '', location: '', totalBandwidth: '',
      });
      setFormError('');
    },
    onError: (err) => {
      setFormError(err.message);
    },
  });

  const viewDevice = async (id: string) => {
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
  };

  const handleCreate = () => {
    if (!formData.name || !formData.ipAddress || !formData.apiUser || !formData.apiPassword) {
      setFormError('Name, IP address, API user, and API password are required');
      return;
    }
    createMutation.mutate(formData);
  };

  const getDeviceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'mikrotik': return <Router className="h-5 w-5" />;
      case 'tplink': return <Wifi className="h-5 w-5" />;
      case 'ubiquiti': return <Radio className="h-5 w-5" />;
      case 'cisco': return <Server className="h-5 w-5" />;
      case 'juniper': return <Network className="h-5 w-5" />;
      default: return <Router className="h-5 w-5" />;
    }
  };

  const getDeviceIconColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'mikrotik': return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30';
      case 'tplink': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
      case 'ubiquiti': return 'text-violet-600 bg-violet-100 dark:bg-violet-900/30';
      case 'cisco': return 'text-sky-600 bg-sky-100 dark:bg-sky-900/30';
      case 'juniper': return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30';
      default: return 'text-zinc-600 bg-zinc-100 dark:bg-zinc-800';
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Devices</h1>
          <p className="text-muted-foreground mt-1">Manage network devices</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add Device
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Device</DialogTitle>
              <DialogDescription>Register a new network device</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {formError && (
                <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">{formError}</p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Device Name *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Main Router" />
                </div>
                <div className="space-y-2">
                  <Label>Device Type *</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mikrotik">MikroTik</SelectItem>
                      <SelectItem value="tplink">TP-Link</SelectItem>
                      <SelectItem value="ubiquiti">Ubiquiti</SelectItem>
                      <SelectItem value="cisco">Cisco</SelectItem>
                      <SelectItem value="juniper">Juniper</SelectItem>
                      <SelectItem value="generic">Generic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Input value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} placeholder="CCR2004-1G-12S+2XS" />
                </div>
                <div className="space-y-2">
                  <Label>IP Address *</Label>
                  <Input value={formData.ipAddress} onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })} placeholder="192.168.1.1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>API Username *</Label>
                  <Input value={formData.apiUser} onChange={(e) => setFormData({ ...formData, apiUser: e.target.value })} placeholder="admin" />
                </div>
                <div className="space-y-2">
                  <Label>API Password *</Label>
                  <Input type="password" value={formData.apiPassword} onChange={(e) => setFormData({ ...formData, apiPassword: e.target.value })} placeholder="password" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="Data Center A" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {createMutation.isPending ? 'Adding...' : 'Add Device'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Device Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="mikrotik">MikroTik</SelectItem>
            <SelectItem value="tplink">TP-Link</SelectItem>
            <SelectItem value="ubiquiti">Ubiquiti</SelectItem>
            <SelectItem value="cisco">Cisco</SelectItem>
            <SelectItem value="juniper">Juniper</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!orgId ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center">
              <Router className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Select an organization to view devices</p>
            </div>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6 space-y-4"><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-48" /><Skeleton className="h-4 w-20" /></CardContent></Card>
          ))}
        </div>
      ) : !devices || devices.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center">
              <Router className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No devices found</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {devices.map((device) => (
            <Card key={device.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => viewDevice(device.id)}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${getDeviceIconColor(device.type)}`}>
                      {getDeviceIcon(device.type)}
                    </div>
                    <div>
                      <h3 className="font-semibold">{device.name}</h3>
                      <p className="text-xs text-muted-foreground capitalize">{device.type} {device.model ? `- ${device.model}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${
                      device.status === 'online' ? 'bg-emerald-500' :
                      device.status === 'offline' ? 'bg-red-500' :
                      device.status === 'warning' ? 'bg-amber-500' :
                      'bg-zinc-400'
                    }`} />
                    <Badge variant="secondary" className={`text-xs ${getStatusColor(device.status)}`}>
                      {device.status}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="font-mono text-xs">{device.ipAddress}:{device.port}</span>
                  </div>
                  {device.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{device.location}</span>
                    </div>
                  )}
                  {device.lastSeenAt && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatDateTime(device.lastSeenAt)}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-4 border-t flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {device._count.interfaces} interfaces
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {device._count.subscriptions} subscribers
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Device Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedDevice?.name}</DialogTitle>
            <DialogDescription>
              {selectedDevice?.type?.toUpperCase()} {selectedDevice?.model ? `- ${selectedDevice.model}` : ''} | {selectedDevice?.ipAddress}
            </DialogDescription>
          </DialogHeader>
          {selectedDevice && (
            <div className="space-y-6 py-4">
              {/* Device Info */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{selectedDevice._count.interfaces}</p>
                  <p className="text-xs text-muted-foreground">Interfaces</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{selectedDevice._count.subscriptions}</p>
                  <p className="text-xs text-muted-foreground">Subscribers</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <Badge variant="secondary" className={getStatusColor(selectedDevice.status)}>
                    {selectedDevice.status}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">Status</p>
                </div>
              </div>

              {/* Interfaces Table */}
              {selectedDevice.interfaces && selectedDevice.interfaces.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Interfaces</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>MAC</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>RX</TableHead>
                        <TableHead>TX</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedDevice.interfaces.map((iface) => (
                        <TableRow key={iface.id}>
                          <TableCell className="font-mono text-sm">{iface.name}</TableCell>
                          <TableCell>{iface.type ?? '-'}</TableCell>
                          <TableCell className="font-mono text-xs">{iface.macAddress ?? '-'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`text-xs ${getStatusColor(iface.status)}`}>
                              {iface.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{formatBytes(iface.rxBytes)}</TableCell>
                          <TableCell className="text-sm">{formatBytes(iface.txBytes)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

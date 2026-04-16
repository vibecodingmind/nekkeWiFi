'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Link2, Eye } from 'lucide-react';
import { formatTZS, formatDate, getStatusColor } from '@/lib/helpers';

interface SubscriptionsPageProps {
  orgId: string | null;
}

interface Plan {
  id: string;
  name: string;
  speedDown: string;
  speedUp: string;
  priceMonthly: number;
}

interface Device {
  id: string;
  name: string;
  type: string;
  ipAddress: string;
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
}

interface Subscription {
  id: string;
  status: string;
  startDate: string;
  endDate: string | null;
  billingCycle: string;
  autoRenew: boolean;
  username: string | null;
  ipAssignment: string | null;
  notes: string | null;
  customer: Customer;
  plan: Plan;
  device: Device | null;
  _count: {
    invoices: number;
    usageRecords: number;
  };
}

export default function SubscriptionsPage({ orgId }: SubscriptionsPageProps) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [formData, setFormData] = useState({
    customerId: '',
    planId: '',
    deviceId: '',
    billingCycle: 'monthly',
    autoRenew: true,
  });
  const [formError, setFormError] = useState('');

  const { data: subscriptions, isLoading } = useQuery<Subscription[]>({
    queryKey: ['subscriptions', orgId, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (orgId) params.set('orgId', orgId);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/subscriptions?${params}`);
      if (!res.ok) throw new Error('Failed to load subscriptions');
      return res.json();
    },
    enabled: !!orgId,
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ['customers-list', orgId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (orgId) params.set('orgId', orgId);
      params.set('limit', '100');
      const res = await fetch(`/api/customers?${params}`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    enabled: !!orgId && createOpen,
  });

  const { data: plans } = useQuery<Plan[]>({
    queryKey: ['plans-list', orgId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (orgId) params.set('orgId', orgId);
      const res = await fetch(`/api/plans?${params}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!orgId && createOpen,
  });

  const { data: devices } = useQuery<Device[]>({
    queryKey: ['devices-list', orgId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (orgId) params.set('orgId', orgId);
      const res = await fetch(`/api/devices?${params}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!orgId && createOpen,
  });

  const createMutation = useMutation({
    mutationFn: async (form: typeof formData) => {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: orgId,
          customerId: form.customerId,
          planId: form.planId,
          deviceId: form.deviceId || null,
          billingCycle: form.billingCycle,
          autoRenew: form.autoRenew,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create subscription');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      setCreateOpen(false);
      setFormData({ customerId: '', planId: '', deviceId: '', billingCycle: 'monthly', autoRenew: true });
      setFormError('');
    },
    onError: (err) => {
      setFormError(err.message);
    },
  });

  const handleCreate = () => {
    if (!formData.customerId || !formData.planId) {
      setFormError('Customer and plan are required');
      return;
    }
    createMutation.mutate(formData);
  };

  const viewSubscription = async (id: string) => {
    try {
      const res = await fetch(`/api/subscriptions/${id}`);
      if (res.ok) {
        const detail = await res.json();
        setSelectedSub(detail);
        setDetailOpen(true);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
          <p className="text-muted-foreground mt-1">Manage customer subscriptions</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                New Subscription
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Subscription</DialogTitle>
                <DialogDescription>Assign a plan to a customer</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {formError && (
                  <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">{formError}</p>
                )}
                <div className="space-y-2">
                  <Label>Customer *</Label>
                  <Select value={formData.customerId} onValueChange={(v) => setFormData({ ...formData, customerId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                    <SelectContent>
                      {customers?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.firstName} {c.lastName} ({c.phone})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Plan *</Label>
                  <Select value={formData.planId} onValueChange={(v) => setFormData({ ...formData, planId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                    <SelectContent>
                      {plans?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} - {formatTZS(p.priceMonthly)}/mo
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Device (optional)</Label>
                  <Select value={formData.deviceId} onValueChange={(v) => setFormData({ ...formData, deviceId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select device" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {devices?.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name} ({d.ipAddress})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Billing Cycle</Label>
                    <Select value={formData.billingCycle} onValueChange={(v) => setFormData({ ...formData, billingCycle: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2 pb-1">
                    <input
                      type="checkbox"
                      checked={formData.autoRenew}
                      onChange={(e) => setFormData({ ...formData, autoRenew: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label>Auto-Renew</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {createMutation.isPending ? 'Creating...' : 'Create Subscription'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!orgId ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center">
              <Link2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Select an organization to view subscriptions</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Billing Cycle</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Auto-Renew</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!subscriptions || subscriptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <Link2 className="h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">No subscriptions found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    subscriptions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">
                          {sub.customer.firstName} {sub.customer.lastName}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{sub.plan.name}</p>
                            <p className="text-xs text-muted-foreground">{sub.plan.speedDown}/{sub.plan.speedUp}</p>
                          </div>
                        </TableCell>
                        <TableCell>{sub.device ? sub.device.name : '-'}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={getStatusColor(sub.status)}>
                            {sub.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{sub.username ?? '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-xs">
                            {sub.billingCycle}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(sub.startDate)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={sub.autoRenew ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-zinc-100 text-zinc-600'}>
                            {sub.autoRenew ? 'Yes' : 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => viewSubscription(sub.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Subscription Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Subscription Details</DialogTitle>
            <DialogDescription>View subscription information</DialogDescription>
          </DialogHeader>
          {selectedSub && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedSub.customer.firstName} {selectedSub.customer.lastName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Plan</p>
                  <p className="font-medium">{selectedSub.plan.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedSub.plan.speedDown}/{selectedSub.plan.speedUp} - {formatTZS(selectedSub.plan.priceMonthly)}/mo</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant="secondary" className={getStatusColor(selectedSub.status)}>
                    {selectedSub.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Billing Cycle</p>
                  <p className="capitalize">{selectedSub.billingCycle}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                  <p>{formatDate(selectedSub.startDate)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">End Date</p>
                  <p>{selectedSub.endDate ? formatDate(selectedSub.endDate) : 'Ongoing'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">PPPoE Username</p>
                  <p className="font-mono text-sm">{selectedSub.username ?? '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">IP Assignment</p>
                  <p className="font-mono text-sm">{selectedSub.ipAssignment ?? '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Device</p>
                  <p>{selectedSub.device ? `${selectedSub.device.name} (${selectedSub.device.ipAddress})` : 'None'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Auto-Renew</p>
                  <p>{selectedSub.autoRenew ? 'Yes' : 'No'}</p>
                </div>
              </div>
              {selectedSub.notes && (
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium text-muted-foreground">Notes</p>
                  <p className="text-sm mt-1">{selectedSub.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

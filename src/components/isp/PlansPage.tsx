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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Package, Download, Upload, Star, Trash2 } from 'lucide-react';
import { formatTZS, formatDate } from '@/lib/helpers';

interface PlansPageProps {
  orgId: string | null;
}

interface Plan {
  id: string;
  name: string;
  description: string | null;
  speedDown: string;
  speedUp: string;
  dataCap: number | null;
  priceMonthly: number;
  priceQuarterly: number | null;
  priceYearly: number | null;
  setupFee: number;
  isActive: boolean;
  isPopular: boolean;
  createdAt: string;
  organization: { id: string; name: string };
  _count: {
    subscriptions: number;
  };
}

export default function PlansPage({ orgId }: PlansPageProps) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    speedDown: '',
    speedUp: '',
    dataCap: '',
    priceMonthly: '',
    priceQuarterly: '',
    priceYearly: '',
    setupFee: '0',
    isPopular: false,
  });
  const [formError, setFormError] = useState('');

  const { data: plans, isLoading } = useQuery<Plan[]>({
    queryKey: ['plans', orgId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (orgId) params.set('orgId', orgId);
      params.set('isActive', 'true');
      const res = await fetch(`/api/plans?${params}`);
      if (!res.ok) throw new Error('Failed to load plans');
      return res.json();
    },
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: async (form: typeof formData) => {
      const payload: Record<string, unknown> = {
        organizationId: orgId,
        name: form.name,
        description: form.description || null,
        speedDown: form.speedDown,
        speedUp: form.speedUp,
        priceMonthly: parseFloat(form.priceMonthly),
        setupFee: parseFloat(form.setupFee) || 0,
        isPopular: form.isPopular,
        isActive: true,
      };
      if (form.dataCap) payload.dataCap = parseInt(form.dataCap);
      if (form.priceQuarterly) payload.priceQuarterly = parseFloat(form.priceQuarterly);
      if (form.priceYearly) payload.priceYearly = parseFloat(form.priceYearly);

      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create plan');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setCreateOpen(false);
      setFormData({
        name: '', description: '', speedDown: '', speedUp: '',
        dataCap: '', priceMonthly: '', priceQuarterly: '', priceYearly: '',
        setupFee: '0', isPopular: false,
      });
      setFormError('');
    },
    onError: (err) => {
      setFormError(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/plans/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete plan');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
  });

  const handleCreate = () => {
    if (!formData.name || !formData.speedDown || !formData.speedUp || !formData.priceMonthly) {
      setFormError('Name, speeds, and monthly price are required');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Plans</h1>
          <p className="text-muted-foreground mt-1">Manage your service packages</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              New Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Plan</DialogTitle>
              <DialogDescription>Add a new service package</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {formError && (
                <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">{formError}</p>
              )}
              <div className="space-y-2">
                <Label>Plan Name *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Fiber 50Mbps" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Plan description..." rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Download Speed *</Label>
                  <Input value={formData.speedDown} onChange={(e) => setFormData({ ...formData, speedDown: e.target.value })} placeholder="50Mbps" />
                </div>
                <div className="space-y-2">
                  <Label>Upload Speed *</Label>
                  <Input value={formData.speedUp} onChange={(e) => setFormData({ ...formData, speedUp: e.target.value })} placeholder="10Mbps" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Data Cap (MB, empty for unlimited)</Label>
                <Input value={formData.dataCap} onChange={(e) => setFormData({ ...formData, dataCap: e.target.value })} placeholder="Unlimited" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Monthly Price *</Label>
                  <Input type="number" value={formData.priceMonthly} onChange={(e) => setFormData({ ...formData, priceMonthly: e.target.value })} placeholder="50000" />
                </div>
                <div className="space-y-2">
                  <Label>Quarterly Price</Label>
                  <Input type="number" value={formData.priceQuarterly} onChange={(e) => setFormData({ ...formData, priceQuarterly: e.target.value })} placeholder="140000" />
                </div>
                <div className="space-y-2">
                  <Label>Yearly Price</Label>
                  <Input type="number" value={formData.priceYearly} onChange={(e) => setFormData({ ...formData, priceYearly: e.target.value })} placeholder="500000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Setup Fee</Label>
                  <Input type="number" value={formData.setupFee} onChange={(e) => setFormData({ ...formData, setupFee: e.target.value })} placeholder="0" />
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <Switch checked={formData.isPopular} onCheckedChange={(v) => setFormData({ ...formData, isPopular: v })} />
                  <Label>Popular Plan</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {createMutation.isPending ? 'Creating...' : 'Create Plan'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!orgId ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center">
              <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Select an organization to view plans</p>
            </div>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !plans || plans.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center">
              <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No plans found</p>
              <p className="text-sm text-muted-foreground">Create your first service plan</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.id} className="relative overflow-hidden">
              {plan.isPopular && (
                <div className="absolute top-0 right-0">
                  <div className="bg-emerald-500 text-white text-xs font-medium px-3 py-1 rounded-bl-lg flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    Popular
                  </div>
                </div>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500"
                    onClick={() => deleteMutation.mutate(plan.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {plan.description && (
                  <CardDescription className="text-sm">{plan.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Speed */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Download className="h-4 w-4 text-emerald-500" />
                    <span className="font-medium">{plan.speedDown}</span>
                    <span className="text-muted-foreground text-xs">down</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Upload className="h-4 w-4 text-teal-500" />
                    <span className="font-medium">{plan.speedUp}</span>
                    <span className="text-muted-foreground text-xs">up</span>
                  </div>
                </div>

                {/* Data Cap */}
                <div>
                  <Badge variant="secondary" className="text-xs">
                    {plan.dataCap ? `${(plan.dataCap / 1024).toFixed(0)} GB` : 'Unlimited'}
                  </Badge>
                </div>

                {/* Pricing */}
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-emerald-600">{formatTZS(plan.priceMonthly)}</p>
                  <p className="text-xs text-muted-foreground">per month</p>
                </div>

                {plan.priceQuarterly && (
                  <p className="text-sm text-muted-foreground">
                    Quarterly: {formatTZS(plan.priceQuarterly)}
                  </p>
                )}
                {plan.priceYearly && (
                  <p className="text-sm text-muted-foreground">
                    Yearly: {formatTZS(plan.priceYearly)}
                  </p>
                )}
                {plan.setupFee > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Setup fee: {formatTZS(plan.setupFee)}
                  </p>
                )}

                {/* Subscriber Count */}
                <div className="pt-3 border-t flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {plan._count.subscriptions} active subscribers
                  </span>
                  <Badge variant="secondary" className={plan.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-zinc-100 text-zinc-600'}>
                    {plan.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

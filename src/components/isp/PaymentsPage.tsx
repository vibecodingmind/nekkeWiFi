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
import { Plus, CreditCard, DollarSign } from 'lucide-react';
import { formatTZS, formatDate, formatDateTime, getStatusColor, getPaymentMethodColor, formatPaymentMethod } from '@/lib/helpers';

interface PaymentsPageProps {
  orgId: string | null;
}

interface Payment {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  receiptNumber: string | null;
  status: string;
  notes: string | null;
  paidAt: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string;
  };
  invoice: {
    id: string;
    invoiceNumber: string;
    total: number;
    status: string;
  } | null;
}

export default function PaymentsPage({ orgId }: PaymentsPageProps) {
  const queryClient = useQueryClient();
  const [methodFilter, setMethodFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    customerId: '',
    invoiceId: '',
    amount: '',
    method: 'cash',
    reference: '',
  });
  const [formError, setFormError] = useState('');

  const { data, isLoading } = useQuery<{ data: Payment[]; summary: { count: number; totalAmount: number } }>({
    queryKey: ['payments', orgId, methodFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (orgId) params.set('orgId', orgId);
      if (methodFilter !== 'all') params.set('method', methodFilter);
      const res = await fetch(`/api/payments?${params}`);
      if (!res.ok) throw new Error('Failed to load payments');
      return res.json();
    },
    enabled: !!orgId,
  });

  const { data: customers } = useQuery({
    queryKey: ['customers-payment', orgId],
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

  const { data: invoices } = useQuery({
    queryKey: ['invoices-payment', orgId, formData.customerId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (orgId) params.set('orgId', orgId);
      if (formData.customerId) params.set('customerId', formData.customerId);
      params.set('status', 'pending');
      params.set('limit', '50');
      const res = await fetch(`/api/invoices?${params}`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    enabled: !!orgId && createOpen && !!formData.customerId,
  });

  const createMutation = useMutation({
    mutationFn: async (form: typeof formData) => {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: orgId,
          customerId: form.customerId,
          invoiceId: form.invoiceId || null,
          amount: parseFloat(form.amount),
          method: form.method,
          reference: form.reference || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create payment');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setCreateOpen(false);
      setFormData({ customerId: '', invoiceId: '', amount: '', method: 'cash', reference: '' });
      setFormError('');
    },
    onError: (err) => {
      setFormError(err.message);
    },
  });

  const handleCreate = () => {
    if (!formData.customerId || !formData.amount) {
      setFormError('Customer and amount are required');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground mt-1">Track and record payments</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="mobile_money">Mobile Money</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="online">Online</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Record Payment</DialogTitle>
                <DialogDescription>Add a new payment record</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {formError && (
                  <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">{formError}</p>
                )}
                <div className="space-y-2">
                  <Label>Customer *</Label>
                  <Select value={formData.customerId} onValueChange={(v) => setFormData({ ...formData, customerId: v, invoiceId: '' })}>
                    <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                    <SelectContent>
                      {customers?.map((c: { id: string; firstName: string; lastName: string }) => (
                        <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Invoice (optional)</Label>
                  <Select value={formData.invoiceId} onValueChange={(v) => setFormData({ ...formData, invoiceId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Invoice</SelectItem>
                      {invoices?.map((inv: { id: string; invoiceNumber: string; total: number; status: string }) => (
                        <SelectItem key={inv.id} value={inv.id}>
                          {inv.invoiceNumber} - {formatTZS(inv.total)} ({inv.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount *</Label>
                    <Input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="50000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Method</Label>
                    <Select value={formData.method} onValueChange={(v) => setFormData({ ...formData, method: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="mobile_money">Mobile Money</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Reference</Label>
                  <Input value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} placeholder="Transaction reference" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {createMutation.isPending ? 'Recording...' : 'Record Payment'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Total Collected</p>
              </div>
              <p className="text-2xl font-bold">{formatTZS(data.summary.totalAmount)}</p>
              <p className="text-xs text-muted-foreground mt-1">{data.summary.count} completed payments</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-teal-600" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
              </div>
              <p className="text-2xl font-bold">{data.data.length}</p>
              <p className="text-xs text-muted-foreground mt-1">All payment records</p>
            </CardContent>
          </Card>
        </div>
      )}

      {!orgId ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center">
              <CreditCard className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Select an organization to view payments</p>
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
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!data?.data || data.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <CreditCard className="h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">No payments found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.data.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          {payment.customer.firstName} {payment.customer.lastName}
                        </TableCell>
                        <TableCell className="font-medium">{formatTZS(payment.amount)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={getPaymentMethodColor(payment.method)}>
                            {formatPaymentMethod(payment.method)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {payment.reference ?? '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {payment.invoice?.invoiceNumber ?? '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={getStatusColor(payment.status)}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDateTime(payment.paidAt)}
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
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Plus,
  CreditCard,
  DollarSign,
  Smartphone,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  Wifi,
} from 'lucide-react';
import {
  formatTZS,
  formatDate,
  formatDateTime,
  getStatusColor,
  getPaymentMethodColor,
  getPaymentChannelColor,
  formatPaymentMethod,
  formatPaymentChannel,
} from '@/lib/helpers';

// ────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────

interface PaymentsPageProps {
  orgId: string | null;
}

interface Payment {
  id: string;
  amount: number;
  method: string;
  paymentChannel: string | null;
  gateway: string | null;
  reference: string | null;
  pesapalTrackingId: string | null;
  pesapalMerchantRef: string | null;
  pesapalPaymentMethod: string | null;
  receiptNumber: string | null;
  status: string;
  notes: string | null;
  paidAt: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
  };
  invoice: {
    id: string;
    invoiceNumber: string;
    total: number;
    status: string;
  } | null;
}

interface PaymentsResponse {
  data: Payment[];
  summary: {
    count: number;
    totalAmount: number;
    pesapalCount: number;
    pesapalAmount: number;
    manualCount: number;
    manualAmount: number;
  };
}

interface CustomerItem {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
}

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  total: number;
  balanceDue: number;
  status: string;
  customer: { id: string; firstName: string; lastName: string };
}

interface PesapalConfig {
  isEnabled: boolean;
  mode: string;
  consumerKey: string;
  connected: boolean;
  availableMethods: string[];
}

interface PesapalOrderResult {
  orderTrackingId: string;
  merchantReference: string;
  redirectUrl: string;
  status: string;
}

// ────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────

const MOBILE_MONEY_CHANNELS = [
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'airtel_money', label: 'Airtel Money' },
  { value: 'tigo_pesa', label: 'Tigo Pesa' },
  { value: 'halotel', label: 'Halotel' },
  { value: 'ttcl_pesa', label: 'TTCL Pesa' },
];

const PESAPAL_CHANNELS = [
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'airtel_money', label: 'Airtel Money' },
  { value: 'tigo_pesa', label: 'Tigo Pesa' },
  { value: 'halotel', label: 'Halotel' },
  { value: 'ttcl_pesa', label: 'TTCL Pesa' },
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
];

// ────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────

export default function PaymentsPage({ orgId }: PaymentsPageProps) {
  const queryClient = useQueryClient();

  // ── Filters ───────────────────────────────────────────────────
  const [methodFilter, setMethodFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [gatewayFilter, setGatewayFilter] = useState('all');

  // ── Manual Payment Dialog ─────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    customerId: '',
    invoiceId: '',
    amount: '',
    method: 'cash',
    paymentChannel: '',
    reference: '',
    notes: '',
  });
  const [manualError, setManualError] = useState('');

  // ── Pesapal Dialog ────────────────────────────────────────────
  const [pesapalOpen, setPesapalOpen] = useState(false);
  const [pesapalForm, setPesapalForm] = useState({
    customerId: '',
    invoiceId: '',
    amount: '',
    paymentChannel: '',
    phone: '',
    email: '',
    firstName: '',
    lastName: '',
  });
  const [pesapalError, setPesapalError] = useState('');
  const [pesapalResult, setPesapalResult] = useState<PesapalOrderResult | null>(null);
  const [pesapalPolling, setPesapalPolling] = useState(false);

  // ────────────────────────────────────────────────────────────────
  // Queries
  // ────────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery<PaymentsResponse>({
    queryKey: ['payments', orgId, methodFilter, channelFilter, gatewayFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (orgId) params.set('orgId', orgId);
      if (methodFilter !== 'all') params.set('method', methodFilter);
      if (channelFilter !== 'all') params.set('paymentChannel', channelFilter);
      if (gatewayFilter !== 'all') params.set('gateway', gatewayFilter);
      const res = await fetch(`/api/payments?${params}`);
      if (!res.ok) throw new Error('Failed to load payments');
      return res.json();
    },
    enabled: !!orgId,
  });

  const { data: customers } = useQuery<CustomerItem[]>({
    queryKey: ['customers-payment', orgId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (orgId) params.set('orgId', orgId);
      params.set('limit', '200');
      const res = await fetch(`/api/customers?${params}`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    enabled: !!orgId && (createOpen || pesapalOpen),
  });

  const { data: invoices } = useQuery<InvoiceItem[]>({
    queryKey: ['invoices-payment', orgId, manualForm.customerId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (orgId) params.set('orgId', orgId);
      if (manualForm.customerId) params.set('customerId', manualForm.customerId);
      params.set('status', 'pending');
      params.set('limit', '50');
      const res = await fetch(`/api/invoices?${params}`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    enabled: !!orgId && createOpen && !!manualForm.customerId,
  });

  const { data: pesapalInvoices } = useQuery<InvoiceItem[]>({
    queryKey: ['invoices-pesapal', orgId, pesapalForm.customerId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (orgId) params.set('orgId', orgId);
      if (pesapalForm.customerId) params.set('customerId', pesapalForm.customerId);
      params.set('status', 'pending');
      params.set('limit', '50');
      const res = await fetch(`/api/invoices?${params}`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    enabled: !!orgId && pesapalOpen && !!pesapalForm.customerId,
  });

  const { data: pesapalConfig } = useQuery<PesapalConfig>({
    queryKey: ['pesapal-config', orgId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (orgId) params.set('orgId', orgId);
      const res = await fetch(`/api/pesapal?${params}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!orgId,
  });

  // ────────────────────────────────────────────────────────────────
  // Mutations
  // ────────────────────────────────────────────────────────────────

  const createPaymentMutation = useMutation({
    mutationFn: async (form: typeof manualForm) => {
      const payload: Record<string, unknown> = {
        organizationId: orgId,
        customerId: form.customerId,
        invoiceId: form.invoiceId || null,
        amount: parseFloat(form.amount),
        method: form.method,
        reference: form.reference || null,
        notes: form.notes || null,
      };
      if (form.method === 'mobile_money' && form.paymentChannel) {
        (payload as Record<string, unknown>).paymentChannel = form.paymentChannel;
      }
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create payment');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setCreateOpen(false);
      setManualForm({
        customerId: '',
        invoiceId: '',
        amount: '',
        method: 'cash',
        paymentChannel: '',
        reference: '',
        notes: '',
      });
      setManualError('');
    },
    onError: (err) => {
      setManualError(err.message);
    },
  });

  const createPesapalOrderMutation = useMutation({
    mutationFn: async (form: typeof pesapalForm) => {
      const selectedCustomer = customers?.find((c) => c.id === form.customerId);
      const names = selectedCustomer
        ? { firstName: selectedCustomer.firstName, lastName: selectedCustomer.lastName }
        : { firstName: form.firstName, lastName: form.lastName };

      const payload = {
        organizationId: orgId,
        customerId: form.customerId,
        invoiceId: form.invoiceId || null,
        amount: parseFloat(form.amount),
        currency: 'TZS',
        paymentChannel: form.paymentChannel,
        phone: form.phone,
        email: form.email,
        firstName: names.firstName,
        lastName: names.lastName,
      };

      const res = await fetch('/api/pesapal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create Pesapal order');
      }
      return res.json() as Promise<PesapalOrderResult>;
    },
    onSuccess: (result) => {
      setPesapalResult(result);
      setPesapalPolling(true);
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (err) => {
      setPesapalError(err.message);
    },
  });

  // ── Pesapal status polling ────────────────────────────────────
  const pollPesapalStatus = useCallback(
    async (trackingId: string) => {
      try {
        const params = new URLSearchParams();
        if (orgId) params.set('orgId', orgId);
        params.set('trackingId', trackingId);
        const res = await fetch(`/api/pesapal/status?${params}`);
        if (res.ok) {
          const json = await res.json();
          setPesapalResult((prev) =>
            prev ? { ...prev, status: json.status || prev.status } : prev
          );
          if (json.status === 'completed' || json.status === 'failed' || json.status === 'cancelled') {
            setPesapalPolling(false);
            queryClient.invalidateQueries({ queryKey: ['payments'] });
          }
        }
      } catch {
        // ignore polling errors
      }
    },
    [orgId, queryClient]
  );

  useEffect(() => {
    if (!pesapalPolling || !pesapalResult?.orderTrackingId) return;
    const interval = setInterval(() => {
      pollPesapalStatus(pesapalResult.orderTrackingId);
    }, 5000);
    return () => clearInterval(interval);
  }, [pesapalPolling, pesapalResult?.orderTrackingId, pollPesapalStatus]);

  // ────────────────────────────────────────────────────────────────
  // Handlers
  // ────────────────────────────────────────────────────────────────

  const handleManualCreate = () => {
    if (!manualForm.customerId || !manualForm.amount) {
      setManualError('Customer and amount are required');
      return;
    }
    if (manualForm.method === 'mobile_money' && !manualForm.paymentChannel) {
      setManualError('Please select a payment channel for Mobile Money');
      return;
    }
    createPaymentMutation.mutate(manualForm);
  };

  const handlePesapalSubmit = () => {
    if (!pesapalForm.customerId || !pesapalForm.amount || !pesapalForm.paymentChannel) {
      setPesapalError('Customer, amount, and payment channel are required');
      return;
    }
    setPesapalError('');
    setPesapalResult(null);
    setPesapalPolling(false);
    createPesapalOrderMutation.mutate(pesapalForm);
  };

  const resetPesapalDialog = () => {
    setPesapalOpen(false);
    setTimeout(() => {
      setPesapalForm({
        customerId: '',
        invoiceId: '',
        amount: '',
        paymentChannel: '',
        phone: '',
        email: '',
        firstName: '',
        lastName: '',
      });
      setPesapalError('');
      setPesapalResult(null);
      setPesapalPolling(false);
    }, 200);
  };

  const handlePesapalCustomerChange = (customerId: string) => {
    const customer = customers?.find((c) => c.id === customerId);
    setPesapalForm({
      ...pesapalForm,
      customerId,
      invoiceId: '',
      phone: customer?.phone || '',
      email: customer?.email || '',
      firstName: customer?.firstName || '',
      lastName: customer?.lastName || '',
    });
  };

  const handlePesapalInvoiceChange = (invoiceId: string) => {
    const invoice = pesapalInvoices?.find((inv) => inv.id === invoiceId);
    setPesapalForm({
      ...pesapalForm,
      invoiceId,
      amount: invoice ? invoice.balanceDue.toString() : pesapalForm.amount,
    });
  };

  const handleManualCustomerChange = (customerId: string) => {
    setManualForm({ ...manualForm, customerId, invoiceId: '' });
  };

  const handleManualInvoiceChange = (invoiceId: string) => {
    const invoice = invoices?.find((inv) => inv.id === invoiceId);
    setManualForm({
      ...manualForm,
      invoiceId,
      amount: invoice ? invoice.balanceDue.toString() : manualForm.amount,
    });
  };

  const handleManualMethodChange = (method: string) => {
    setManualForm({
      ...manualForm,
      method,
      paymentChannel: method === 'mobile_money' ? '' : manualForm.paymentChannel,
    });
  };

  // ── Gateway badge helpers ─────────────────────────────────────

  const getGatewayBadge = (gateway: string | null) => {
    if (gateway === 'pesapal') {
      return (
        <Badge
          variant="secondary"
          className="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
        >
          Pesapal
        </Badge>
      );
    }
    return (
      <Badge
        variant="secondary"
        className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
      >
        Manual
      </Badge>
    );
  };

  const getPesapalStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success':
        return (
          <span className="inline-flex items-center gap-1.5 text-emerald-600 text-sm">
            <CheckCircle className="h-3.5 w-3.5" />
            Completed
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 text-red-600 text-sm">
            <XCircle className="h-3.5 w-3.5" />
            Failed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 text-amber-600 text-sm">
            <Clock className="h-3.5 w-3.5" />
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-zinc-500 text-sm">
            <RefreshCw className="h-3.5 w-3.5" />
            {status || 'Processing'}
          </span>
        );
    }
  };

  // ────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
            <p className="text-muted-foreground mt-1">
              Track and record payments with Pesapal integration
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Dialog open={pesapalOpen} onOpenChange={resetPesapalDialog}>
              <DialogTrigger asChild>
                <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                  <Wifi className="h-4 w-4 mr-2" />
                  Send Pesapal Link
                </Button>
              </DialogTrigger>
              {/* Pesapal Dialog Content (below) */}
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Wifi className="h-5 w-5 text-teal-600" />
                    Send Pesapal Payment Link
                  </DialogTitle>
                  <DialogDescription>
                    Create a Pesapal payment order. The customer will receive a payment link.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {pesapalError && (
                    <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                      {pesapalError}
                    </p>
                  )}

                  {/* Result Display */}
                  {pesapalResult && (
                    <div className="border border-teal-200 dark:border-teal-800 rounded-lg p-4 bg-teal-50/50 dark:bg-teal-950/30 space-y-3">
                      <h4 className="font-semibold text-sm text-teal-700 dark:text-teal-400">
                        Order Created Successfully
                      </h4>
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tracking ID</span>
                          <span className="font-mono text-teal-600 dark:text-teal-400">
                            {pesapalResult.orderTrackingId}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Merchant Ref</span>
                          <span className="font-mono">{pesapalResult.merchantReference}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Status</span>
                          {getPesapalStatusBadge(pesapalResult.status)}
                        </div>
                        {pesapalResult.redirectUrl && (
                          <div className="flex justify-between items-center pt-1">
                            <span className="text-muted-foreground">Payment URL</span>
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-teal-600"
                              onClick={() => window.open(pesapalResult.redirectUrl, '_blank')}
                            >
                              Open Link <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                          </div>
                        )}
                      </div>
                      {pesapalPolling && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          Auto-checking payment status...
                        </p>
                      )}
                    </div>
                  )}

                  <Separator />

                  {/* Form Fields */}
                  <div className="space-y-2">
                    <Label>Customer *</Label>
                    <Select
                      value={pesapalForm.customerId}
                      onValueChange={handlePesapalCustomerChange}
                      disabled={!!pesapalResult}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.firstName} {c.lastName} — {c.phone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Invoice (optional)</Label>
                    <Select
                      value={pesapalForm.invoiceId}
                      onValueChange={handlePesapalInvoiceChange}
                      disabled={!pesapalForm.customerId || !!pesapalResult}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select pending invoice" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Invoice</SelectItem>
                        {pesapalInvoices?.map((inv) => (
                          <SelectItem key={inv.id} value={inv.id}>
                            {inv.invoiceNumber} — {formatTZS(inv.balanceDue)} ({inv.status})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Amount (TZS) *</Label>
                      <Input
                        type="number"
                        value={pesapalForm.amount}
                        onChange={(e) =>
                          setPesapalForm({ ...pesapalForm, amount: e.target.value })
                        }
                        placeholder="50000"
                        disabled={!!pesapalResult}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Channel *</Label>
                      <Select
                        value={pesapalForm.paymentChannel}
                        onValueChange={(v) =>
                          setPesapalForm({ ...pesapalForm, paymentChannel: v })
                        }
                        disabled={!!pesapalResult}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select channel" />
                        </SelectTrigger>
                        <SelectContent>
                          {PESAPAL_CHANNELS.map((ch) => (
                            <SelectItem key={ch.value} value={ch.value}>
                              {ch.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Customer Phone</Label>
                      <Input
                        value={pesapalForm.phone}
                        onChange={(e) =>
                          setPesapalForm({ ...pesapalForm, phone: e.target.value })
                        }
                        placeholder="+255700000000"
                        disabled={!!pesapalResult}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Customer Email</Label>
                      <Input
                        type="email"
                        value={pesapalForm.email}
                        onChange={(e) =>
                          setPesapalForm({ ...pesapalForm, email: e.target.value })
                        }
                        placeholder="customer@example.com"
                        disabled={!!pesapalResult}
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={resetPesapalDialog}>
                    {pesapalResult ? 'Close' : 'Cancel'}
                  </Button>
                  {!pesapalResult && (
                    <Button
                      onClick={handlePesapalSubmit}
                      disabled={createPesapalOrderMutation.isPending}
                      className="bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      {createPesapalOrderMutation.isPending
                        ? 'Creating Order...'
                        : 'Create Pesapal Order'}
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog
              open={createOpen}
              onOpenChange={(open) => {
                setCreateOpen(open);
                if (!open) {
                  setManualError('');
                }
              }}
            >
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              </DialogTrigger>
              {/* Manual Payment Dialog Content (below) */}
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Record Manual Payment</DialogTitle>
                  <DialogDescription>
                    Add a new payment record for a customer
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {manualError && (
                    <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                      {manualError}
                    </p>
                  )}

                  <div className="space-y-2">
                    <Label>Customer *</Label>
                    <Select
                      value={manualForm.customerId}
                      onValueChange={handleManualCustomerChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.firstName} {c.lastName} — {c.phone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Invoice (optional)</Label>
                    <Select
                      value={manualForm.invoiceId}
                      onValueChange={handleManualInvoiceChange}
                      disabled={!manualForm.customerId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select pending invoice" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Invoice</SelectItem>
                        {invoices?.map((inv) => (
                          <SelectItem key={inv.id} value={inv.id}>
                            {inv.invoiceNumber} — {formatTZS(inv.balanceDue)} ({inv.status})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Amount (TZS) *</Label>
                      <Input
                        type="number"
                        value={manualForm.amount}
                        onChange={(e) =>
                          setManualForm({ ...manualForm, amount: e.target.value })
                        }
                        placeholder="50000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Method *</Label>
                      <Select
                        value={manualForm.method}
                        onValueChange={handleManualMethodChange}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="mobile_money">Mobile Money</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Mobile Money Channel Sub-select */}
                  {manualForm.method === 'mobile_money' && (
                    <div className="space-y-2">
                      <Label>Payment Channel *</Label>
                      <Select
                        value={manualForm.paymentChannel}
                        onValueChange={(v) =>
                          setManualForm({ ...manualForm, paymentChannel: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select channel" />
                        </SelectTrigger>
                        <SelectContent>
                          {MOBILE_MONEY_CHANNELS.map((ch) => (
                            <SelectItem key={ch.value} value={ch.value}>
                              {ch.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Reference</Label>
                    <Input
                      value={manualForm.reference}
                      onChange={(e) =>
                        setManualForm({ ...manualForm, reference: e.target.value })
                      }
                      placeholder="Transaction reference"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Input
                      value={manualForm.notes}
                      onChange={(e) =>
                        setManualForm({ ...manualForm, notes: e.target.value })
                      }
                      placeholder="Optional notes"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleManualCreate}
                    disabled={createPaymentMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {createPaymentMutation.isPending
                      ? 'Recording...'
                      : 'Record Payment'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* ── No Organization Selected ────────────────────────────── */}
        {!orgId ? (
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <div className="text-center">
                <CreditCard className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  Select an organization to view payments
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* ── Summary Stats (4 cards) ─────────────────────────── */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <Skeleton className="h-10 w-10 rounded-lg" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <Skeleton className="h-8 w-32 mb-1" />
                      <Skeleton className="h-3 w-20" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              data && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Collected */}
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                          <DollarSign className="h-5 w-5 text-emerald-600" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Total Collected
                        </p>
                      </div>
                      <p className="text-2xl font-bold">
                        {formatTZS(data.summary.totalAmount)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        All time revenue
                      </p>
                    </CardContent>
                  </Card>

                  {/* Total Transactions */}
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                          <CreditCard className="h-5 w-5 text-violet-600" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Total Transactions
                        </p>
                      </div>
                      <p className="text-2xl font-bold">{data.data.length}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {data.summary.count} payment records
                      </p>
                    </CardContent>
                  </Card>

                  {/* Pesapal Payments */}
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                          <Wifi className="h-5 w-5 text-teal-600" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Pesapal Payments
                        </p>
                      </div>
                      <p className="text-2xl font-bold">
                        {formatTZS(data.summary.pesapalAmount)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {data.summary.pesapalCount} via Pesapal gateway
                      </p>
                    </CardContent>
                  </Card>

                  {/* Manual Payments */}
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                          <Smartphone className="h-5 w-5 text-amber-600" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Manual Payments
                        </p>
                      </div>
                      <p className="text-2xl font-bold">
                        {formatTZS(data.summary.manualAmount)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {data.summary.manualCount} recorded manually
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )
            )}

            {/* ── Filters Row ─────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-3">
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="pesapal">Pesapal</SelectItem>
                </SelectContent>
              </Select>

              <Select value={channelFilter} onValueChange={setChannelFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  {MOBILE_MONEY_CHANNELS.map((ch) => (
                    <SelectItem key={ch.value} value={ch.value}>
                      {ch.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="visa">Visa</SelectItem>
                  <SelectItem value="mastercard">Mastercard</SelectItem>
                  <SelectItem value="bank_transfer">Bank</SelectItem>
                </SelectContent>
              </Select>

              <Select value={gatewayFilter} onValueChange={setGatewayFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Gateway" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Gateways</SelectItem>
                  <SelectItem value="pesapal">Pesapal</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>

              {(methodFilter !== 'all' || channelFilter !== 'all' || gatewayFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMethodFilter('all');
                    setChannelFilter('all');
                    setGatewayFilter('all');
                  }}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Clear Filters
                </Button>
              )}
            </div>

            {/* ── Payments Table ──────────────────────────────────── */}
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6 space-y-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Channel</TableHead>
                          <TableHead>Gateway</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Pesapal Tracking</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!data?.data || data.data.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={10} className="text-center py-12">
                              <div className="flex flex-col items-center gap-2">
                                <CreditCard className="h-8 w-8 text-muted-foreground" />
                                <p className="text-muted-foreground">No payments found</p>
                                {(methodFilter !== 'all' ||
                                  channelFilter !== 'all' ||
                                  gatewayFilter !== 'all') && (
                                  <p className="text-xs text-muted-foreground">
                                    Try adjusting your filters
                                  </p>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          data.data.map((payment) => (
                            <TableRow key={payment.id}>
                              {/* Customer */}
                              <TableCell>
                                <div>
                                  <p className="font-medium">
                                    {payment.customer.firstName}{' '}
                                    {payment.customer.lastName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {payment.customer.phone}
                                  </p>
                                </div>
                              </TableCell>

                              {/* Amount */}
                              <TableCell className="font-medium whitespace-nowrap">
                                {formatTZS(payment.amount)}
                              </TableCell>

                              {/* Method */}
                              <TableCell>
                                <Badge
                                  variant="secondary"
                                  className={getPaymentMethodColor(payment.method)}
                                >
                                  {formatPaymentMethod(payment.method)}
                                </Badge>
                              </TableCell>

                              {/* Channel */}
                              <TableCell>
                                {payment.paymentChannel ? (
                                  <Badge
                                    variant="secondary"
                                    className={getPaymentChannelColor(
                                      payment.paymentChannel
                                    )}
                                  >
                                    {formatPaymentChannel(payment.paymentChannel)}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-sm">—</span>
                                )}
                              </TableCell>

                              {/* Gateway */}
                              <TableCell>{getGatewayBadge(payment.gateway)}</TableCell>

                              {/* Reference */}
                              <TableCell className="font-mono text-sm text-muted-foreground whitespace-nowrap">
                                {payment.reference || '—'}
                              </TableCell>

                              {/* Invoice # */}
                              <TableCell>
                                {payment.invoice ? (
                                  <span className="text-sm text-primary font-medium hover:underline cursor-pointer">
                                    {payment.invoice.invoiceNumber}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-sm">—</span>
                                )}
                              </TableCell>

                              {/* Pesapal Tracking ID */}
                              <TableCell>
                                {payment.pesapalTrackingId ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="font-mono text-xs text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded cursor-default">
                                        {payment.pesapalTrackingId.length > 16
                                          ? `${payment.pesapalTrackingId.slice(0, 16)}...`
                                          : payment.pesapalTrackingId}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      <p className="font-mono text-xs">
                                        {payment.pesapalTrackingId}
                                      </p>
                                      {payment.pesapalMerchantRef && (
                                        <p className="text-xs text-muted-foreground">
                                          Ref: {payment.pesapalMerchantRef}
                                        </p>
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                ) : (
                                  <span className="text-muted-foreground text-sm">—</span>
                                )}
                              </TableCell>

                              {/* Status */}
                              <TableCell>
                                <Badge
                                  variant="secondary"
                                  className={getStatusColor(payment.status)}
                                >
                                  {payment.status}
                                </Badge>
                              </TableCell>

                              {/* Date */}
                              <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                                {formatDateTime(payment.paidAt)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Gateway Config Section ──────────────────────────── */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Settings className="h-5 w-5 text-muted-foreground" />
                      Pesapal Gateway Configuration
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Manage your Pesapal payment gateway settings
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      queryClient.invalidateQueries({
                        queryKey: ['pesapal-config'],
                      })
                    }
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {pesapalConfig ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {/* Is Enabled */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-9 w-9 rounded-full flex items-center justify-center ${
                          pesapalConfig.isEnabled
                            ? 'bg-emerald-100 dark:bg-emerald-900/30'
                            : 'bg-zinc-100 dark:bg-zinc-800'
                        }`}
                      >
                        {pesapalConfig.isEnabled ? (
                          <CheckCircle className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-zinc-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">Enabled</p>
                        <p
                          className={`text-xs ${
                            pesapalConfig.isEnabled
                              ? 'text-emerald-600'
                              : 'text-zinc-400'
                          }`}
                        >
                          {pesapalConfig.isEnabled ? 'Active' : 'Disabled'}
                        </p>
                      </div>
                    </div>

                    {/* Mode */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-9 w-9 rounded-full flex items-center justify-center ${
                          pesapalConfig.mode === 'live'
                            ? 'bg-emerald-100 dark:bg-emerald-900/30'
                            : 'bg-amber-100 dark:bg-amber-900/30'
                        }`}
                      >
                        {pesapalConfig.mode === 'live' ? (
                          <CheckCircle className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <Clock className="h-5 w-5 text-amber-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">Mode</p>
                        <p
                          className={`text-xs capitalize ${
                            pesapalConfig.mode === 'live'
                              ? 'text-emerald-600'
                              : 'text-amber-600'
                          }`}
                        >
                          {pesapalConfig.mode || 'Not Configured'}
                        </p>
                      </div>
                    </div>

                    {/* Connected */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-9 w-9 rounded-full flex items-center justify-center ${
                          pesapalConfig.connected
                            ? 'bg-emerald-100 dark:bg-emerald-900/30'
                            : 'bg-red-100 dark:bg-red-900/30'
                        }`}
                      >
                        {pesapalConfig.connected ? (
                          <CheckCircle className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">Connected</p>
                        <p
                          className={`text-xs ${
                            pesapalConfig.connected
                              ? 'text-emerald-600'
                              : 'text-red-500'
                          }`}
                        >
                          {pesapalConfig.connected
                            ? 'API Connected'
                            : 'Not Connected'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 py-2">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-9 w-9 rounded-full ml-4" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-9 w-9 rounded-full ml-4" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                )}

                {/* Quick Link */}
                <Separator className="my-4" />
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Configure API keys, webhooks, and payment methods for Pesapal.
                  </p>
                  <Button variant="outline" size="sm">
                    <Settings className="h-3.5 w-3.5 mr-1.5" />
                    Manage Gateway Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}

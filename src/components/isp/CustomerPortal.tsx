'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Globe,
  Phone,
  ArrowLeft,
  Download,
  CreditCard,
  Activity,
  FileText,
  User,
  Wifi,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  formatBytes,
  formatTZS,
  formatDate,
  formatDateTime,
  getStatusColor,
  getPaymentMethodColor,
  getPaymentChannelColor,
  formatPaymentMethod,
  formatPaymentChannel,
} from '@/lib/helpers';

// ── Types ──
interface PortalCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  address: string | null;
  city: string | null;
  region: string | null;
  status: string;
  balance: number;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
}

interface Subscription {
  id: string;
  status: string;
  startDate: string;
  endDate: string | null;
  billingCycle: string;
  autoRenew: boolean;
  plan: {
    id: string;
    name: string;
    speedDown: string;
    speedUp: string;
    dataCap: number | null;
    priceMonthly: number;
  };
}

interface PortalInvoice {
  id: string;
  invoiceNumber: string;
  status: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
  notes: string | null;
  lineItems: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    method: string;
    paymentChannel: string | null;
    status: string;
    paidAt: string;
  }>;
  amountPaid: number;
  remainingBalance: number;
}

interface PortalPayment {
  id: string;
  amount: number;
  method: string;
  paymentChannel: string | null;
  status: string;
  reference: string | null;
  receiptNumber: string | null;
  paidAt: string;
  invoice: { id: string; invoiceNumber: string } | null;
}

interface UsageData {
  period: string;
  startDate: string;
  endDate: string;
  dailyUsage: Array<{
    date: string;
    downloadBytes: number;
    uploadBytes: number;
    totalBytes: number;
  }>;
  summary: {
    totalDownload: number;
    totalUpload: number;
    totalData: number;
    dataCapMB: number | null;
    dataCapBytes: number | null;
    usagePercentage: number | null;
    daysUsed: number;
  };
  subscription: {
    planName: string;
    speedDown: string;
    speedUp: string;
    dataCap: number | null;
  } | null;
}

interface ProfileData {
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string;
    address: string | null;
    city: string | null;
    region: string | null;
    status: string;
    balance: number;
    createdAt: string;
    organizationName: string;
    organizationCurrency: string;
  };
  activeSubscription: Subscription | null;
  recentInvoices: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    total: number;
    dueDate: string;
    createdAt: string;
    paidAt: string | null;
  }>;
  recentPayments: Array<{
    id: string;
    amount: number;
    method: string;
    paymentChannel: string | null;
    status: string;
    paidAt: string;
  }>;
  outstandingBalance: number;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

// ── Component ──
export default function CustomerPortal({ onBack }: { onBack: () => void }) {
  const [portalState, setPortalState] = useState<'login' | 'portal'>('login');
  const [phone, setPhone] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [customer, setCustomer] = useState<PortalCustomer | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Payment dialog state
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<PortalInvoice | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('mobile_money');
  const [payChannel, setPayChannel] = useState('mpesa');

  const queryClient = useQueryClient();

  // Fetch organizations for login selector
  const { data: organizations } = useQuery<Organization[]>({
    queryKey: ['portal-orgs'],
    queryFn: async () => {
      const res = await fetch('/api/organizations');
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Login handler
  const handleLogin = async () => {
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await fetch('/api/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, organizationId: selectedOrgId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCustomer(data.customer);
      setPortalState('portal');
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  // Logout
  const handleLogout = () => {
    setPortalState('login');
    setCustomer(null);
    setPhone('');
    setSelectedOrgId('');
    setActiveTab('dashboard');
  };

  // Fetch profile/dashboard data
  const { data: profile, isLoading: profileLoading } = useQuery<ProfileData>({
    queryKey: ['portal-profile', customer?.id, customer?.organizationId],
    queryFn: async () => {
      const params = new URLSearchParams({
        customerId: customer!.id,
        orgId: customer!.organizationId,
      });
      const res = await fetch(`/api/portal?${params}`);
      if (!res.ok) throw new Error('Failed to fetch profile');
      return res.json();
    },
    enabled: portalState === 'portal',
  });

  // Fetch usage data
  const { data: usageData, isLoading: usageLoading } = useQuery<UsageData>({
    queryKey: ['portal-usage', customer?.id, customer?.organizationId],
    queryFn: async () => {
      const params = new URLSearchParams({
        customerId: customer!.id,
        orgId: customer!.organizationId,
        period: 'month',
      });
      const res = await fetch(`/api/portal/usage?${params}`);
      if (!res.ok) throw new Error('Failed to fetch usage');
      return res.json();
    },
    enabled: portalState === 'portal' && activeTab === 'usage',
  });

  // Fetch invoices
  const { data: invoicesData, isLoading: invoicesLoading } = useQuery<{ data: PortalInvoice[]; total: number }>({
    queryKey: ['portal-invoices', customer?.id, customer?.organizationId],
    queryFn: async () => {
      const params = new URLSearchParams({
        customerId: customer!.id,
        orgId: customer!.organizationId,
      });
      const res = await fetch(`/api/portal/invoices?${params}`);
      if (!res.ok) throw new Error('Failed to fetch invoices');
      return res.json();
    },
    enabled: portalState === 'portal' && activeTab === 'invoices',
  });

  // Fetch payments
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery<{ data: PortalPayment[]; total: number }>({
    queryKey: ['portal-payments', customer?.id, customer?.organizationId],
    queryFn: async () => {
      const params = new URLSearchParams({
        customerId: customer!.id,
        orgId: customer!.organizationId,
      });
      const res = await fetch(`/api/portal/payments?${params}`);
      if (!res.ok) throw new Error('Failed to fetch payments');
      return res.json();
    },
    enabled: portalState === 'portal' && activeTab === 'payments',
  });

  // Pay mutation
  const payMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/portal/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customer!.id,
          invoiceId: selectedInvoice!.id,
          amount: parseFloat(payAmount),
          method: payMethod,
          paymentChannel: payChannel || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['portal-profile'] });
      queryClient.invalidateQueries({ queryKey: ['portal-payments'] });
      setPayDialogOpen(false);
      setSelectedInvoice(null);
      setPayAmount('');
    },
    onError: (err) => {
      alert(err.message);
    },
  });

  const openPayDialog = (invoice: PortalInvoice) => {
    setSelectedInvoice(invoice);
    setPayAmount(invoice.remainingBalance.toFixed(0));
    setPayDialogOpen(true);
  };

  // ── LOGIN SCREEN ──
  if (portalState === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto h-14 w-14 rounded-xl bg-emerald-600 flex items-center justify-center mb-3">
              <Globe className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl">
              <span className="text-emerald-600">nekke</span>WiFi
            </CardTitle>
            <p className="text-sm text-muted-foreground">Customer Self-Service Portal</p>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-2">
              <Label>Organization</Label>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your ISP" />
                </SelectTrigger>
                <SelectContent>
                  {organizations?.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="+255 700 000 000"
                  className="pl-10"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
            </div>
            {loginError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {loginError}
              </div>
            )}
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleLogin}
              disabled={!phone || !selectedOrgId || loginLoading}
            >
              {loginLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wifi className="h-4 w-4 mr-2" />
              )}
              Sign In
            </Button>
            <Button variant="ghost" className="w-full" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin Panel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── PORTAL SCREEN ──
  const fullName = customer ? `${customer.firstName} ${customer.lastName}` : '';
  const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      {/* Portal Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Globe className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg">
              <span className="text-emerald-600">nekke</span>WiFi
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{fullName}</span>
            <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <span className="text-emerald-700 dark:text-emerald-400 text-xs font-bold">{initials}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Exit</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full flex overflow-x-auto">
            <TabsTrigger value="dashboard" className="flex-1 min-w-0">
              <Activity className="h-3.5 w-3.5 mr-1.5" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="usage" className="flex-1 min-w-0">
              <Wifi className="h-3.5 w-3.5 mr-1.5" />
              <span className="hidden sm:inline">Usage</span>
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex-1 min-w-0">
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              <span className="hidden sm:inline">Invoices</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex-1 min-w-0">
              <CreditCard className="h-3.5 w-3.5 mr-1.5" />
              <span className="hidden sm:inline">Payments</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex-1 min-w-0">
              <User className="h-3.5 w-3.5 mr-1.5" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
          </TabsList>

          {/* ── DASHBOARD TAB ── */}
          <TabsContent value="dashboard">
            {profileLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-32 w-full rounded-xl" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Skeleton className="h-24 rounded-lg" />
                  <Skeleton className="h-24 rounded-lg" />
                  <Skeleton className="h-24 rounded-lg" />
                </div>
              </div>
            ) : profile ? (
              <div className="space-y-6">
                {/* Welcome + Subscription Card */}
                <Card className="border-emerald-200 dark:border-emerald-900/50 overflow-hidden">
                  <div className="bg-emerald-600 h-1.5" />
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-bold">Welcome, {profile.customer.firstName}!</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          {profile.customer.organizationName} Customer
                        </p>
                        <Badge variant="secondary" className={`mt-2 ${getStatusColor(profile.customer.status)}`}>
                          {profile.customer.status}
                        </Badge>
                      </div>
                      {profile.activeSubscription && (
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Active Plan</p>
                          <p className="text-lg font-bold text-emerald-600">
                            {profile.activeSubscription.plan.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {profile.activeSubscription.plan.speedDown} / {profile.activeSubscription.plan.speedUp}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {profile.activeSubscription.plan.dataCap
                              ? `${profile.activeSubscription.plan.dataCap / 1024} GB data cap`
                              : 'Unlimited data'}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Data Used */}
                  <Card className="shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                          <Activity className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Data This Month</p>
                          <p className="text-lg font-bold">{formatBytes(profile.recentPayments.length > 0 ? 0 : 0)}</p>
                          <p className="text-xs text-muted-foreground">
                            {profile.activeSubscription?.plan.dataCap
                              ? `of ${profile.activeSubscription.plan.dataCap / 1024} GB`
                              : 'Unlimited'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Next Billing */}
                  <Card className="shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                          <CalendarDays className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Next Billing</p>
                          <p className="text-lg font-bold">
                            {profile.activeSubscription?.billingCycle === 'monthly' ? 'Monthly' :
                             profile.activeSubscription?.billingCycle === 'quarterly' ? 'Quarterly' : 'Yearly'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Since {formatDate(profile.activeSubscription?.startDate ?? profile.customer.createdAt)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Outstanding Balance */}
                  <Card className="shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          profile.outstandingBalance > 0
                            ? 'bg-red-100 dark:bg-red-900/30'
                            : 'bg-emerald-100 dark:bg-emerald-900/30'
                        }`}>
                          <CreditCard className={`h-5 w-5 ${
                            profile.outstandingBalance > 0 ? 'text-red-600' : 'text-emerald-600'
                          }`} />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Outstanding Balance</p>
                          <p className={`text-lg font-bold ${
                            profile.outstandingBalance > 0 ? 'text-red-600' : 'text-emerald-600'
                          }`}>
                            {formatTZS(profile.outstandingBalance)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {profile.outstandingBalance > 0 ? 'Payment due' : 'All clear'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity */}
                {profile.recentInvoices.length > 0 && (
                  <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Recent Invoices</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {profile.recentInvoices.map((inv) => (
                          <div key={inv.id} className="flex items-center justify-between py-2 border-b last:border-0">
                            <div>
                              <p className="text-sm font-mono font-medium">{inv.invoiceNumber}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(inv.createdAt)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">{formatTZS(inv.total)}</p>
                              <Badge variant="secondary" className={`text-[10px] ${getStatusColor(inv.status)}`}>
                                {inv.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : null}
          </TabsContent>

          {/* ── USAGE TAB ── */}
          <TabsContent value="usage">
            {usageLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="h-64 w-full rounded-xl" />
              </div>
            ) : usageData ? (
              <div className="space-y-6">
                {/* Data Cap Card */}
                <Card className="border-emerald-200 dark:border-emerald-900/50 overflow-hidden shadow-sm">
                  <div className="bg-emerald-600 h-1.5" />
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">Data Usage This Month</h3>
                        <p className="text-sm text-muted-foreground">
                          {usageData.subscription?.planName ?? 'No active plan'}
                          {' '}({usageData.subscription?.speedDown} / {usageData.subscription?.speedUp})
                        </p>
                      </div>
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {usageData.summary.daysUsed} days active
                      </Badge>
                    </div>
                    {usageData.summary.dataCapBytes ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>{formatBytes(usageData.summary.totalData)}</span>
                          <span className="text-muted-foreground">
                            of {usageData.summary.dataCapMB ? `${usageData.summary.dataCapMB / 1024} GB` : 'Unlimited'}
                          </span>
                        </div>
                        <Progress
                          value={Math.min(100, usageData.summary.usagePercentage ?? 0)}
                          className="h-3"
                        />
                        <p className="text-xs text-muted-foreground text-right">
                          {(usageData.summary.usagePercentage ?? 0).toFixed(1)}% used
                        </p>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        {formatBytes(usageData.summary.totalData)} used (unlimited plan)
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Usage Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <Card className="shadow-sm">
                    <CardContent className="p-4 text-center">
                      <ArrowDown className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">Download</p>
                      <p className="text-lg font-bold">{formatBytes(usageData.summary.totalDownload)}</p>
                    </CardContent>
                  </Card>
                  <Card className="shadow-sm">
                    <CardContent className="p-4 text-center">
                      <ArrowUp className="h-5 w-5 text-amber-600 mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">Upload</p>
                      <p className="text-lg font-bold">{formatBytes(usageData.summary.totalUpload)}</p>
                    </CardContent>
                  </Card>
                  <Card className="shadow-sm col-span-2 sm:col-span-1">
                    <CardContent className="p-4 text-center">
                      <Activity className="h-5 w-5 text-violet-600 mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-lg font-bold">{formatBytes(usageData.summary.totalData)}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Daily Usage Chart */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Daily Usage</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="h-64 sm:h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={usageData.dailyUsage.map(d => ({
                          date: d.date.slice(5),
                          download: +(d.downloadBytes / (1024 * 1024)).toFixed(2),
                          upload: +(d.uploadBytes / (1024 * 1024)).toFixed(2),
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis
                            dataKey="date"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `${v} MB`}
                          />
                          <RechartsTooltip
                            formatter={(value: number, name: string) => [
                              `${value} MB`,
                              name === 'download' ? 'Download' : 'Upload',
                            ]}
                            contentStyle={{
                              borderRadius: '8px',
                              border: '1px solid #e5e7eb',
                              fontSize: '12px',
                            }}
                          />
                          <Legend
                            formatter={(value) => (value === 'download' ? 'Download' : 'Upload')}
                            wrapperStyle={{ fontSize: '12px' }}
                          />
                          <Bar dataKey="download" fill="#059669" radius={[3, 3, 0, 0]} barSize={12} />
                          <Bar dataKey="upload" fill="#f59e0b" radius={[3, 3, 0, 0]} barSize={12} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No usage data available</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── INVOICES TAB ── */}
          <TabsContent value="invoices">
            {invoicesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            ) : invoicesData?.data && invoicesData.data.length > 0 ? (
              <div className="space-y-3">
                {invoicesData.data.map((invoice) => (
                  <Card key={invoice.id} className="shadow-sm overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium text-sm">{invoice.invoiceNumber}</span>
                            <Badge variant="secondary" className={`text-[10px] ${getStatusColor(invoice.status)}`}>
                              {invoice.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(invoice.createdAt)} · Due: {formatDate(invoice.dueDate)}
                          </p>
                          {invoice.lineItems.length > 0 && (
                            <p className="text-xs text-muted-foreground truncate max-w-xs">
                              {invoice.lineItems.map(li => li.description).join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-bold">{formatTZS(invoice.total)}</p>
                            {invoice.amountPaid > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Paid: {formatTZS(invoice.amountPaid)}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(
                                `/api/invoices/${invoice.id}/print?orgId=${customer?.organizationId}`,
                                '_blank'
                              )}
                            >
                              <Download className="h-3.5 w-3.5 mr-1" />
                              Print
                            </Button>
                            {(invoice.status === 'pending' || invoice.status === 'overdue' || invoice.status === 'partial') && (
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => openPayDialog(invoice)}
                              >
                                <CreditCard className="h-3.5 w-3.5 mr-1" />
                                Pay
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No invoices found</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── PAYMENTS TAB ── */}
          <TabsContent value="payments">
            {paymentsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : paymentsData?.data && paymentsData.data.length > 0 ? (
              <div className="space-y-3">
                {paymentsData.data.map((payment) => (
                  <Card key={payment.id} className="shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className={getStatusColor(payment.status)}>
                              {payment.status === 'completed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                              {payment.status}
                            </Badge>
                            <Badge variant="secondary" className={getPaymentMethodColor(payment.method)}>
                              {formatPaymentMethod(payment.method)}
                            </Badge>
                            {payment.paymentChannel && (
                              <Badge variant="secondary" className={getPaymentChannelColor(payment.paymentChannel)}>
                                {formatPaymentChannel(payment.paymentChannel)}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {formatDateTime(payment.paidAt)}
                          </p>
                          {payment.invoice && (
                            <p className="text-xs text-muted-foreground">
                              For invoice {payment.invoice.invoiceNumber}
                            </p>
                          )}
                        </div>
                        <p className="text-lg font-bold text-emerald-600">
                          {formatTZS(payment.amount)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <CreditCard className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No payments found</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── PROFILE TAB ── */}
          <TabsContent value="profile">
            {profileLoading ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : profile ? (
              <Card className="border-emerald-200 dark:border-emerald-900/50 overflow-hidden shadow-sm">
                <div className="bg-emerald-600 h-1.5" />
                <CardContent className="p-6">
                  <div className="flex items-start gap-6">
                    <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-emerald-700 dark:text-emerald-400 text-xl font-bold">{initials}</span>
                    </div>
                    <div className="flex-1 space-y-4">
                      <div>
                        <h2 className="text-xl font-bold">{fullName}</h2>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className={getStatusColor(profile.customer.status)}>
                            {profile.customer.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Customer since {formatDate(profile.customer.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Phone</p>
                          <p className="font-medium">{profile.customer.phone}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Email</p>
                          <p className="font-medium">{profile.customer.email ?? '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Address</p>
                          <p className="font-medium">
                            {[profile.customer.address, profile.customer.city, profile.customer.region]
                              .filter(Boolean)
                              .join(', ') || '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Organization</p>
                          <p className="font-medium">{profile.customer.organizationName}</p>
                        </div>
                        {profile.activeSubscription && (
                          <div>
                            <p className="text-muted-foreground">Active Plan</p>
                            <p className="font-medium text-emerald-600">
                              {profile.activeSubscription.plan.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {profile.activeSubscription.plan.speedDown} / {profile.activeSubscription.plan.speedUp}
                              · {profile.activeSubscription.plan.dataCap
                                ? `${profile.activeSubscription.plan.dataCap / 1024} GB cap`
                                : 'Unlimited'}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-muted-foreground">Account Balance</p>
                          <p className={`font-medium ${
                            profile.customer.balance >= 0 ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {formatTZS(profile.customer.balance)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>
        </Tabs>
      </div>

      {/* Payment Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pay Invoice</DialogTitle>
            <DialogDescription>
              {selectedInvoice?.invoiceNumber} · Remaining: {formatTZS(selectedInvoice?.remainingBalance ?? 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Amount ({customer?.organizationName ?? 'TZS'})</Label>
              <Input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {payMethod === 'mobile_money' && (
              <div className="space-y-2">
                <Label>Payment Channel</Label>
                <Select value={payChannel} onValueChange={setPayChannel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mpesa">M-Pesa</SelectItem>
                    <SelectItem value="airtel_money">Airtel Money</SelectItem>
                    <SelectItem value="tigo_pesa">Tigo Pesa</SelectItem>
                    <SelectItem value="halotel">Halotel</SelectItem>
                    <SelectItem value="ttcl_pesa">TTCL Pesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => payMutation.mutate()}
              disabled={!payAmount || parseFloat(payAmount) <= 0 || payMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {payMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              Pay Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

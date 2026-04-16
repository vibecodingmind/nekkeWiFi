'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  CreditCard,
  Router,
  Activity,
  Download,
  Wifi,
} from 'lucide-react';
import { formatTZS, formatBytes } from '@/lib/helpers';

// ── Color Constants ──
const PRIMARY_GREEN = '#059669';
const CHART_COLORS = ['#059669', '#0d9488', '#0891b2', '#0284c7', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];
const STATUS_COLORS: Record<string, string> = {
  active: '#059669',
  suspended: '#f59e0b',
  disconnected: '#ef4444',
  trial: '#6366f1',
  expired: '#9ca3af',
  cancelled: '#6b7280',
};

const CHANNEL_COLORS: Record<string, string> = {
  mpesa: '#059669',
  airtel_money: '#ef4444',
  tigo_pesa: '#0891b2',
  halotel: '#f97316',
  ttcl_pesa: '#6366f1',
  cash: '#9ca3af',
  card: '#eab308',
  pesapal: '#0d9488',
};

interface AnalyticsPageProps {
  orgId: string | null;
}

interface AnalyticsData {
  revenue: {
    current: number;
    previous: number;
    growth: number;
    mrr: number;
    byMonth: Array<{ month: string; amount: number }>;
  };
  customers: {
    total: number;
    active: number;
    newThisMonth: number;
    churned: number;
    growthRate: number;
    byStatus: Record<string, number>;
  };
  subscriptions: {
    total: number;
    byPlan: Array<{ planName: string; count: number }>;
    byStatus: Record<string, number>;
  };
  payments: {
    total: number;
    byMethod: Record<string, number>;
    byChannel: Record<string, number>;
    collectionRate: number;
  };
  devices: {
    total: number;
    online: number;
    offline: number;
    maintenance: number;
    avgCpu: number;
    avgMemory: number;
  };
  usage: {
    totalBandwidth: string;
    avgPerCustomer: string;
    topUsers: Array<{ name: string; usage: string }>;
  };
}

export default function AnalyticsPage({ orgId }: AnalyticsPageProps) {
  const [period, setPeriod] = useState('month');

  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['analytics', orgId, period],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (orgId) params.set('orgId', orgId);
      params.set('period', period);
      const res = await fetch(`/api/analytics?${params}`);
      if (!res.ok) throw new Error('Failed to load analytics');
      return res.json();
    },
    enabled: !!orgId,
  });

  if (isLoading) return <AnalyticsSkeleton />;
  if (!data) return null;

  const revenuePositive = data.revenue.growth >= 0;

  // Transform data for charts
  const customerStatusData = Object.entries(data.customers.byStatus).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
    color: STATUS_COLORS[status] || '#9ca3af',
  }));

  const subscriptionStatusData = Object.entries(data.subscriptions.byStatus).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
    color: STATUS_COLORS[status] || '#9ca3af',
  }));

  const paymentMethodData = Object.entries(data.payments.byMethod).map(([method, count]) => ({
    name: method.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    value: count,
  }));

  const paymentChannelData = Object.entries(data.payments.byChannel)
    .filter(([, count]) => count > 0)
    .map(([channel, count]) => ({
      name: channel.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      value: count,
      color: CHANNEL_COLORS[channel] || '#9ca3af',
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">Comprehensive business intelligence overview</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Revenue (Period)</p>
              <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-bold">{formatTZS(data.revenue.current)}</p>
            <div className="flex items-center gap-1 mt-1">
              {revenuePositive ? (
                <TrendingUp className="h-3 w-3 text-emerald-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span className={`text-xs font-medium ${revenuePositive ? 'text-emerald-600' : 'text-red-600'}`}>
                {Math.abs(data.revenue.growth).toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground">vs previous</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Monthly Recurring</p>
              <div className="h-8 w-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              </div>
            </div>
            <p className="text-2xl font-bold">{formatTZS(data.revenue.mrr)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              From {data.subscriptions.byStatus.active || data.customers.active} active subs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Collection Rate</p>
              <div className="h-8 w-8 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                <CreditCard className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
            <p className="text-2xl font-bold">{data.payments.collectionRate}%</p>
            <Progress value={data.payments.collectionRate} className="h-2 mt-2 [&>div]:bg-emerald-500" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Total Customers</p>
              <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-bold">{data.customers.total}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-emerald-600 font-medium">+{data.customers.newThisMonth} new</span>
              <span className="text-xs text-muted-foreground">|</span>
              <span className="text-xs text-red-500 font-medium">-{data.customers.churned} churned</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Revenue Trend ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.revenue.byMonth}>
                  <defs>
                    <linearGradient id="analyticsRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PRIMARY_GREEN} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={PRIMARY_GREEN} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                  <Tooltip
                    formatter={(value: number) => [formatTZS(value), 'Revenue']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area type="monotone" dataKey="amount" stroke={PRIMARY_GREEN} fill="url(#analyticsRevenueGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Customer Distribution Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Status</CardTitle>
            <CardDescription>Distribution by status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={customerStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {customerStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Subscription & Payment Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscriptions by Plan */}
        <Card>
          <CardHeader>
            <CardTitle>Subscriptions by Plan</CardTitle>
            <CardDescription>Plan popularity ranking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.subscriptions.byPlan.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="planName"
                    width={120}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill={PRIMARY_GREEN} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>Breakdown by method</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentMethodData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {paymentMethodData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Payment Channels & Network Status ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Channels */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Channels</CardTitle>
            <CardDescription>M-Pesa, Airtel Money, Tigo Pesa, etc.</CardDescription>
          </CardHeader>
          <CardContent>
            {paymentChannelData.length > 0 ? (
              <div className="space-y-3">
                {paymentChannelData.map((channel) => {
                  const total = paymentChannelData.reduce((s, c) => s + c.value, 0);
                  const pct = total > 0 ? (channel.value / total) * 100 : 0;
                  return (
                    <div key={channel.name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{channel.name}</span>
                        <span className="text-muted-foreground">{channel.value} payments ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: channel.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                No payment channel data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Network Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Network Overview</CardTitle>
            <CardDescription>Device health and status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{data.devices.online}</p>
                  <p className="text-xs text-muted-foreground">Online</p>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{data.devices.offline}</p>
                  <p className="text-xs text-muted-foreground">Offline</p>
                </div>
                <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{data.devices.maintenance}</p>
                  <p className="text-xs text-muted-foreground">Maintenance</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Avg CPU</span>
                    <span className="text-sm font-semibold">{data.devices.avgCpu}%</span>
                  </div>
                  <Progress value={data.devices.avgCpu} className="h-2 mt-2 [&>div]:bg-emerald-500" />
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Avg Memory</span>
                    <span className="text-sm font-semibold">{data.devices.avgMemory}%</span>
                  </div>
                  <Progress value={data.devices.avgMemory} className="h-2 mt-2 [&>div]:bg-teal-500" />
                </div>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total Bandwidth</span>
                </div>
                <p className="text-lg font-semibold mt-1">{data.usage.totalBandwidth}</p>
                <p className="text-xs text-muted-foreground">Avg per customer: {data.usage.avgPerCustomer}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Top Users Table ── */}
      <Card>
        <CardHeader>
          <CardTitle>Top Bandwidth Consumers</CardTitle>
          <CardDescription>Top 10 customers by data usage</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Usage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.usage.topUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    No usage data available
                  </TableCell>
                </TableRow>
              ) : (
                data.usage.topUsers.map((user, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{user.usage}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-72 mt-2" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-72 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-36" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-72 w-full" />
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-36" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-72 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

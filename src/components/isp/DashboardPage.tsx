'use client';

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
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  Package,
  DollarSign,
  Router,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { formatTZS, getStatusColor, formatDate, formatDateTime } from '@/lib/helpers';

interface DashboardPageProps {
  orgId: string | null;
}

interface DashboardData {
  subscribers: {
    total: number;
    active: number;
    suspended: number;
    trial: number;
    disconnected: number;
  };
  mrr: number;
  revenue: {
    thisMonth: number;
    lastMonth: number;
    changePercent: number;
  };
  devices: {
    total: number;
    active: number;
  };
  overdueInvoices: number;
  revenueTrend: Array<{
    month: string;
    revenue: number;
  }>;
  planDistribution: Array<{
    planName: string;
    subscriberCount: number;
  }>;
  recentInvoices: Array<{
    id: string;
    invoiceNumber: string;
    total: number;
    status: string;
    dueDate: string;
    customer: {
      firstName: string;
      lastName: string;
    };
  }>;
  recentPayments: Array<{
    id: string;
    amount: number;
    method: string;
    status: string;
    paidAt: string;
    customer: {
      firstName: string;
      lastName: string;
    };
    invoice: {
      invoiceNumber: string;
    } | null;
  }>;
}

const PIE_COLORS = ['#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef'];

export default function DashboardPage({ orgId }: DashboardPageProps) {
  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboard', orgId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (orgId) params.set('orgId', orgId);
      const res = await fetch(`/api/dashboard?${params}`);
      if (!res.ok) throw new Error('Failed to load dashboard');
      return res.json();
    },
    enabled: !!orgId || true,
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Failed to load dashboard data. Please select an organization.</p>
      </div>
    );
  }

  if (!data) return null;

  const arpu = data.subscribers.active > 0 ? data.mrr / data.subscribers.active : 0;
  const revenueChangePositive = data.revenue.changePercent >= 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your ISP billing operations</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          title="Total Subscribers"
          value={data.subscribers.total.toString()}
          icon={<Users className="h-4 w-4" />}
          description={`${data.subscribers.active} active`}
          color="emerald"
        />
        <KPICard
          title="Monthly Revenue"
          value={formatTZS(data.revenue.thisMonth)}
          icon={<DollarSign className="h-4 w-4" />}
          description={
            data.revenue.changePercent !== 0 ? (
              <span className={`flex items-center gap-1 ${revenueChangePositive ? 'text-emerald-600' : 'text-red-600'}`}>
                {revenueChangePositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(data.revenue.changePercent).toFixed(1)}%
              </span>
            ) : 'No change'
          }
          color="teal"
        />
        <KPICard
          title="Active Devices"
          value={`${data.devices.active}/${data.devices.total}`}
          icon={<Router className="h-4 w-4" />}
          description={`${data.devices.active} online`}
          color="cyan"
        />
        <KPICard
          title="MRR"
          value={formatTZS(data.mrr)}
          icon={<TrendingUp className="h-4 w-4" />}
          description="Monthly recurring"
          color="emerald"
        />
        <KPICard
          title="Overdue Invoices"
          value={data.overdueInvoices.toString()}
          icon={<AlertTriangle className="h-4 w-4" />}
          description={data.overdueInvoices > 0 ? 'Needs attention' : 'All clear'}
          color={data.overdueInvoices > 0 ? 'red' : 'emerald'}
        />
        <KPICard
          title="ARPU"
          value={formatTZS(Math.round(arpu))}
          icon={<Package className="h-4 w-4" />}
          description="Per subscriber"
          color="teal"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue for the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.revenueTrend}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                  <Tooltip
                    formatter={(value: number) => [formatTZS(value), 'Revenue']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    fill="url(#revenueGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Plan Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Plan Distribution</CardTitle>
            <CardDescription>Subscribers per plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.planDistribution}
                    dataKey="subscriberCount"
                    nameKey="planName"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    label={({ planName, percent }) =>
                      `${planName.split(' ')[0]} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {data.planDistribution.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [value, name]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Device Status Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <div className="h-4 w-4 rounded-full bg-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.devices.active}</p>
              <p className="text-sm text-muted-foreground">Online Devices</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <div className="h-4 w-4 rounded-full bg-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.devices.total - data.devices.active}</p>
              <p className="text-sm text-muted-foreground">Offline Devices</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <div className="h-4 w-4 rounded-full bg-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.overdueInvoices}</p>
              <p className="text-sm text-muted-foreground">Warning Alerts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
            <CardDescription>Last 10 invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No invoices found
                    </TableCell>
                  </TableRow>
                ) : (
                  data.recentInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono text-sm">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.customer.firstName} {invoice.customer.lastName}</TableCell>
                      <TableCell>{formatTZS(invoice.total)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getStatusColor(invoice.status)}>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(invoice.dueDate)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>Last 10 payments</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No payments found
                    </TableCell>
                  </TableRow>
                ) : (
                  data.recentPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{payment.customer.firstName} {payment.customer.lastName}</TableCell>
                      <TableCell>{formatTZS(payment.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {payment.method.replace('_', ' ')}
                        </Badge>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPICard({
  title,
  value,
  icon,
  description,
  color,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  description: React.ReactNode;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
    teal: 'text-teal-600 bg-teal-100 dark:bg-teal-900/30',
    cyan: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30',
    red: 'text-red-600 bg-red-100 dark:bg-red-900/30',
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${colorMap[color] ?? colorMap.emerald}`}>
            {icon}
          </div>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-72 mt-2" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
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
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-72 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { formatTZS, formatBytes } from '@/lib/helpers';

interface ReportsPageProps {
  orgId: string | null;
}

const COLORS = ['#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef'];

export default function ReportsPage({ orgId }: ReportsPageProps) {
  const { data: revenueReport, isLoading: revenueLoading } = useQuery({
    queryKey: ['reports-revenue', orgId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('type', 'revenue');
      if (orgId) params.set('orgId', orgId);
      const res = await fetch(`/api/reports?${params}`);
      if (!res.ok) throw new Error('Failed to load revenue report');
      return res.json();
    },
    enabled: !!orgId,
  });

  const { data: subscribersReport, isLoading: subscribersLoading } = useQuery({
    queryKey: ['reports-subscribers', orgId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('type', 'subscribers');
      if (orgId) params.set('orgId', orgId);
      const res = await fetch(`/api/reports?${params}`);
      if (!res.ok) throw new Error('Failed to load subscribers report');
      return res.json();
    },
    enabled: !!orgId,
  });

  const { data: usageReport, isLoading: usageLoading } = useQuery({
    queryKey: ['reports-usage', orgId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('type', 'usage');
      if (orgId) params.set('orgId', orgId);
      const res = await fetch(`/api/reports?${params}`);
      if (!res.ok) throw new Error('Failed to load usage report');
      return res.json();
    },
    enabled: !!orgId,
  });

  const { data: plansReport, isLoading: plansLoading } = useQuery({
    queryKey: ['reports-plans', orgId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('type', 'plans');
      if (orgId) params.set('orgId', orgId);
      const res = await fetch(`/api/reports?${params}`);
      if (!res.ok) throw new Error('Failed to load plans report');
      return res.json();
    },
    enabled: !!orgId,
  });

  if (!orgId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1">Analytics and reporting</p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center">
              <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Select an organization to view reports</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground mt-1">Analytics and reporting</p>
      </div>

      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatTZS(revenueReport?.summary.totalRevenue ?? 0)}</p>
                <p className="text-xs text-muted-foreground">{revenueReport?.summary.totalPayments ?? 0} payments</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Average Monthly</p>
                <p className="text-2xl font-bold">
                  {formatTZS(
                    Math.round(
                      (revenueReport?.summary.totalRevenue ?? 0) /
                      Math.max(revenueReport?.monthlyData?.length ?? 1, 1)
                    )
                  )}
                </p>
                <p className="text-xs text-muted-foreground">Over {revenueReport?.monthlyData?.length ?? 0} months</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Overdue Invoices (Latest)</p>
                <p className="text-2xl font-bold">
                  {revenueReport?.monthlyData?.[(revenueReport?.monthlyData?.length ?? 1) - 1]?.overdueInvoices ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Need attention</p>
              </CardContent>
            </Card>
          </div>

          {revenueLoading ? (
            <Skeleton className="h-80 w-full" />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Monthly Revenue</CardTitle>
                  <CardDescription>Revenue collection over the last 12 months</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueReport?.monthlyData ?? []}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                        <Tooltip
                          formatter={(value: number) => [formatTZS(value), 'Revenue']}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                  <CardDescription>Revenue by payment method</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={revenueReport?.paymentMethodBreakdown ?? []}
                          dataKey="_sum.amount"
                          nameKey="method"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={3}
                          label={({ method, percent }) => `${method.split('_')[0]} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {(revenueReport?.paymentMethodBreakdown ?? []).map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [formatTZS(value)]}
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
          )}
        </TabsContent>

        {/* Subscribers Tab */}
        <TabsContent value="subscribers" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold">{subscribersReport?.summary.totalCustomers ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Active Subscriptions</p>
                <p className="text-2xl font-bold">{subscribersReport?.summary.activeSubscriptions ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Churn Rate</p>
                <p className="text-2xl font-bold">{(subscribersReport?.summary.churnRate ?? 0).toFixed(1)}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Churned (This Month)</p>
                <p className="text-2xl font-bold text-red-600">{subscribersReport?.summary.churnedThisMonth ?? 0}</p>
              </CardContent>
            </Card>
          </div>

          {subscribersLoading ? (
            <Skeleton className="h-80 w-full" />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Subscriber Growth</CardTitle>
                  <CardDescription>New customers and subscriptions per month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={subscribersReport?.monthlyGrowth ?? []}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="newCustomers" name="New Customers" stroke="#10b981" strokeWidth={2} />
                        <Line type="monotone" dataKey="newSubscriptions" name="New Subscriptions" stroke="#14b8a6" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Status Distribution</CardTitle>
                  <CardDescription>Customer status breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(subscribersReport?.statusDistribution ?? []).map((item: { status: string; _count: { id: number } }) => (
                      <div key={item.status} className="flex items-center justify-between">
                        <span className="capitalize text-sm">{item.status}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{
                                width: `${subscribersReport?.summary.totalCustomers
                                  ? (item._count.id / subscribersReport.summary.totalCustomers) * 100
                                  : 0}%`,
                              }}
                            />
                          </div>
                          <Badge variant="secondary">{item._count.id}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Total Download</p>
                <p className="text-2xl font-bold">{formatBytes(usageReport?.summary.totalDownloadBytes ?? 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Total Upload</p>
                <p className="text-2xl font-bold">{formatBytes(usageReport?.summary.totalUploadBytes ?? 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Total Bandwidth</p>
                <p className="text-2xl font-bold">{formatBytes(usageReport?.summary.totalBytes ?? 0)}</p>
              </CardContent>
            </Card>
          </div>

          {usageLoading ? (
            <Skeleton className="h-80 w-full" />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Bandwidth per Plan</CardTitle>
                  <CardDescription>Current month usage by plan</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={(usageReport?.bandwidthPerPlan ?? []).map((p: { planName: string; downloadBytes: number; uploadBytes: number }) => ({
                        plan: p.planName.length > 12 ? p.planName.slice(0, 12) + '...' : p.planName,
                        download: Math.round(p.downloadBytes / (1024 * 1024)),
                        upload: Math.round(p.uploadBytes / (1024 * 1024)),
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="plan" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={(v) => `${v} MB`} />
                        <Tooltip
                          formatter={(value: number) => [`${value} MB`]}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend />
                        <Bar dataKey="download" name="Download" fill="#10b981" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="upload" name="Upload" fill="#14b8a6" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Consumers</CardTitle>
                  <CardDescription>Top bandwidth users this month</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Total Usage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(usageReport?.topConsumers ?? []).slice(0, 10).map((consumer: { customer: { firstName: string; lastName: string } | null; totalBytes: number }, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">
                            {consumer.customer ? `${consumer.customer.firstName} ${consumer.customer.lastName}` : 'Unknown'}
                          </TableCell>
                          <TableCell>{formatBytes(consumer.totalBytes)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Total Plans</p>
                <p className="text-2xl font-bold">{plansReport?.summary.totalPlans ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Active Plans</p>
                <p className="text-2xl font-bold">{plansReport?.summary.activePlans ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Total MRR</p>
                <p className="text-2xl font-bold">{formatTZS(plansReport?.summary.totalMrr ?? 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Avg MRR/Plan</p>
                <p className="text-2xl font-bold">{formatTZS(Math.round(plansReport?.summary.averageMrrPerPlan ?? 0))}</p>
              </CardContent>
            </Card>
          </div>

          {plansLoading ? (
            <Skeleton className="h-80 w-full" />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>MRR by Plan</CardTitle>
                  <CardDescription>Monthly recurring revenue per plan</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={(plansReport?.plans ?? []).map((p: { name: string; mrr: number }) => ({
                          plan: p.name.length > 15 ? p.name.slice(0, 15) + '...' : p.name,
                          mrr: Math.round(p.mrr),
                        }))}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                        <YAxis type="category" dataKey="plan" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} width={120} />
                        <Tooltip
                          formatter={(value: number) => [formatTZS(value), 'MRR']}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Bar dataKey="mrr" fill="#10b981" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Plan Subscriber Counts</CardTitle>
                  <CardDescription>Active subscribers per plan</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Plan</TableHead>
                        <TableHead>Speed</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead>MRR</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(plansReport?.plans ?? []).map((plan: { name: string; speedDown: string; speedUp: string; subscribers: { active: number; total: number }; mrr: number; isActive: boolean }) => (
                        <TableRow key={plan.name}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {plan.name}
                              {!plan.isActive && <Badge variant="secondary" className="text-xs bg-zinc-100 text-zinc-500">Inactive</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{plan.speedDown}/{plan.speedUp}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{plan.subscribers.active} / {plan.subscribers.total}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{formatTZS(Math.round(plan.mrr))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

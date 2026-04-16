'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
} from 'recharts';
import {
  Download,
  Upload,
  Activity,
  Clock,
} from 'lucide-react';
import { formatBytes } from '@/lib/helpers';

interface UsagePageProps {
  orgId: string | null;
}

interface UsageData {
  period: { startDate: string; endDate: string };
  dailyAggregation: Array<{
    date: string;
    downloadBytes: number;
    uploadBytes: number;
    totalBytes: number;
    recordCount: number;
  }>;
  currentMonthSummary: {
    totalDownloadBytes: number;
    totalUploadBytes: number;
    totalBytes: number;
    recordCount: number;
  };
  topConsumers: Array<{
    customer: { id: string; firstName: string; lastName: string; email: string | null; phone: string } | null;
    downloadBytes: number;
    uploadBytes: number;
    totalBytes: number;
    recordCount: number;
  }>;
  summary: {
    totalRecords: number;
    totalDownloadBytes: number;
    totalUploadBytes: number;
    totalBytes: number;
  };
}

export default function UsagePage({ orgId }: UsagePageProps) {
  const [customerId, setCustomerId] = useState('');
  const [days, setDays] = useState('30');

  const { data, isLoading } = useQuery<UsageData>({
    queryKey: ['usage', orgId, customerId, days],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (orgId) params.set('orgId', orgId);
      if (customerId) params.set('customerId', customerId);
      params.set('days', days);
      const res = await fetch(`/api/usage?${params}`);
      if (!res.ok) throw new Error('Failed to load usage data');
      return res.json();
    },
    enabled: !!orgId,
  });

  // Fetch customers for dropdown
  const { data: customers } = useQuery({
    queryKey: ['customers-minimal', orgId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (orgId) params.set('orgId', orgId);
      params.set('limit', '100');
      const res = await fetch(`/api/customers?${params}`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    enabled: !!orgId,
  });

  const chartData = (data?.dailyAggregation ?? []).map((d) => ({
    date: d.date.slice(5), // MM-DD
    download: Math.round(d.downloadBytes / (1024 * 1024)), // MB
    upload: Math.round(d.uploadBytes / (1024 * 1024)), // MB
  }));

  const totalDownload = data?.summary.totalDownloadBytes ?? 0;
  const totalUpload = data?.summary.totalUploadBytes ?? 0;
  const avgDaily = chartData.length > 0
    ? Math.round(chartData.reduce((s, d) => s + d.download + d.upload, 0) / chartData.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usage Metering</h1>
          <p className="text-muted-foreground mt-1">Monitor bandwidth consumption</p>
        </div>
        <div className="flex gap-3">
          <Select value={customerId} onValueChange={(v) => setCustomerId(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="All Customers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              {customers?.map((c: { id: string; firstName: string; lastName: string }) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 Days</SelectItem>
              <SelectItem value="14">14 Days</SelectItem>
              <SelectItem value="30">30 Days</SelectItem>
              <SelectItem value="60">60 Days</SelectItem>
              <SelectItem value="90">90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!orgId ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center">
              <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Select an organization to view usage</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Download className="h-5 w-5 text-emerald-600" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Total Download</p>
                </div>
                <p className="text-2xl font-bold">{formatBytes(totalDownload)}</p>
                <p className="text-xs text-muted-foreground mt-1">This period</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                    <Upload className="h-5 w-5 text-teal-600" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Total Upload</p>
                </div>
                <p className="text-2xl font-bold">{formatBytes(totalUpload)}</p>
                <p className="text-xs text-muted-foreground mt-1">This period</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                    <Activity className="h-5 w-5 text-cyan-600" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Daily Usage</p>
                </div>
                <p className="text-2xl font-bold">{formatBytes(avgDaily * 1024 * 1024)}</p>
                <p className="text-xs text-muted-foreground mt-1">Per day average</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Records</p>
                </div>
                <p className="text-2xl font-bold">{data?.summary.totalRecords ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Usage records</p>
              </CardContent>
            </Card>
          </div>

          {/* Bandwidth Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Bandwidth Usage</CardTitle>
              <CardDescription>Daily download and upload (MB)</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-80 w-full" />
              ) : chartData.length === 0 ? (
                <div className="flex items-center justify-center h-80">
                  <p className="text-muted-foreground">No usage data available</p>
                </div>
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `${v} MB`} />
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
              )}
            </CardContent>
          </Card>

          {/* Top Consumers */}
          <Card>
            <CardHeader>
              <CardTitle>Top Consumers</CardTitle>
              <CardDescription>Top 20 customers by bandwidth usage</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Download</TableHead>
                      <TableHead>Upload</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Records</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!data?.topConsumers || data.topConsumers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No usage data available
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.topConsumers.map((consumer, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">
                            {consumer.customer
                              ? `${consumer.customer.firstName} ${consumer.customer.lastName}`
                              : 'Unknown'}
                          </TableCell>
                          <TableCell>{formatBytes(consumer.downloadBytes)}</TableCell>
                          <TableCell>{formatBytes(consumer.uploadBytes)}</TableCell>
                          <TableCell className="font-medium">{formatBytes(consumer.totalBytes)}</TableCell>
                          <TableCell>{consumer.recordCount}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

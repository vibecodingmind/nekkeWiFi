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
import { Plus, Search, Users, Eye, Trash2 } from 'lucide-react';
import { formatTZS, formatDate, getStatusColor } from '@/lib/helpers';

interface CustomersPageProps {
  orgId: string | null;
}

interface Customer {
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
  organization: { id: string; name: string };
  _count: { subscriptions: number; invoices: number; payments: number };
}

interface CustomerDetail extends Customer {
  notes?: string | null;
}

interface PaginatedResponse {
  data: Customer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function CustomersPage({ orgId }: CustomersPageProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    region: '',
  });
  const [formError, setFormError] = useState('');

  const { data, isLoading } = useQuery<PaginatedResponse>({
    queryKey: ['customers', orgId, search, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (orgId) params.set('orgId', orgId);
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      params.set('page', page.toString());
      params.set('limit', '20');
      const res = await fetch(`/api/customers?${params}`);
      if (!res.ok) throw new Error('Failed to load customers');
      return res.json();
    },
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: async (form: typeof formData) => {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: orgId,
          ...form,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create customer');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setCreateOpen(false);
      setFormData({ firstName: '', lastName: '', email: '', phone: '', address: '', city: '', region: '' });
      setFormError('');
    },
    onError: (err) => {
      setFormError(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete customer');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const viewCustomer = async (id: string) => {
    try {
      const res = await fetch(`/api/customers/${id}`);
      if (res.ok) {
        const detail = await res.json();
        setSelectedCustomer(detail);
        setDetailOpen(true);
      }
    } catch {
      // ignore
    }
  };

  const handleCreate = () => {
    if (!formData.firstName || !formData.lastName || !formData.phone) {
      setFormError('First name, last name, and phone are required');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground mt-1">Manage your subscribers</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              New Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Customer</DialogTitle>
              <DialogDescription>Create a new subscriber account</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {formError && (
                <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">{formError}</p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name *</Label>
                  <Input value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} placeholder="John" />
                </div>
                <div className="space-y-2">
                  <Label>Last Name *</Label>
                  <Input value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} placeholder="Doe" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="john@example.com" />
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+255 123 456 789" />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Street address" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="Dar es Salaam" />
                </div>
                <div className="space-y-2">
                  <Label>Region</Label>
                  <Input value={formData.region} onChange={(e) => setFormData({ ...formData, region: e.target.value })} placeholder="Dar es Salaam" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {createMutation.isPending ? 'Creating...' : 'Create Customer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="disconnected">Disconnected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!orgId ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center">
              <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Select an organization to view customers</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
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
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!data?.data || data.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2">
                            <Users className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground">No customers found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.data.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell className="font-medium">
                            {customer.firstName} {customer.lastName}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{customer.email ?? '-'}</TableCell>
                          <TableCell>{customer.phone}</TableCell>
                          <TableCell>{customer.city ?? '-'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={getStatusColor(customer.status)}>
                              {customer.status}
                            </Badge>
                          </TableCell>
                          <TableCell className={customer.balance < 0 ? 'text-red-600 font-medium' : ''}>
                            {formatTZS(customer.balance)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(customer.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => viewCustomer(customer.id)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(customer.id)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {data.pagination.page} of {data.pagination.totalPages} pages ({data.pagination.total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                  disabled={page >= data.pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Customer Detail Dialog */}
          <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {selectedCustomer?.firstName} {selectedCustomer?.lastName}
                </DialogTitle>
                <DialogDescription>Customer details</DialogDescription>
              </DialogHeader>
              {selectedCustomer && (
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <p>{selectedCustomer.email ?? '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Phone</p>
                      <p>{selectedCustomer.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">City</p>
                      <p>{selectedCustomer.city ?? '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Region</p>
                      <p>{selectedCustomer.region ?? '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <Badge variant="secondary" className={getStatusColor(selectedCustomer.status)}>
                        {selectedCustomer.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Balance</p>
                      <p className={selectedCustomer.balance < 0 ? 'text-red-600 font-medium' : ''}>
                        {formatTZS(selectedCustomer.balance)}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{selectedCustomer._count?.subscriptions ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Subscriptions</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{selectedCustomer._count?.invoices ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Invoices</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{selectedCustomer._count?.payments ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Payments</p>
                    </div>
                  </div>
                  {selectedCustomer.notes && (
                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium text-muted-foreground">Notes</p>
                      <p className="text-sm mt-1">{selectedCustomer.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

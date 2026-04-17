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
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, FileText, Eye, Printer, FileDown, Download } from 'lucide-react';
import { formatTZS, formatDate, getStatusColor } from '@/lib/helpers';

interface InvoicesPageProps {
  orgId: string | null;
}

interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Invoice {
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
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string;
  };
  subscription: {
    id: string;
    username: string | null;
  } | null;
  _count: {
    lineItems: number;
    payments: number;
  };
}

interface InvoiceDetail extends Invoice {
  lineItems: InvoiceLineItem[];
  payments: Array<{
    id: string;
    amount: number;
    method: string;
    status: string;
    paidAt: string;
  }>;
}

interface PaginatedResponse {
  data: Invoice[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function InvoicesPage({ orgId }: InvoicesPageProps) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null);
  const [formData, setFormData] = useState({
    customerId: '',
    subscriptionId: '',
    total: '',
    tax: '0',
    discount: '0',
    dueDate: '',
    notes: '',
    description: '',
    quantity: '1',
    unitPrice: '',
  });
  const [formError, setFormError] = useState('');

  const { data, isLoading } = useQuery<PaginatedResponse>({
    queryKey: ['invoices', orgId, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (orgId) params.set('orgId', orgId);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      params.set('page', page.toString());
      params.set('limit', '20');
      const res = await fetch(`/api/invoices?${params}`);
      if (!res.ok) throw new Error('Failed to load invoices');
      return res.json();
    },
    enabled: !!orgId,
  });

  const { data: customers } = useQuery({
    queryKey: ['customers-invoice', orgId],
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

  const createMutation = useMutation({
    mutationFn: async (form: typeof formData) => {
      const lineItems = form.description && form.unitPrice
        ? [{
            description: form.description,
            quantity: parseInt(form.quantity) || 1,
            unitPrice: parseFloat(form.unitPrice),
            total: (parseInt(form.quantity) || 1) * parseFloat(form.unitPrice),
          }]
        : undefined;

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: orgId,
          customerId: form.customerId,
          subscriptionId: form.subscriptionId || null,
          total: parseFloat(form.total),
          tax: parseFloat(form.tax) || 0,
          discount: parseFloat(form.discount) || 0,
          subtotal: parseFloat(form.total) - (parseFloat(form.tax) || 0) + (parseFloat(form.discount) || 0),
          dueDate: form.dueDate,
          notes: form.notes || null,
          lineItems,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create invoice');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setCreateOpen(false);
      setFormData({
        customerId: '', subscriptionId: '', total: '', tax: '0', discount: '0',
        dueDate: '', notes: '', description: '', quantity: '1', unitPrice: '',
      });
      setFormError('');
    },
    onError: (err) => {
      setFormError(err.message);
    },
  });

  const viewInvoice = async (id: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}`);
      if (res.ok) {
        const detail = await res.json();
        setSelectedInvoice(detail);
        setDetailOpen(true);
      }
    } catch {
      // ignore
    }
  };

  const handleCreate = () => {
    if (!formData.customerId || !formData.total || !formData.dueDate) {
      setFormError('Customer, total amount, and due date are required');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground mt-1">Manage billing invoices</p>
        </div>
        <div className="flex items-center gap-3">
          {orgId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/api/export/invoices?orgId=${orgId}`, '_blank')}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                New Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Invoice</DialogTitle>
                <DialogDescription>Generate a new invoice for a customer</DialogDescription>
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
                      {customers?.map((c: { id: string; firstName: string; lastName: string }) => (
                        <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Total Amount *</Label>
                    <Input type="number" value={formData.total} onChange={(e) => setFormData({ ...formData, total: e.target.value })} placeholder="50000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Tax</Label>
                    <Input type="number" value={formData.tax} onChange={(e) => setFormData({ ...formData, tax: e.target.value })} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Discount</Label>
                    <Input type="number" value={formData.discount} onChange={(e) => setFormData({ ...formData, discount: e.target.value })} placeholder="0" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Due Date *</Label>
                  <Input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Line Item Description</Label>
                  <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Internet service - Monthly fee" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Unit Price</Label>
                    <Input type="number" value={formData.unitPrice} onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })} placeholder="50000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} placeholder="1" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Additional notes..." rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {createMutation.isPending ? 'Creating...' : 'Create Invoice'}
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
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Select an organization to view invoices</p>
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
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Tax</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!data?.data || data.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2">
                            <FileText className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground">No invoices found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.data.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-mono text-sm font-medium">{invoice.invoiceNumber}</TableCell>
                          <TableCell>{invoice.customer.firstName} {invoice.customer.lastName}</TableCell>
                          <TableCell>{formatTZS(invoice.subtotal)}</TableCell>
                          <TableCell>{formatTZS(invoice.tax)}</TableCell>
                          <TableCell className="font-medium">{formatTZS(invoice.total)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={getStatusColor(invoice.status)}>
                              {invoice.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(invoice.dueDate)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(`/api/invoices/${invoice.id}/pdf?orgId=${orgId}`, '_blank')}
                                title="Download PDF"
                              >
                                <FileDown className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(`/api/invoices/${invoice.id}/print?orgId=${orgId}`, '_blank')}
                                title="Print Invoice"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => viewInvoice(invoice.id)}>
                                <Eye className="h-4 w-4" />
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
                Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} total)
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))} disabled={page >= data.pagination.totalPages}>
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Invoice Detail Dialog */}
          <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Invoice {selectedInvoice?.invoiceNumber}</DialogTitle>
                <DialogDescription>
                  {selectedInvoice?.customer.firstName} {selectedInvoice?.customer.lastName}
                </DialogDescription>
              </DialogHeader>
              {selectedInvoice && (
                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <Badge variant="secondary" className={`mt-1 ${getStatusColor(selectedInvoice.status)}`}>
                        {selectedInvoice.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Created</p>
                      <p className="mt-1">{formatDate(selectedInvoice.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Due Date</p>
                      <p className="mt-1">{formatDate(selectedInvoice.dueDate)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Paid At</p>
                      <p className="mt-1">{selectedInvoice.paidAt ? formatDate(selectedInvoice.paidAt) : '-'}</p>
                    </div>
                  </div>

                  {/* Line Items */}
                  {selectedInvoice.lineItems && selectedInvoice.lineItems.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3">Line Items</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Unit Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedInvoice.lineItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.description}</TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right">{formatTZS(item.unitPrice)}</TableCell>
                              <TableCell className="text-right font-medium">{formatTZS(item.total)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Totals */}
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatTZS(selectedInvoice.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tax</span>
                        <span>{formatTZS(selectedInvoice.tax)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Discount</span>
                        <span>- {formatTZS(selectedInvoice.discount)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-base border-t pt-2">
                        <span>Total</span>
                        <span>{formatTZS(selectedInvoice.total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payments */}
                  {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3">Payments</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Amount</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedInvoice.payments.map((pmt) => (
                            <TableRow key={pmt.id}>
                              <TableCell className="font-medium">{formatTZS(pmt.amount)}</TableCell>
                              <TableCell><Badge variant="secondary" className="capitalize">{pmt.method.replace('_', ' ')}</Badge></TableCell>
                              <TableCell><Badge variant="secondary" className={getStatusColor(pmt.status)}>{pmt.status}</Badge></TableCell>
                              <TableCell className="text-muted-foreground text-sm">{formatDate(pmt.paidAt)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
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

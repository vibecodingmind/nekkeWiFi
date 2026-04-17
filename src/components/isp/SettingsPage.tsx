'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth-store';
import { formatDateTime } from '@/lib/helpers';
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
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Settings,
  Building2,
  CreditCard,
  User,
  Shield,
  Save,
  Key,
  Globe,
  Eye,
  CheckCircle,
  XCircle,
  Loader2,
  Lock,
  ClipboardList,
  Filter,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SettingsPageProps {
  orgId: string | null;
}

interface OrganizationData {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  currency: string;
  taxRate: number;
  slug: string;
  isActive: boolean;
}

interface GatewayConfig {
  id?: string;
  name: string;
  consumerKey: string;
  consumerSecret: string;
  mode: 'sandbox' | 'live';
  callbackUrl: string;
  ipnUrl: string;
  isActive: boolean;
  isConnected: boolean;
}

interface PermissionRow {
  feature: string;
  admin: boolean;
  agent: boolean;
  viewer: boolean;
}

const PERMISSION_MATRIX: PermissionRow[] = [
  { feature: 'Dashboard', admin: true, agent: true, viewer: true },
  { feature: 'Customers', admin: true, agent: true, viewer: false },
  { feature: 'Plans', admin: true, agent: true, viewer: false },
  { feature: 'Devices', admin: true, agent: true, viewer: false },
  { feature: 'Subscriptions', admin: true, agent: true, viewer: false },
  { feature: 'Usage', admin: true, agent: true, viewer: false },
  { feature: 'Invoices', admin: true, agent: true, viewer: true },
  { feature: 'Payments', admin: true, agent: true, viewer: true },
  { feature: 'Pesapal', admin: true, agent: false, viewer: false },
  { feature: 'Reports', admin: true, agent: true, viewer: false },
  { feature: 'Users', admin: true, agent: false, viewer: false },
  { feature: 'Settings', admin: true, agent: false, viewer: false },
  { feature: 'Gateways', admin: true, agent: false, viewer: false },
];

export default function SettingsPage({ orgId }: SettingsPageProps) {
  const auth = useAuthStore();
  const queryClient = useQueryClient();

  const canView = auth.hasPermission('settings.view');
  const canManageOrg = auth.hasPermission('settings.manage');
  const canManageGateways = auth.hasPermission('gateways.manage');
  const canManageUsers = auth.hasPermission('users.manage');
  const currentUser = auth.user;

  // ── Audit Logs State ──
  const [auditFilter, setAuditFilter] = useState<string>('all');
  const [auditDisplayCount, setAuditDisplayCount] = useState(20);

  interface AuditLogEntry {
    id: string;
    timestamp: string;
    userName: string;
    action: string;
    resource: string;
    ipAddress: string;
  }

  interface AuditLogsResponse {
    data: AuditLogEntry[];
    pagination: { total: number };
  }

  const { data: auditData, isLoading: auditLoading } = useQuery<AuditLogsResponse>({
    queryKey: ['audit-logs', orgId],
    queryFn: async () => {
      if (!orgId) throw new Error('No org');
      const res = await fetch(`/api/audit-logs?orgId=${orgId}`);
      if (!res.ok) throw new Error('Failed to load audit logs');
      return res.json();
    },
    enabled: !!orgId,
  });

  const auditLogs = auditData?.data ?? [];
  const filteredLogs = auditFilter === 'all'
    ? auditLogs
    : auditLogs.filter((log) => log.action === auditFilter);
  const displayedLogs = filteredLogs.slice(0, auditDisplayCount);
  const hasMoreLogs = auditDisplayCount < filteredLogs.length;

  // ── Organization Data ──
  const { data: orgData, isLoading: orgLoading } = useQuery<OrganizationData>({
    queryKey: ['organization', orgId],
    queryFn: async () => {
      if (!orgId) throw new Error('No org');
      const res = await fetch(`/api/organizations/${orgId}`);
      if (!res.ok) throw new Error('Failed to load organization');
      return res.json();
    },
    enabled: !!orgId,
  });

  // ── Gateway Data ──
  const { data: gatewayData, isLoading: gwLoading } = useQuery<GatewayConfig>({
    queryKey: ['gateways', orgId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (orgId) params.set('orgId', orgId);
      const res = await fetch(`/api/gateways?${params}`);
      if (!res.ok) throw new Error('Failed to load gateways');
      return res.json();
    },
    enabled: !!orgId,
  });

  // ── Organization Form (derived from server data) ──
  const [orgEdits, setOrgEdits] = useState<Record<string, string | number>>({});
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgMessage, setOrgMessage] = useState('');

  const orgForm = orgData
    ? {
        name: orgData.name,
        email: orgData.email ?? '',
        phone: orgData.phone ?? '',
        address: orgData.address ?? '',
        country: orgData.country ?? '',
        currency: orgData.currency ?? 'TZS',
        taxRate: orgData.taxRate ?? 0,
        ...orgEdits,
      }
    : {
        name: '',
        email: '',
        phone: '',
        address: '',
        country: '',
        currency: 'TZS',
        taxRate: 0,
      };

  const updateOrgField = (key: string, value: string | number) => {
    setOrgEdits((prev) => ({ ...prev, [key]: value }));
  };

  // ── Gateway Form (derived from server data) ──
  const [gwEdits, setGwEdits] = useState<Record<string, string | boolean>>({});
  const [gwSaving, setGwSaving] = useState(false);
  const [gwTesting, setGwTesting] = useState(false);
  const [gwMessage, setGwMessage] = useState('');
  const [gwShowSecret, setGwShowSecret] = useState(false);

  const gwForm = gatewayData
    ? {
        consumerKey: gatewayData.consumerKey ?? '',
        consumerSecret: gatewayData.consumerSecret ?? '',
        mode: gatewayData.mode ?? 'sandbox',
        callbackUrl: gatewayData.callbackUrl ?? '',
        ipnUrl: gatewayData.ipnUrl ?? '',
        isActive: gatewayData.isActive ?? false,
        ...gwEdits,
      }
    : {
        consumerKey: '',
        consumerSecret: '',
        mode: 'sandbox' as 'sandbox' | 'live',
        callbackUrl: '',
        ipnUrl: '',
        isActive: false,
      };

  const updateGwField = (key: string, value: string | boolean) => {
    setGwEdits((prev) => ({ ...prev, [key]: value }));
  };

  // ── Profile Password Form ──
  const [profileForm, setProfileForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  // ── Save Organization ──
  const orgMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/organizations/${orgId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orgForm),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save organization');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization', orgId] });
      setOrgEdits({});
      setOrgMessage('Organization settings saved successfully');
      setTimeout(() => setOrgMessage(''), 3000);
    },
    onError: (err) => {
      setOrgMessage(err.message);
      setTimeout(() => setOrgMessage(''), 5000);
    },
    onSettled: () => {
      setOrgSaving(false);
    },
  });

  // ── Save Gateway ──
  const gwMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...gwForm, organizationId: orgId, name: 'Pesapal' };
      const res = await fetch('/api/gateways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save gateway');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gateways', orgId] });
      setGwEdits({});
      setGwMessage('Gateway settings saved successfully');
      setTimeout(() => setGwMessage(''), 3000);
    },
    onError: (err) => {
      setGwMessage(err.message);
      setTimeout(() => setGwMessage(''), 5000);
    },
    onSettled: () => {
      setGwSaving(false);
    },
  });

  // ── Test Gateway Connection ──
  const testGwMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/gateways?orgId=${orgId}&action=test`, {
        method: 'GET',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Connection test failed');
      }
      return res.json();
    },
    onSuccess: () => {
      setGwMessage('Connection successful! Pesapal gateway is reachable.');
      setTimeout(() => setGwMessage(''), 5000);
    },
    onError: (err) => {
      setGwMessage(`Connection failed: ${err.message}`);
      setTimeout(() => setGwMessage(''), 5000);
    },
    onSettled: () => {
      setGwTesting(false);
    },
  });

  // ── Change Password ──
  const profileMutation = useMutation({
    mutationFn: async () => {
      if (profileForm.newPassword !== profileForm.confirmPassword) {
        throw new Error('New passwords do not match');
      }
      if (profileForm.newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters');
      }
      const res = await fetch(`/api/users/${currentUser?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: profileForm.currentPassword,
          password: profileForm.newPassword,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to change password');
      }
      return res.json();
    },
    onSuccess: () => {
      setProfileMessage('Password changed successfully');
      setProfileForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setProfileMessage(''), 3000);
    },
    onError: (err) => {
      setProfileMessage(err.message);
      setTimeout(() => setProfileMessage(''), 5000);
    },
    onSettled: () => {
      setProfileSaving(false);
    },
  });

  const handleSaveOrg = () => {
    setOrgSaving(true);
    setOrgMessage('');
    orgMutation.mutate();
  };

  const handleSaveGw = () => {
    setGwSaving(true);
    setGwMessage('');
    gwMutation.mutate();
  };

  const handleTestGw = () => {
    setGwTesting(true);
    setGwMessage('');
    testGwMutation.mutate();
  };

  const handleChangePassword = () => {
    setProfileSaving(true);
    setProfileMessage('');
    profileMutation.mutate();
  };

  // ── Access Denied ──
  if (!canView) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">Organization and account settings</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Access Denied</h3>
            <p className="text-muted-foreground text-sm text-center max-w-sm">
              You do not have permission to view this page. Contact your administrator for access.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage organization, payments, and account settings</p>
      </div>

      {!orgId ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center">
              <Settings className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Select an organization to view settings</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="organization" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="organization" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Organization</span>
            </TabsTrigger>
            <TabsTrigger value="gateways" className="gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Payment Gateways</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">My Profile</span>
            </TabsTrigger>
            {canManageUsers && (
              <TabsTrigger value="roles" className="gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Roles & Permissions</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="audit-logs" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Audit Logs</span>
            </TabsTrigger>
          </TabsList>

          {/* ──────────────────────────────── Tab 1: Organization ──────────────────────────────── */}
          <TabsContent value="organization">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <CardTitle>Organization Settings</CardTitle>
                    <CardDescription>General organization information and configuration</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {!canManageOrg && (
                  <Alert>
                    <AlertDescription className="flex items-center gap-2">
                      <Eye className="h-4 w-4 flex-shrink-0" />
                      You have view-only access to organization settings.
                    </AlertDescription>
                  </Alert>
                )}

                {orgLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {orgMessage && (
                      <Alert className={orgMessage.includes('success') ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20' : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'}>
                        <AlertDescription className={orgMessage.includes('success') ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}>
                          {orgMessage}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="org-name">Organization Name</Label>
                        <Input
                          id="org-name"
                          value={orgForm.name}
                          onChange={(e) => updateOrgField('name', e.target.value)}
                          disabled={!canManageOrg}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="org-email">Email</Label>
                        <Input
                          id="org-email"
                          type="email"
                          value={orgForm.email}
                          onChange={(e) => updateOrgField('email', e.target.value)}
                          disabled={!canManageOrg}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="org-phone">Phone</Label>
                        <Input
                          id="org-phone"
                          value={orgForm.phone}
                          onChange={(e) => updateOrgField('phone', e.target.value)}
                          disabled={!canManageOrg}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="org-country">Country</Label>
                        <div className="relative">
                          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="org-country"
                            value={orgForm.country}
                            onChange={(e) => updateOrgField('country', e.target.value)}
                            className="pl-9"
                            disabled={!canManageOrg}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="org-currency">Currency</Label>
                        <Input
                          id="org-currency"
                          value={orgForm.currency}
                          onChange={(e) => updateOrgField('currency', e.target.value)}
                          disabled={!canManageOrg}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="org-tax">Tax Rate (%)</Label>
                        <Input
                          id="org-tax"
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={orgForm.taxRate}
                          onChange={(e) => updateOrgField('taxRate', parseFloat(e.target.value) || 0)}
                          disabled={!canManageOrg}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="org-address">Address</Label>
                      <Input
                        id="org-address"
                        value={orgForm.address}
                        onChange={(e) => updateOrgField('address', e.target.value)}
                        disabled={!canManageOrg}
                      />
                    </div>

                    {canManageOrg && (
                      <Separator />
                    )}

                    {canManageOrg && (
                      <div className="flex justify-end">
                        <Button
                          onClick={handleSaveOrg}
                          disabled={orgSaving || orgMutation.isPending}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          {orgSaving || orgMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ──────────────────────────────── Tab 2: Payment Gateways ──────────────────────────────── */}
          <TabsContent value="gateways">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div className="flex-1">
                    <CardTitle>Payment Gateways</CardTitle>
                    <CardDescription>Configure Pesapal payment integration</CardDescription>
                  </div>
                  {gatewayData && (
                    <Badge
                      variant="secondary"
                      className={
                        gatewayData.isConnected
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                      }
                    >
                      <div className="flex items-center gap-1.5">
                        {gatewayData.isConnected ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {gatewayData.isConnected ? 'Connected' : 'Not Connected'}
                      </div>
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {!canManageGateways && (
                  <Alert>
                    <AlertDescription className="flex items-center gap-2">
                      <Eye className="h-4 w-4 flex-shrink-0" />
                      You have view-only access to gateway settings.
                    </AlertDescription>
                  </Alert>
                )}

                {gwLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {gwMessage && (
                      <Alert className={gwMessage.includes('success') ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20' : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'}>
                        <AlertDescription className={gwMessage.includes('success') ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}>
                          {gwMessage}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Mode Toggle */}
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium">Environment Mode</p>
                        <p className="text-sm text-muted-foreground">
                          {gwForm.mode === 'sandbox'
                            ? 'Using Pesapal Sandbox for testing'
                            : 'Using Pesapal Live for real transactions'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-medium ${gwForm.mode === 'live' ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                          {gwForm.mode === 'live' ? 'Live' : 'Sandbox'}
                        </span>
                        <Switch
                          checked={gwForm.mode === 'live'}
                          onCheckedChange={(checked) =>
                            setGwEdits((prev) => ({ ...prev, mode: checked ? 'live' : 'sandbox' }))
                          }
                          disabled={!canManageGateways}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="gw-consumer-key">Consumer Key</Label>
                        <Input
                          id="gw-consumer-key"
                          value={gwForm.consumerKey}
                          onChange={(e) => updateGwField('consumerKey', e.target.value)}
                          placeholder="Pesapal Consumer Key"
                          disabled={!canManageGateways}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gw-consumer-secret">Consumer Secret</Label>
                        <div className="relative">
                          <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="gw-consumer-secret"
                            type={gwShowSecret ? 'text' : 'password'}
                            value={gwForm.consumerSecret}
                            onChange={(e) => updateGwField('consumerSecret', e.target.value)}
                            placeholder="Pesapal Consumer Secret"
                            className="pl-9 pr-10"
                            disabled={!canManageGateways}
                          />
                          <button
                            type="button"
                            onClick={() => setGwShowSecret(!gwShowSecret)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            tabIndex={-1}
                            aria-label={gwShowSecret ? 'Hide secret' : 'Show secret'}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="gw-callback">Callback URL</Label>
                        <Input
                          id="gw-callback"
                          value={gwForm.callbackUrl}
                          onChange={(e) => updateGwField('callbackUrl', e.target.value)}
                          placeholder="https://your-domain.com/api/pesapal/callback"
                          disabled={!canManageGateways}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gw-ipn">IPN URL</Label>
                        <Input
                          id="gw-ipn"
                          value={gwForm.ipnUrl}
                          onChange={(e) => updateGwField('ipnUrl', e.target.value)}
                          placeholder="https://your-domain.com/api/pesapal/webhook"
                          disabled={!canManageGateways}
                        />
                      </div>
                    </div>

                    {canManageGateways && (
                      <>
                        <Separator />
                        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                          <Button
                            variant="outline"
                            onClick={handleTestGw}
                            disabled={gwTesting || testGwMutation.isPending}
                          >
                            {gwTesting || testGwMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Testing...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Test Connection
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={handleSaveGw}
                            disabled={gwSaving || gwMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            {gwSaving || gwMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-2" />
                                Save Gateway
                              </>
                            )}
                          </Button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ──────────────────────────────── Tab 3: My Profile ──────────────────────────────── */}
          <TabsContent value="profile">
            <div className="space-y-6">
              {/* Profile Info Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                      <User className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <CardTitle>My Profile</CardTitle>
                      <CardDescription>Your account information</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                      <p className="text-base font-semibold">{currentUser?.name ?? '—'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <p className="text-base font-semibold">{currentUser?.email ?? '—'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Role</p>
                      <Badge
                        variant="secondary"
                        className={
                          currentUser?.role === 'super_admin'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : currentUser?.role === 'admin'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : currentUser?.role === 'agent'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                        }
                      >
                        {currentUser?.role === 'super_admin'
                          ? 'Super Admin'
                          : currentUser?.role === 'admin'
                            ? 'Admin'
                            : currentUser?.role === 'agent'
                              ? 'Agent'
                              : 'Viewer'}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Organization</p>
                      <p className="text-base font-semibold">{currentUser?.organizationName ?? '—'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Change Password Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <Key className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <CardTitle>Change Password</CardTitle>
                      <CardDescription>Update your account password</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {profileMessage && (
                    <Alert className={profileMessage.includes('success') ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20' : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'}>
                      <AlertDescription className={profileMessage.includes('success') ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}>
                        {profileMessage}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="current-password"
                        type="password"
                        value={profileForm.currentPassword}
                        onChange={(e) => setProfileForm({ ...profileForm, currentPassword: e.target.value })}
                        placeholder="Enter current password"
                        className="pl-9"
                        disabled={profileSaving || profileMutation.isPending}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={profileForm.newPassword}
                        onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                        placeholder="Min. 8 characters"
                        disabled={profileSaving || profileMutation.isPending}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={profileForm.confirmPassword}
                        onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                        placeholder="Re-enter new password"
                        disabled={profileSaving || profileMutation.isPending}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-end">
                    <Button
                      onClick={handleChangePassword}
                      disabled={
                        profileSaving ||
                        profileMutation.isPending ||
                        !profileForm.currentPassword ||
                        !profileForm.newPassword ||
                        !profileForm.confirmPassword
                      }
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {profileSaving || profileMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Update Password
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ──────────────────────────────── Tab 4: Roles & Permissions ──────────────────────────────── */}
          {canManageUsers && (
            <TabsContent value="roles">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <CardTitle>Roles & Permissions</CardTitle>
                      <CardDescription>
                        View the permission matrix for each role level. Contact super admin to request changes.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-[180px] font-semibold">Feature</TableHead>
                          <TableHead className="text-center font-semibold">
                            <div className="flex items-center justify-center gap-2">
                              <Shield className="h-4 w-4 text-emerald-600" />
                              Admin
                            </div>
                          </TableHead>
                          <TableHead className="text-center font-semibold">
                            <div className="flex items-center justify-center gap-2">
                              <User className="h-4 w-4 text-blue-600" />
                              Agent
                            </div>
                          </TableHead>
                          <TableHead className="text-center font-semibold">
                            <div className="flex items-center justify-center gap-2">
                              <Eye className="h-4 w-4 text-zinc-500" />
                              Viewer
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {PERMISSION_MATRIX.map((row) => (
                          <TableRow key={row.feature}>
                            <TableCell className="font-medium">{row.feature}</TableCell>
                            <TableCell className="text-center">
                              {row.admin ? (
                                <CheckCircle className="h-5 w-5 text-emerald-500 mx-auto" />
                              ) : (
                                <XCircle className="h-5 w-5 text-zinc-300 dark:text-zinc-600 mx-auto" />
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {row.agent ? (
                                <CheckCircle className="h-5 w-5 text-emerald-500 mx-auto" />
                              ) : (
                                <XCircle className="h-5 w-5 text-zinc-300 dark:text-zinc-600 mx-auto" />
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {row.viewer ? (
                                <CheckCircle className="h-5 w-5 text-emerald-500 mx-auto" />
                              ) : (
                                <XCircle className="h-5 w-5 text-zinc-300 dark:text-zinc-600 mx-auto" />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Note:</span> This permission matrix is read-only.
                      Super Admins have full access to all features. To modify permissions, contact the system administrator.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
          {/* ──────────────────────────────── Tab 5: Audit Logs ──────────────────────────────── */}
          <TabsContent value="audit-logs">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <CardTitle>Audit Logs</CardTitle>
                    <CardDescription>Track all actions performed within the organization</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={auditFilter} onValueChange={(v) => { setAuditFilter(v); setAuditDisplayCount(20); }}>
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder="Filter action" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Actions</SelectItem>
                        <SelectItem value="create">Create</SelectItem>
                        <SelectItem value="update">Update</SelectItem>
                        <SelectItem value="delete">Delete</SelectItem>
                        <SelectItem value="login">Login</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {auditLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : displayedLogs.length === 0 ? (
                  <div className="py-12 text-center">
                    <ClipboardList className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No audit logs found</p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="font-semibold">Timestamp</TableHead>
                            <TableHead className="font-semibold">User</TableHead>
                            <TableHead className="font-semibold">Action</TableHead>
                            <TableHead className="font-semibold">Resource</TableHead>
                            <TableHead className="font-semibold">IP Address</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {displayedLogs.map((log) => {
                            const actionColor = {
                              create: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                              update: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                              delete: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                              login: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                            }[log.action] ?? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
                            return (
                              <TableRow key={log.id}>
                                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                  {formatDateTime(log.timestamp)}
                                </TableCell>
                                <TableCell className="font-medium whitespace-nowrap">{log.userName}</TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className={actionColor}>
                                    {log.action}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm">{log.resource}</TableCell>
                                <TableCell className="text-sm font-mono text-muted-foreground">{log.ipAddress}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    {hasMoreLogs && (
                      <div className="flex justify-center pt-2">
                        <Button
                          variant="outline"
                          onClick={() => setAuditDisplayCount((prev) => prev + 20)}
                        >
                          Load More ({filteredLogs.length - auditDisplayCount} remaining)
                        </Button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground text-center">
                      Showing {displayedLogs.length} of {filteredLogs.length} entries
                      {auditData?.pagination?.total != null && (
                        <> ({auditData.pagination.total} total in system)</>
                      )}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      )}
    </div>
  );
}

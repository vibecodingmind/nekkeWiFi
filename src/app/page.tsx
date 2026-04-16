'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard,
  Building2,
  Users,
  Package,
  Router,
  Link2,
  Activity,
  FileText,
  CreditCard,
  BarChart3,
  Menu,
  X,
  Bell,
  Globe,
  LogOut,
  Settings,
  UserCog,
  Shield,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';

import LoginPage from '@/components/isp/LoginPage';
import DashboardPage from '@/components/isp/DashboardPage';
import OrganizationsPage from '@/components/isp/OrganizationsPage';
import CustomersPage from '@/components/isp/CustomersPage';
import PlansPage from '@/components/isp/PlansPage';
import DevicesPage from '@/components/isp/DevicesPage';
import SubscriptionsPage from '@/components/isp/SubscriptionsPage';
import UsagePage from '@/components/isp/UsagePage';
import InvoicesPage from '@/components/isp/InvoicesPage';
import PaymentsPage from '@/components/isp/PaymentsPage';
import ReportsPage from '@/components/isp/ReportsPage';
import UsersPage from '@/components/isp/UsersPage';
import SettingsPage from '@/components/isp/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
    },
  },
});

interface Organization {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

// Nav items with their required permissions
interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  roles?: string[]; // allowed roles, undefined = all
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'organizations', label: 'Organizations', icon: Building2, roles: ['super_admin'] },
  { id: 'customers', label: 'Customers', icon: Users, permission: 'customers.view' },
  { id: 'plans', label: 'Plans', icon: Package, permission: 'plans.view' },
  { id: 'devices', label: 'Devices', icon: Router, permission: 'devices.view' },
  { id: 'subscriptions', label: 'Subscriptions', icon: Link2, permission: 'subscriptions.view' },
  { id: 'usage', label: 'Usage Metering', icon: Activity, permission: 'usage.view' },
  { id: 'invoices', label: 'Invoices', icon: FileText, permission: 'invoices.view' },
  { id: 'payments', label: 'Payments', icon: CreditCard, permission: 'payments.view' },
  { id: 'reports', label: 'Reports', icon: BarChart3, permission: 'reports.view' },
  { id: 'users', label: 'Users & Roles', icon: UserCog, permission: 'users.view' },
  { id: 'settings', label: 'Settings', icon: Settings, permission: 'settings.view' },
];

function getRoleBadgeColor(role: string): string {
  switch (role) {
    case 'super_admin': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'admin': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'agent': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'viewer': return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
    default: return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
  }
}

function getRoleLabel(role: string): string {
  switch (role) {
    case 'super_admin': return 'Super Admin';
    case 'admin': return 'Admin';
    case 'agent': return 'Agent';
    case 'viewer': return 'Viewer';
    default: return role;
  }
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function AppContent() {
  const { user, isAuthenticated, isLoading: authLoading, logout, hasPermission } = useAuthStore();
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [notifications] = useState<number>(3);

  const { data: organizations, isLoading: orgsLoading } = useQuery<Organization[]>({
    queryKey: ['organizations-list'],
    queryFn: async () => {
      const res = await fetch('/api/organizations');
      if (!res.ok) throw new Error('Failed to load organizations');
      return res.json();
    },
    enabled: isAuthenticated,
  });

  // Auto-select org based on user's org
  const effectiveOrgId = selectedOrgId ?? user?.organizationId ?? (organizations && organizations.length > 0
    ? (organizations.find((o) => o.isActive) ?? organizations[0]).id
    : null);

  // Filter nav items based on user role/permissions
  const visibleNavItems = navItems.filter(item => {
    if (!isAuthenticated) return false;
    // Super admin sees everything
    if (user?.role === 'super_admin') return true;
    // Check role restriction
    if (item.roles && !item.roles.includes(user?.role ?? '')) return false;
    // Check permission
    if (item.permission && !hasPermission(item.permission)) return false;
    return true;
  });

  const handleNavClick = (pageId: string) => {
    setActivePage(pageId);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    logout();
    setActivePage('dashboard');
    setSelectedOrgId(null);
  };

  const renderPage = () => {
    const props = { orgId: effectiveOrgId };
    switch (activePage) {
      case 'dashboard': return <DashboardPage {...props} />;
      case 'organizations': return <OrganizationsPage />;
      case 'customers': return <CustomersPage {...props} />;
      case 'plans': return <PlansPage {...props} />;
      case 'devices': return <DevicesPage {...props} />;
      case 'subscriptions': return <SubscriptionsPage {...props} />;
      case 'usage': return <UsagePage {...props} />;
      case 'invoices': return <InvoicesPage {...props} />;
      case 'payments': return <PaymentsPage {...props} />;
      case 'reports': return <ReportsPage {...props} />;
      case 'users': return <UsersPage {...props} />;
      case 'settings': return <SettingsPage {...props} />;
      default: return <DashboardPage {...props} />;
    }
  };

  const selectedOrgName = organizations?.find((o) => o.id === effectiveOrgId)?.name ?? 'Select Organization';

  // ── Auth Gate ──
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-600 flex items-center justify-center mx-auto animate-pulse">
            <Globe className="h-7 w-7 text-white" />
          </div>
          <p className="text-muted-foreground text-sm">Loading nekkeWiFi...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <QueryClientProvider client={queryClient}>
        <LoginPage />
      </QueryClientProvider>
    );
  }

  // ── Main App Layout ──
  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-zinc-900 text-zinc-100 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg tracking-tight">
                <span className="text-emerald-400">nekke</span>
                <span className="text-white">WiFi</span>
              </h2>
              <p className="text-xs text-zinc-400">Billing & Network Platform</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-400 hover:text-zinc-100 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Organization Badge */}
        {user.role !== 'super_admin' && (
          <div className="px-4 py-2 border-b border-zinc-800">
            <div className="flex items-center gap-2 text-xs">
              <Building2 className="h-3 w-3 text-emerald-400" />
              <span className="text-zinc-300 truncate">{user.organizationName}</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="px-3 space-y-1">
            {visibleNavItems.map((item) => {
              const isActive = activePage === item.id;
              const Icon = item.icon;
              return (
                <TooltipProvider key={item.id} delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-emerald-600/20 text-emerald-400'
                            : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                        }`}
                      >
                        <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-emerald-400' : ''}`} />
                        <span>{item.label}</span>
                        {isActive && (
                          <div className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="lg:hidden">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Sidebar Footer — Current User */}
        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-emerald-600 text-white text-xs font-semibold">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-zinc-400 truncate">{user.email}</p>
            </div>
            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${getRoleBadgeColor(user.role)}`}>
              {getRoleLabel(user.role)}
            </Badge>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-16 bg-white dark:bg-zinc-950 border-b flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Page title */}
            <h1 className="text-lg font-semibold hidden sm:block">
              {navItems.find(n => n.id === activePage)?.label ?? 'Dashboard'}
            </h1>

            {/* Organization Selector (only for super_admin) */}
            {user.role === 'super_admin' && (
              <Select value={effectiveOrgId ?? ''} onValueChange={(v) => setSelectedOrgId(v)}>
                <SelectTrigger className="w-56">
                  {orgsLoading ? (
                    <Skeleton className="h-4 w-32" />
                  ) : (
                    <>
                      <SelectValue placeholder="Select Organization">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate">{selectedOrgName}</span>
                        </div>
                      </SelectValue>
                    </>
                  )}
                </SelectTrigger>
                <SelectContent>
                  {organizations?.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      <div className="flex items-center gap-2">
                        <span>{org.name}</span>
                        {!org.isActive && (
                          <Badge variant="secondary" className="text-xs bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-4 w-4" />
                    {notifications > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {notifications}
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {notifications} notifications
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* User Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-emerald-600 text-white text-xs font-semibold">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${getRoleBadgeColor(user.role)}`}>
                        <Shield className="h-3 w-3 mr-1" />
                        {getRoleLabel(user.role)}
                      </Badge>
                      {user.role !== 'super_admin' && (
                        <span className="text-xs text-muted-foreground">{user.organizationName}</span>
                      )}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleNavClick('settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                {(user.role === 'super_admin' || user.role === 'admin') && (
                  <DropdownMenuItem onClick={() => handleNavClick('users')}>
                    <UserCog className="mr-2 h-4 w-4" />
                    User Management
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

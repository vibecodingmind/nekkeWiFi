import { create } from 'zustand';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'agent' | 'viewer';
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  avatar: string | null;
  isActive: boolean;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  hasPermission: (permission: string) => boolean;
}

// Role permissions map
const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: [
    'dashboard.view', 'organizations.view', 'organizations.manage',
    'customers.view', 'customers.manage', 'customers.delete',
    'plans.view', 'plans.manage', 'plans.delete',
    'devices.view', 'devices.manage', 'devices.delete', 'devices.test_connection',
    'subscriptions.view', 'subscriptions.manage', 'subscriptions.delete',
    'usage.view', 'invoices.view', 'invoices.manage', 'invoices.delete',
    'payments.view', 'payments.manage', 'pesapal.manage',
    'reports.view', 'reports.export',
    'users.view', 'users.manage', 'users.delete',
    'settings.view', 'settings.manage', 'gateways.manage',
  ],
  admin: [
    'dashboard.view',
    'customers.view', 'customers.manage', 'customers.delete',
    'plans.view', 'plans.manage', 'plans.delete',
    'devices.view', 'devices.manage', 'devices.delete', 'devices.test_connection',
    'subscriptions.view', 'subscriptions.manage', 'subscriptions.delete',
    'usage.view', 'invoices.view', 'invoices.manage', 'invoices.delete',
    'payments.view', 'payments.manage', 'pesapal.manage',
    'reports.view', 'reports.export',
    'users.view', 'users.manage',
    'settings.view', 'settings.manage', 'gateways.manage',
  ],
  agent: [
    'dashboard.view',
    'customers.view', 'customers.manage',
    'plans.view',
    'devices.view', 'devices.test_connection',
    'subscriptions.view', 'subscriptions.manage',
    'usage.view', 'invoices.view', 'invoices.manage',
    'payments.view', 'payments.manage',
    'reports.view',
  ],
  viewer: [
    'dashboard.view',
    'customers.view',
    'plans.view',
    'devices.view',
    'subscriptions.view',
    'usage.view', 'invoices.view',
    'payments.view',
    'reports.view',
  ],
};

const SESSION_KEY = 'nekkewifi_session';

function restoreSession(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      return JSON.parse(stored) as AuthUser;
    }
  } catch {
    localStorage.removeItem(SESSION_KEY);
  }
  return null;
}

function persistSession(user: AuthUser | null) {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

export const useAuthStore = create<AuthState>((set, get) => {
  const restored = restoreSession();

  return {
    user: restored,
    isAuthenticated: !!restored,
    isLoading: false,

    login: async (email: string, password: string) => {
      set({ isLoading: true });
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Login failed');
        }

        const { user } = data;
        set({ user, isAuthenticated: true, isLoading: false });
        persistSession(user);
      } catch (error) {
        set({ isLoading: false });
        throw error;
      }
    },

    logout: () => {
      set({ user: null, isAuthenticated: false, isLoading: false });
      persistSession(null);
    },

    setLoading: (loading: boolean) => {
      set({ isLoading: loading });
    },

    hasPermission: (permission: string) => {
      const { user } = get();
      if (!user) return false;
      const permissions = ROLE_PERMISSIONS[user.role];
      return permissions ? permissions.includes(permission) : false;
    },
  };
});

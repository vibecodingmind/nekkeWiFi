import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

// ──────────────────────────────────────────
// CONFIGURATION
// ──────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'nekkewifi-dev-secret-key-change-in-production';
const JWT_EXPIRY = '7d';

// ──────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────
export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  organizationId: string;
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
  organizationId: string;
}

// ──────────────────────────────────────────
// ROLE-PERMISSION MAP
// Mirrors the client-side ROLE_PERMISSIONS in auth-store.ts
// ──────────────────────────────────────────
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

// ──────────────────────────────────────────
// PASSWORD HELPERS
// ──────────────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ──────────────────────────────────────────
// JWT HELPERS
// ──────────────────────────────────────────
export function generateToken(payload: {
  userId: string;
  email: string;
  role: string;
  organizationId: string;
}): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      organizationId: decoded.organizationId,
      iat: decoded.iat,
      exp: decoded.exp,
    };
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────
// AUTH EXTRACTION HELPERS
// ──────────────────────────────────────────
function extractToken(request: NextRequest): string | null {
  // Try Authorization: Bearer <token>
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try x-auth-token header
  const tokenHeader = request.headers.get('x-auth-token');
  if (tokenHeader) {
    return tokenHeader;
  }

  return null;
}

export function getAuthUser(request: NextRequest): AuthUser | null {
  const token = extractToken(request);
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  return {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    organizationId: payload.organizationId,
  };
}

export function requireAuth(request: NextRequest): AuthUser {
  const user = getAuthUser(request);
  if (!user) {
    throw new AuthError('Authentication required. Please provide a valid token.', 401);
  }
  return user;
}

export function requireRole(request: NextRequest, roles: string[]): AuthUser {
  const user = requireAuth(request);
  if (!roles.includes(user.role)) {
    throw new AuthError('Insufficient permissions. Your role does not have access to this resource.', 403);
  }
  return user;
}

export function requirePermission(request: NextRequest, permission: string): AuthUser {
  const user = requireAuth(request);
  const permissions = ROLE_PERMISSIONS[user.role];
  if (!permissions || !permissions.includes(permission)) {
    throw new AuthError(
      `Permission denied. Required: ${permission}. Your role '${user.role}' does not have this permission.`,
      403
    );
  }
  return user;
}

// ──────────────────────────────────────────
// CUSTOM ERROR CLASS
// ──────────────────────────────────────────
export class AuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'AuthError';
  }
}

// ──────────────────────────────────────────
// ORG ISOLATION HELPER
// Returns the organizationId to use for queries.
// Non-super_admin users are always scoped to their own organization.
// Super_admin users can use the orgId from query params or their own org.
// ──────────────────────────────────────────
export function getOrgFilter(
  authUser: AuthUser,
  queryOrgId?: string | null
): string {
  if (authUser.role === 'super_admin') {
    return queryOrgId || authUser.organizationId;
  }
  // Non-super_admin always scoped to their own org
  return authUser.organizationId;
}

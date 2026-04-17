import { NextRequest, NextResponse } from 'next/server';

// ──────────────────────────────────────────
// PUBLIC ROUTES (no auth required)
// ──────────────────────────────────────────
const PUBLIC_PATHS = [
  '/api/auth',           // login
  '/api/auth/logout',    // logout
  '/api/pesapal/webhook', // external webhook from Pesapal
  '/api/portal',         // customer portal (phone-based auth)
  '/api/portal/invoices',
  '/api/portal/pay',
  '/api/portal/payments',
  '/api/portal/usage',
];

function isPublicPath(pathname: string): boolean {
  // Exact matches
  if (PUBLIC_PATHS.some(p => pathname === p)) return true;
  // Prefix matches (e.g. /api/auth/logout)
  if (pathname.startsWith('/api/auth/')) return true;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only intercept /api/* routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Allow public routes
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Check for Authorization header
  const authHeader = request.headers.get('authorization');
  const tokenHeader = request.headers.get('x-auth-token');

  const hasToken = (authHeader?.startsWith('Bearer ') && authHeader.length > 7) || !!tokenHeader;

  if (!hasToken) {
    return NextResponse.json(
      {
        error: 'Authentication required. Please provide a valid token.',
        code: 'AUTH_REQUIRED',
      },
      { status: 401 }
    );
  }

  // Token exists — pass through to route handler for full validation
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};

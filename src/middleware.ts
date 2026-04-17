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

// ──────────────────────────────────────────
// IN-MEMORY RATE LIMITER
// ──────────────────────────────────────────
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 100; // 100 requests per minute per IP
const LOGIN_RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes
const LOGIN_RATE_LIMIT_MAX = 10; // 10 login attempts per 5 minutes per IP

// Cleanup old entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only intercept /api/* routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const ip = getClientIp(request);
  const now = Date.now();

  // ──────────────────────────────────────
  // RATE LIMITING — LOGIN (stricter)
  // ──────────────────────────────────────
  if (pathname === '/api/auth' && request.method === 'POST') {
    const loginKey = `login:${ip}`;
    const loginRecord = rateLimitMap.get(loginKey);

    if (!loginRecord || now > loginRecord.resetTime) {
      rateLimitMap.set(loginKey, { count: 1, resetTime: now + LOGIN_RATE_LIMIT_WINDOW });
    } else {
      loginRecord.count++;
      if (loginRecord.count > LOGIN_RATE_LIMIT_MAX) {
        return NextResponse.json(
          {
            error: 'Too many login attempts. Please try again later.',
            code: 'RATE_LIMITED',
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil((loginRecord.resetTime - now) / 1000)),
            },
          }
        );
      }
    }
  }

  // ──────────────────────────────────────
  // RATE LIMITING — GENERAL API (all routes)
  // ──────────────────────────────────────
  const generalKey = `general:${ip}`;
  const generalRecord = rateLimitMap.get(generalKey);

  if (!generalRecord || now > generalRecord.resetTime) {
    rateLimitMap.set(generalKey, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
  } else {
    generalRecord.count++;
    if (generalRecord.count > RATE_LIMIT_MAX) {
      return NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          code: 'RATE_LIMITED',
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((generalRecord.resetTime - now) / 1000)),
          },
        }
      );
    }
  }

  // Allow public routes
  if (isPublicPath(pathname)) {
    const response = NextResponse.next();
    const currentGeneralRecord = rateLimitMap.get(generalKey);
    response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX));
    response.headers.set('X-RateLimit-Remaining', String(Math.max(0, RATE_LIMIT_MAX - (currentGeneralRecord?.count ?? 0))));
    return response;
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
  const response = NextResponse.next();
  const currentGeneralRecord = rateLimitMap.get(generalKey);
  response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX));
  response.headers.set('X-RateLimit-Remaining', String(Math.max(0, RATE_LIMIT_MAX - (currentGeneralRecord?.count ?? 0))));
  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};

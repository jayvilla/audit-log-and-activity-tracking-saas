import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware for server-side route protection
 * 
 * Protects all routes under the (app) route group by checking authentication
 * via the /api/auth/me endpoint. Unauthenticated users are redirected to /login
 * with a redirectTo parameter.
 */

// Get API URL from environment variable
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

/**
 * Routes that require authentication (under (app) route group)
 */
const protectedRoutes = [
  '/overview',
  '/audit-logs',
  '/api-keys',
  '/webhooks',
  '/settings',
];

/**
 * Public routes that should never be protected
 */
const publicRoutes = ['/login', '/sign-up'];

/**
 * Check if a path requires authentication
 */
function isProtectedRoute(pathname: string): boolean {
  // Check exact matches
  if (protectedRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
    return true;
  }
  return false;
}

/**
 * Check if a path is a public route
 */
function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'));
}

/**
 * Check if a path should be excluded from middleware (static assets, Next.js internals, etc.)
 */
function shouldExcludePath(pathname: string): boolean {
  // Exclude Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/robots.txt') ||
    pathname.startsWith('/sitemap.xml') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|eot)$/)
  ) {
    return true;
  }
  return false;
}

/**
 * Verify authentication by calling the /api/auth/me endpoint
 */
async function verifyAuth(cookieHeader: string | null): Promise<boolean> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Forward cookies from the request
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    const response = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      headers,
      credentials: 'include',
      cache: 'no-store',
    });

    // If response is OK, user is authenticated
    return response.ok;
  } catch (error) {
    // If the API call fails, assume not authenticated
    console.error('Auth verification failed:', error);
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for excluded paths (static assets, Next.js internals, API routes)
  if (shouldExcludePath(pathname)) {
    return NextResponse.next();
  }

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Check if route requires authentication
  if (isProtectedRoute(pathname)) {
    // Get cookies from the request
    const cookieHeader = request.headers.get('cookie');

    // Verify authentication
    const isAuthenticated = await verifyAuth(cookieHeader);

    if (!isAuthenticated) {
      // Redirect to login with redirectTo parameter
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Allow the request to proceed
  return NextResponse.next();
}

/**
 * Matcher configuration for Next.js middleware
 * Only runs on routes that might need protection
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)',
  ],
};


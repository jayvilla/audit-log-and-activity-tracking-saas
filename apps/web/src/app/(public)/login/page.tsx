'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { login, getMe } from '../../../lib/api-client';
import { usePageTitle } from '../../../lib/use-page-title';
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Separator,
} from '@audit-log-and-activity-tracking-saas/ui';
import { Chrome } from 'lucide-react';
import { cn } from '../../../lib/utils';

export default function LoginPage() {
  usePageTitle('Sign In');
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const marketingUrl = process.env.NEXT_PUBLIC_MARKETING_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Login
      await login(email, password);

      // Verify login by fetching /auth/me
      const meResponse = await getMe();
      if (!meResponse || !meResponse.user) {
        throw new Error('Login verification failed');
      }

      // Redirect to redirectTo parameter if present, otherwise default to overview
      // Ensure redirectTo is a safe internal path (starts with / and doesn't contain // or ://)
      const redirectToParam = searchParams.get('redirectTo');
      const redirectTo = redirectToParam && redirectToParam.startsWith('/') && !redirectToParam.includes('//') && !redirectToParam.includes('://')
        ? redirectToParam
        : '/overview';
      router.push(redirectTo);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-6">
      <Card variant="bordered" className="w-full max-w-md p-8">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5 text-fg-on-accent"
              >
                <path
                  d="M12 2L2 7L12 12L22 7L12 2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 17L12 22L22 17"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 12L12 17L22 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-xl font-semibold text-fg">AuditLog</span>
          </div>
        </div>

        {/* Header */}
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-2xl font-semibold text-fg">Welcome back</CardTitle>
          <CardDescription className="text-fg-muted">
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>

        {/* Form */}
        <CardContent className="space-y-4">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-bg-card border-border"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  className="text-xs text-accent hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-bg-card border-border"
              />
            </div>

            {error && (
              <div
                className={cn(
                  'bg-accent-10 border border-accent-30 text-accent',
                  'px-4 py-3 rounded-md text-sm',
                  'flex items-center gap-2'
                )}
              >
                <svg
                  className="h-4 w-4 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full" disabled={isLoading} loading={isLoading}>
              Sign in
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <Separator className="bg-border" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-bg-card px-2 text-xs text-fg-muted">
              or continue with
            </span>
          </div>

          {/* Social login */}
          <Button variant="secondary" className="w-full gap-2 border-border hover:bg-bg-card">
            <Chrome className="h-4 w-4" />
            Sign in with Google
          </Button>

          {/* Footer */}
          <p className="text-center text-xs text-fg-muted mt-8">
            Don't have an account?{' '}
            <a
              href="/sign-up"
              className="text-accent hover:underline"
            >
              Sign up now
            </a>
          </p>

          {/* Security notice */}
          <div className="mt-8 p-3 rounded-lg bg-accent-10 border border-border">
            <p className="text-xs text-fg-muted text-center">
              Protected by 256-bit SSL encryption and 2FA
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


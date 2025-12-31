'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { register, getMe } from '../../../lib/api-client';
import { usePageTitle } from '../../../lib/use-page-title';
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  Separator,
} from '@audit-log-and-activity-tracking-saas/ui';
import { Chrome, Eye, EyeOff } from 'lucide-react';
import { cn } from '../../../lib/utils';

export default function SignUpPage() {
  usePageTitle('Sign Up');
  
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Validation
  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Password must include an uppercase letter';
    }
    if (!/[a-z]/.test(pwd)) {
      return 'Password must include a lowercase letter';
    }
    if (!/[0-9]/.test(pwd)) {
      return 'Password must include a number';
    }
    return null;
  };

  const passwordError = password ? validatePassword(password) : null;
  const confirmPasswordError = confirmPassword && password !== confirmPassword 
    ? 'Passwords do not match' 
    : null;
  const isFormValid = 
    name.trim() !== '' &&
    email.trim() !== '' &&
    password !== '' &&
    confirmPassword !== '' &&
    !passwordError &&
    !confirmPasswordError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isFormValid) {
      return;
    }

    setIsLoading(true);

    try {
      // Register
      await register(email, password, name);

      // Verify registration by fetching /auth/me
      const meResponse = await getMe();
      if (!meResponse || !meResponse.user) {
        throw new Error('Registration verification failed');
      }

      // Redirect to overview on success
      router.push('/overview');
    } catch (err: any) {
      const errorMessage = err.message || 'Registration failed. Please try again.';
      
      // Check if it's an email already exists error
      if (errorMessage.toLowerCase().includes('email') || errorMessage.toLowerCase().includes('already')) {
        setError(
          <span>
            {errorMessage}.{' '}
            <Link href="/login" className="underline hover:no-underline">
              Sign in instead
            </Link>
          </span>
        );
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-6">
      <Card variant="bordered" className="w-full max-w-[448px] rounded-xl border-border bg-card">
        <CardContent className="p-8">
          {/* Logo - Exact Figma: 32px container, 20px icon, gap-2 */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
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

          {/* Header - Exact Figma: 24px heading, 14px description */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-fg mb-2">
              Create your account
            </h1>
            <p className="text-sm text-fg-muted">
              Get started with AuditLog in seconds
            </p>
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm text-fg">
                Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="John Smith"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 bg-bg border-border rounded-lg px-3 py-1 text-sm"
                error={false}
              />
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-fg">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 bg-bg border-border rounded-lg px-3 py-1 text-sm"
                error={false}
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-fg">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-9 bg-bg border-border rounded-lg px-3 pr-10 py-1 text-sm"
                  error={!!passwordError}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {/* Helper text - Exact Figma: 12px, muted */}
              <p className="text-xs text-fg-muted leading-4">
                Minimum 8 characters, including uppercase, lowercase, and number
              </p>
              {passwordError && (
                <p className="text-xs text-accent">{passwordError}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm text-fg">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-9 bg-bg border-border rounded-lg px-3 pr-10 py-1 text-sm"
                  error={!!confirmPasswordError}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg transition-colors"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {confirmPasswordError && (
                <p className="text-xs text-accent">{confirmPasswordError}</p>
              )}
            </div>

            {/* Error Message */}
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

            {/* Create Account Button - Exact Figma: 36px height, disabled opacity-50 */}
            <Button
              type="submit"
              variant="primary"
              className="w-full h-9 rounded-lg"
              disabled={!isFormValid || isLoading}
              loading={isLoading}
            >
              Create account
            </Button>
          </form>

          {/* Divider - Exact Figma: "or continue with" */}
          <div className="relative my-6">
            <Separator className="bg-border" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-bg-card px-2 text-xs text-fg-muted">
              or continue with
            </span>
          </div>

          {/* Google Sign Up Button - Exact Figma: 36px height, bg-bg, border */}
          <Button
            variant="secondary"
            className="w-full h-9 gap-2 border-border rounded-lg bg-bg hover:bg-bg-card"
            disabled
          >
            <Chrome className="h-4 w-4" />
            Sign up with Google
          </Button>

          {/* Footer - Exact Figma: 12px text, "Sign in" link is 14px, accent color */}
          <p className="text-center text-xs text-fg-muted mt-8">
            Already have an account?{' '}
            <Link href="/login" className="text-sm text-accent hover:underline">
              Sign in
            </Link>
          </p>

          {/* Security notice - Exact Figma: 12px, muted, bg with opacity */}
          <div className="mt-8 p-3.5 rounded-[10px] bg-bg-ui-50 border border-border">
            <p className="text-xs text-fg-muted text-center">
              Protected by 256-bit SSL encryption and 2FA
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


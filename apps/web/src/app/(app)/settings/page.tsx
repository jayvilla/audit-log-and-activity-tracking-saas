'use client';

import { useState, useEffect } from 'react';
import { getMe } from '../../../lib/api-client';
import { usePageTitle } from '../../../lib/use-page-title';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Skeleton,
} from '@audit-log-and-activity-tracking-saas/ui';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'member' | 'viewer';
  orgId: string;
}

export default function SettingsPage() {
  usePageTitle('Settings');
  
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const meResponse = await getMe();
        if (meResponse?.user) {
          setUser(meResponse.user);
        }
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--foreground))]">Settings</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Loading...</p>
        </div>
        <Card variant="bordered">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--foreground))]">Settings</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Unable to load user information</p>
        </div>
      </div>
    );
  }

  const isAdmin = user.role === 'admin';
  const isMember = user.role === 'member';
  const isViewer = user.role === 'viewer';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[hsl(var(--foreground))]">Settings</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          {isAdmin
            ? 'Manage your account and organization settings'
            : isMember
            ? 'Manage your account settings'
            : 'View your account settings'}
        </p>
      </div>

      <div className="space-y-6">
        {/* Account Information */}
        <Card variant="bordered">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[hsl(var(--card-foreground))]">
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="user-email" className="text-sm font-medium text-[hsl(var(--muted-foreground))] block mb-1">
                Email
              </label>
              <p id="user-email" className="text-[hsl(var(--foreground))]">{user.email}</p>
            </div>
            {user.name && (
              <div>
                <label htmlFor="user-name" className="text-sm font-medium text-[hsl(var(--muted-foreground))] block mb-1">
                  Name
                </label>
                <p id="user-name" className="text-[hsl(var(--foreground))]">{user.name}</p>
              </div>
            )}
            <div>
              <label htmlFor="user-role" className="text-sm font-medium text-[hsl(var(--muted-foreground))] block mb-1">
                Role
              </label>
              <div className="mt-1">
                <Badge id="user-role" variant="muted" className="capitalize">
                  {user.role}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin-only settings */}
        {isAdmin && (
          <Card variant="bordered">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[hsl(var(--card-foreground))]">
                Organization Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[hsl(var(--muted-foreground))]">Organization management features coming soon</p>
            </CardContent>
          </Card>
        )}

        {/* Member settings */}
        {isMember && (
          <Card variant="bordered">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[hsl(var(--card-foreground))]">
                Preferences
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[hsl(var(--muted-foreground))]">Additional settings coming soon</p>
            </CardContent>
          </Card>
        )}

        {/* Viewer settings - minimal */}
        {isViewer && (
          <Card variant="bordered">
            <CardContent>
              <p className="text-[hsl(var(--muted-foreground))] text-sm">
                Limited settings available for your role. Contact an administrator for additional configuration options.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}


'use client';

import { useState, useEffect } from 'react';
import { usePageTitle } from '../../../lib/use-page-title';
import { getMe, getCsrfToken } from '../../../lib/api-client';
import {
  Card,
  CardContent,
  Input,
  Label,
  Button,
} from '@audit-log-and-activity-tracking-saas/ui';
import { User, Building2, Info } from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  name: string | null;
  orgId: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export default function SettingsPage() {
  usePageTitle('Settings');

  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function loadUser() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getMe();
        if (response?.user) {
          setUser(response.user);
          setName(response.user.name || '');
        } else {
          setError('Failed to load user data');
        }
      } catch (err) {
        console.error('Failed to load user:', err);
        setError('Failed to load user data');
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, []);

  const handleSaveName = async () => {
    if (!user) return;

    // TODO: Implement PATCH /api/users/me endpoint in backend
    // The endpoint should accept { name: string } and return updated user
    // For now, this is a placeholder that will fail gracefully
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/users/me`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken,
          },
          credentials: 'include',
          body: JSON.stringify({ name }),
        }
      );

      if (!response.ok) {
        // Endpoint doesn't exist yet - show TODO message
        setSaveError(
          'Name update is not yet available. Backend endpoint PATCH /api/users/me needs to be implemented.'
        );
        return;
      }

      const updated = await response.json();
      if (updated.user) {
        setUser(updated.user);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err: any) {
      console.error('Failed to update name:', err);
      setSaveError(
        'Name update is not yet available. Backend endpoint PATCH /api/users/me needs to be implemented.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const formatWorkspaceId = (orgId: string) => {
    // Format UUID as workspace ID (e.g., ws_1a2b3c4d5e6f)
    return `ws_${orgId.substring(0, 12).replace(/-/g, '')}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 bg-bg-ui-30 rounded animate-pulse mb-2" />
          <div className="h-5 w-96 bg-bg-ui-30 rounded animate-pulse" />
        </div>
        <div className="h-64 bg-bg-ui-30 rounded-xl animate-pulse" />
        <div className="h-96 bg-bg-ui-30 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-fg">Settings</h2>
          <p className="text-sm text-fg-muted mt-1">
            Manage your account and workspace settings
          </p>
        </div>
        <Card variant="bordered" className="p-6">
          <p className="text-sm text-accent">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-fg">Settings</h2>
        <p className="text-sm text-fg-muted mt-1">
          Manage your account and workspace settings
        </p>
      </div>

      {/* Profile Card */}
      <Card variant="bordered" className="p-0">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6">
            {/* Profile Header */}
            <div className="flex gap-3 items-center">
              <div className="bg-accent-10 rounded-lg size-10 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-fg">Profile</h3>
                <p className="text-xs text-fg-muted">
                  Your personal account information
                </p>
              </div>
            </div>

            {/* Profile Fields */}
            <div className="flex flex-col gap-4">
              {/* Name Field */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="name" className="text-sm text-fg">
                  Name
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="bg-bg border-border"
                    disabled={isSaving}
                  />
                  {name !== user?.name && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSaveName}
                      disabled={isSaving}
                      loading={isSaving}
                    >
                      Save
                    </Button>
                  )}
                </div>
                {saveError && (
                  <p className="text-xs text-accent">{saveError}</p>
                )}
                {saveSuccess && (
                  <p className="text-xs text-semantic-success">
                    Name updated successfully
                  </p>
                )}
              </div>

              {/* Email Field */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="email" className="text-sm text-fg">
                  Email
                </Label>
                <Input
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-bg-ui-30/50 border-border opacity-50"
                />
                <p className="text-xs text-fg-muted">
                  Email cannot be changed. Contact support if you need to update
                  your email address.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workspace Card */}
      <Card variant="bordered" className="p-0">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6">
            {/* Workspace Header */}
            <div className="flex gap-3 items-center">
              <div className="bg-accent-10 rounded-lg size-10 flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-fg">Workspace</h3>
                <p className="text-xs text-fg-muted">
                  Your organization and plan details
                </p>
              </div>
            </div>

            {/* Workspace Fields */}
            <div className="flex flex-col gap-4">
              {/* Workspace Name */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="workspace-name" className="text-sm text-fg">
                  Workspace Name
                </Label>
                <Input
                  id="workspace-name"
                  value="Organization Name"
                  disabled
                  className="bg-bg-ui-30/50 border-border opacity-50"
                />
                <p className="text-xs text-fg-muted">
                  {/* TODO: Organization data not available from current API.
                  GET /api/orgs endpoint needs to be implemented to fetch
                  organization name. Currently only orgId is available from
                  /api/auth/me. */}
                  Workspace settings are managed by your administrator.
                </p>
              </div>

              {/* Workspace ID */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="workspace-id" className="text-sm text-fg">
                  Workspace ID
                </Label>
                <div className="bg-bg-ui-30 border border-border rounded-lg h-[34px] flex items-center px-3">
                  <code className="text-xs font-mono text-fg">
                    {user?.orgId ? formatWorkspaceId(user.orgId) : 'N/A'}
                  </code>
                </div>
                <p className="text-xs text-fg-muted">
                  Use this ID when contacting support or configuring
                  integrations.
                </p>
              </div>

              {/* Current Plan */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="current-plan" className="text-sm text-fg">
                  Current Plan
                </Label>
                <Input
                  id="current-plan"
                  value="Enterprise"
                  disabled
                  className="bg-bg-ui-30/50 border-border opacity-50"
                />
                {/* TODO: Plan/subscription data not available from current API.
                This field should be populated from a subscription/billing
                endpoint when available. */}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Banner */}
      <Card
        variant="bordered"
        className="p-4 bg-semantic-info/5 border-semantic-info/20"
      >
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-semantic-info flex-shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-fg">
              Need more control?
            </p>
            <p className="text-sm text-fg-muted">
              Advanced settings like team management, billing, and security
              options are available to workspace administrators. Contact your
              admin to request changes.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}


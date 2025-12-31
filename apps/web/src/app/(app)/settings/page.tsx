'use client';

import { usePageTitle } from '../../../lib/use-page-title';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@audit-log-and-activity-tracking-saas/ui';

export default function SettingsPage() {
  usePageTitle('Settings');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-fg">Settings</h2>
        <p className="text-sm text-fg-muted mt-1">
          Manage your account and organization settings
        </p>
      </div>

      {/* Coming Soon */}
      <Card variant="bordered" className="p-8">
        <CardContent className="text-center">
          <p className="text-sm text-fg-muted">Settings management coming soon</p>
        </CardContent>
      </Card>
    </div>
  );
}


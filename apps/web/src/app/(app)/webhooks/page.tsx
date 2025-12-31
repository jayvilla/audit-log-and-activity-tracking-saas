'use client';

import { usePageTitle } from '../../../lib/use-page-title';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@audit-log-and-activity-tracking-saas/ui';

export default function WebhooksPage() {
  usePageTitle('Webhooks');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-fg">Webhooks</h2>
        <p className="text-sm text-fg-muted mt-1">
          Configure webhooks to receive real-time event notifications
        </p>
      </div>

      {/* Coming Soon */}
      <Card variant="bordered" className="p-8">
        <CardContent className="text-center">
          <p className="text-sm text-fg-muted">Webhooks management coming soon</p>
        </CardContent>
      </Card>
    </div>
  );
}


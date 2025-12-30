'use client';

import { Card } from '../../../components/ui/card';
import { usePageTitle } from '../../../lib/use-page-title';

export default function WebhooksPage() {
  usePageTitle('Webhooks');
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">Webhooks</h1>
        <p className="text-sm text-muted mt-1">Configure webhooks to receive real-time event notifications</p>
      </div>

      <Card className="p-8">
        <div className="text-center">
          <p className="text-sm text-muted">Webhooks management coming soon</p>
        </div>
      </Card>
    </div>
  );
}


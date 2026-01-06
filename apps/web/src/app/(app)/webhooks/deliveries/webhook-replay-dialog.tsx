'use client';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
  Card,
  Badge,
} from '@audit-log-and-activity-tracking-saas/ui';
import {
  AlertTriangle,
  RefreshCw,
  Info,
  Zap,
  Lock,
} from 'lucide-react';
import type { WebhookDelivery } from '../../../../lib/api-client';

interface WebhookReplayDialogProps {
  delivery: WebhookDelivery | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function WebhookReplayDialog({
  delivery,
  open,
  onOpenChange,
  onConfirm,
}: WebhookReplayDialogProps) {
  if (!delivery) return null;

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] bg-bg border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-accent" />
            Replay Webhook Delivery
          </DialogTitle>
          <DialogDescription>
            Manually retry this failed webhook delivery
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning Card */}
          <Card variant="bordered" className="p-4 bg-orange-500/5 border-orange-500/20">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 shrink-0">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-orange-500">Action Required: Admin Only</p>
                <p className="text-xs text-fg-muted">
                  This action will immediately send the webhook payload to your endpoint. Ensure your endpoint is ready to receive this event.
                </p>
              </div>
            </div>
          </Card>

          {/* Delivery Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-fg">Delivery Details</h4>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-5 w-5">
                    <Info className="h-3 w-3 text-fg-muted" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="text-xs">
                    Review the delivery information below before replaying. The same payload will be sent to the same endpoint.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>

            <Card variant="bordered" className="p-3 border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-fg-muted">Webhook</span>
                <span className="text-xs font-medium text-fg">{delivery.webhookName || 'Unknown'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-fg-muted">Event</span>
                <code className="text-xs bg-accent px-2 py-0.5 rounded text-fg">
                  {delivery.eventType}
                </code>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs text-fg-muted shrink-0">Endpoint</span>
                <code className="text-xs bg-accent px-2 py-0.5 rounded break-all text-right text-fg">
                  {delivery.endpoint}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-fg-muted">Original Attempt</span>
                <span className="text-xs font-mono text-fg-muted">
                  {new Date(delivery.attemptedAt).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-fg-muted">Previous Attempts</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {delivery.attempts}x
                </Badge>
              </div>
            </Card>
          </div>

          {/* Idempotency Notice */}
          <Card variant="bordered" className="p-4 bg-blue-500/5 border-blue-500/20">
            <div className="flex gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 shrink-0">
                    <Lock className="h-5 w-5 text-blue-500" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="text-xs">
                    Replayed webhooks use the same delivery ID and event timestamp to help your endpoint detect and handle duplicates safely.
                  </p>
                </TooltipContent>
              </Tooltip>
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-500">Idempotency Preserved</p>
                <p className="text-xs text-fg-muted">
                  The delivery ID and payload remain unchanged. Your endpoint can use the delivery ID to detect replays and prevent duplicate processing.
                </p>
              </div>
            </div>
          </Card>

          {/* What Will Happen */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-fg">What Will Happen</h4>
            <ul className="space-y-1.5 text-xs text-fg-muted">
              <li className="flex items-start gap-2">
                <Zap className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                <span>
                  The original request payload will be sent to{' '}
                  <code className="bg-accent px-1 rounded text-fg">{delivery.endpoint}</code>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Zap className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                <span>A new delivery attempt will be created in the delivery history</span>
              </li>
              <li className="flex items-start gap-2">
                <Zap className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                <span>You'll be able to view the response or error in the delivery details</span>
              </li>
              <li className="flex items-start gap-2">
                <Zap className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                <span>This action will be logged in your audit trail</span>
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Confirm Replay
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </TooltipProvider>
  );
}


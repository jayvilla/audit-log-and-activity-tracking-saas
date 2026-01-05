'use client';

import { useState, useEffect } from 'react';
import {
  getWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  type Webhook,
  type CreateWebhookRequest,
  type UpdateWebhookRequest,
} from '../../../lib/api-client';
import { usePageTitle } from '../../../lib/use-page-title';
import {
  Button,
  Input,
  Badge,
  Label,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Card,
  CardContent,
  Skeleton,
  Checkbox,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@audit-log-and-activity-tracking-saas/ui';
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Webhook as WebhookIcon,
  AlertCircle,
  Check,
  Loader2,
  Info,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Available webhook events based on backend audit event structure
const AVAILABLE_EVENTS = [
  { id: 'audit_log.created', label: 'Audit Log Created', description: 'When a new audit log entry is created' },
  { id: 'audit_log.updated', label: 'Audit Log Updated', description: 'When an audit log entry is updated' },
  { id: 'api_key.created', label: 'API Key Created', description: 'When a new API key is created' },
  { id: 'api_key.revoked', label: 'API Key Revoked', description: 'When an API key is revoked' },
  { id: 'user.login', label: 'User Login', description: 'When a user logs in' },
  { id: 'user.logout', label: 'User Logout', description: 'When a user logs out' },
  { id: 'webhook.created', label: 'Webhook Created', description: 'When a new webhook is created' },
  { id: 'webhook.deleted', label: 'Webhook Deleted', description: 'When a webhook is deleted' },
];

type FormData = {
  name: string;
  url: string;
  events: string[];
  active: boolean;
};

export default function WebhooksPage() {
  usePageTitle('Webhooks');
  const pathname = usePathname();
  const isDeliveriesTab = pathname?.includes('/deliveries') || false;

  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sheet (drawer) state
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [webhookToDelete, setWebhookToDelete] = useState<Webhook | null>(null);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: '',
    url: '',
    events: [],
    active: true,
  });

  const [errors, setErrors] = useState({
    name: '',
    url: '',
    events: '',
  });

  const [touched, setTouched] = useState({
    name: false,
    url: false,
    events: false,
  });

  // Load webhooks on mount
  useEffect(() => {
    async function loadWebhooks() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getWebhooks();
        setWebhooks(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load webhooks';
        setError(message);
        console.error('Failed to load webhooks:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadWebhooks();
  }, []);

  const validateUrl = (url: string) => {
    if (!url) return 'Endpoint URL is required';
    try {
      const urlObj = new URL(url);
      if (urlObj.protocol !== 'https:') {
        return 'URL must use HTTPS protocol';
      }
      return '';
    } catch {
      return 'Please enter a valid URL';
    }
  };

  const validateEvents = (events: string[]) => {
    if (events.length === 0) return 'Select at least one event';
    return '';
  };

  const handleBlur = (field: keyof typeof touched) => {
    setTouched({ ...touched, [field]: true });

    let error = '';
    if (field === 'url') {
      error = validateUrl(formData.url);
    } else if (field === 'events') {
      error = validateEvents(formData.events);
    }

    setErrors({ ...errors, [field]: error });
  };

  const handleUrlChange = (value: string) => {
    setFormData({ ...formData, url: value });
    if (touched.url) {
      setErrors({ ...errors, url: validateUrl(value) });
    }
  };

  const toggleEvent = (eventId: string) => {
    const newEvents = formData.events.includes(eventId)
      ? formData.events.filter((e) => e !== eventId)
      : [...formData.events, eventId];

    setFormData({ ...formData, events: newEvents });

    if (touched.events) {
      setErrors({ ...errors, events: validateEvents(newEvents) });
    }
  };

  const isFormValid = () => {
    return (
      formData.url &&
      formData.events.length > 0 &&
      validateUrl(formData.url) === '' &&
      validateEvents(formData.events) === ''
    );
  };

  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      events: [],
      active: true,
    });
    setErrors({
      name: '',
      url: '',
      events: '',
    });
    setTouched({
      name: false,
      url: false,
      events: false,
    });
    setEditingWebhook(null);
  };

  const handleCreateClick = () => {
    resetForm();
    setIsSheetOpen(true);
  };

  const handleEditClick = (webhook: Webhook) => {
    setEditingWebhook(webhook);
    setFormData({
      name: webhook.name,
      url: webhook.url,
      events: webhook.eventTypes,
      active: webhook.active,
    });
    setIsSheetOpen(true);
  };

  const handleSubmit = async () => {
    // Mark all as touched
    setTouched({
      name: true,
      url: true,
      events: true,
    });

    const urlError = validateUrl(formData.url);
    const eventsError = validateEvents(formData.events);

    setErrors({
      name: '',
      url: urlError,
      events: eventsError,
    });

    if (urlError || eventsError) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (editingWebhook) {
        // Update existing webhook
        const updateRequest: UpdateWebhookRequest = {
          name: formData.name || undefined,
          url: formData.url,
          eventTypes: formData.events,
          active: formData.active,
        };
        const updated = await updateWebhook(editingWebhook.id, updateRequest);
        setWebhooks(webhooks.map((wh) => (wh.id === editingWebhook.id ? updated : wh)));
      } else {
        // Create new webhook
        const createRequest: CreateWebhookRequest = {
          name: formData.name || 'Untitled Webhook',
          url: formData.url,
          eventTypes: formData.events,
        };
        const newWebhook = await createWebhook(createRequest);
        setWebhooks([newWebhook, ...webhooks]);
      }

      setIsSheetOpen(false);
      resetForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save webhook';
      setError(message);
      console.error('Failed to save webhook:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (webhook: Webhook) => {
    const newActive = !webhook.active;

    // Optimistic update
    setWebhooks(
      webhooks.map((wh) => (wh.id === webhook.id ? { ...wh, active: newActive } : wh))
    );

    try {
      const updateRequest: UpdateWebhookRequest = {
        active: newActive,
      };
      const updated = await updateWebhook(webhook.id, updateRequest);
      setWebhooks(webhooks.map((wh) => (wh.id === webhook.id ? updated : wh)));
    } catch (err) {
      // Revert on error
      setWebhooks(
        webhooks.map((wh) => (wh.id === webhook.id ? { ...wh, active: webhook.active } : wh))
      );
      const message = err instanceof Error ? err.message : 'Failed to update webhook';
      setError(message);
      console.error('Failed to toggle webhook status:', err);
    }
  };

  const handleDeleteClick = (webhook: Webhook) => {
    setWebhookToDelete(webhook);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!webhookToDelete) return;

    setIsDeleting(true);
    setError(null);

    try {
      await deleteWebhook(webhookToDelete.id);
      setWebhooks(webhooks.filter((wh) => wh.id !== webhookToDelete.id));
      setDeleteDialogOpen(false);
      setWebhookToDelete(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete webhook';
      setError(message);
      console.error('Failed to delete webhook:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatEventsSummary = (events: string[]) => {
    if (events.length === 0) return 'No events';
    if (events.length === 1) {
      const event = AVAILABLE_EVENTS.find((e) => e.id === events[0]);
      return event ? event.label : events[0];
    }
    return `${events.length} events selected`;
  };

  const getLastDeliveryTime = () => {
    // TODO: Calculate from deliveries when deliveries endpoint is available
    return 'Just now';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-9 w-40" />
        </div>
        <Card variant="bordered" className="overflow-hidden border-border">
          <div className="p-6 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-fg">Webhooks</h2>
          <p className="text-sm text-fg-muted mt-1">
            Send real-time events to your endpoints
          </p>
        </div>
        <Button size="sm" className="gap-2" onClick={handleCreateClick}>
          <Plus className="h-4 w-4" />
          Create Webhook
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <Link
          href="/webhooks"
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            !isDeliveriesTab
              ? 'text-accent border-b-2 border-accent'
              : 'text-fg-muted hover:text-fg'
          }`}
        >
          Configuration
        </Link>
        <Link
          href="/webhooks/deliveries"
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            isDeliveriesTab
              ? 'text-accent border-b-2 border-accent'
              : 'text-fg-muted hover:text-fg'
          }`}
        >
          Deliveries
        </Link>
      </div>

      {/* Error message */}
      {error && (
        <Card variant="bordered" className="p-4 border-danger/20 bg-danger/5">
          <div className="flex items-center gap-2 text-danger">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">{error}</p>
          </div>
        </Card>
      )}

      {/* Info Banner */}
      <Card variant="bordered" className="p-4 bg-accent/5 border-accent/20">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Webhook delivery</p>
            <p className="text-sm text-fg-muted">
              Webhooks are delivered with a 30-second timeout and will retry up to 3 times with
              exponential backoff.
            </p>
          </div>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="bordered" className="p-4 border-border">
          <p className="text-sm text-fg-muted">Total Webhooks</p>
          <p className="text-2xl font-semibold mt-1">{webhooks.length}</p>
        </Card>
        <Card variant="bordered" className="p-4 border-border">
          <p className="text-sm text-fg-muted">Active</p>
          <p className="text-2xl font-semibold mt-1">
            {webhooks.filter((wh) => wh.active).length}
          </p>
        </Card>
        <Card variant="bordered" className="p-4 border-border">
          <p className="text-sm text-fg-muted">Last Delivery</p>
          <p className="text-sm font-medium mt-1">{getLastDeliveryTime()}</p>
        </Card>
      </div>

      {/* Empty state */}
      {webhooks.length === 0 && !error && (
        <Card variant="bordered" className="border-border">
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 mb-4">
              <WebhookIcon className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No webhooks yet</h3>
            <p className="text-sm text-fg-muted text-center max-w-md mb-6">
              Get started by creating your first webhook. Webhooks allow you to receive
              real-time notifications when events occur in your account.
            </p>
            <Button className="gap-2" onClick={handleCreateClick}>
              <Plus className="h-4 w-4" />
              Create Webhook
            </Button>
          </div>
        </Card>
      )}

      {/* Table */}
      {webhooks.length > 0 && (
        <Card variant="bordered" className="overflow-hidden border-border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Endpoint URL</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((webhook) => (
                  <TableRow key={webhook.id} className="border-border">
                    <TableCell className="font-medium">{webhook.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-bg-card px-2 py-1 rounded font-mono">
                        {webhook.url}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs border-border">
                        {formatEventsSummary(webhook.eventTypes)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={webhook.active}
                          onCheckedChange={() => handleToggleStatus(webhook)}
                        />
                        <Badge
                          variant="outline"
                          className={
                            webhook.active
                              ? 'border-accent/30 bg-accent/10 text-accent'
                              : 'border-fg-muted/30 bg-bg-card text-fg-muted'
                          }
                        >
                          {webhook.active ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-fg-muted">
                      {new Date(webhook.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditClick(webhook)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(webhook)}
                            className="text-danger focus:text-danger"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Create/Edit Drawer */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingWebhook ? 'Edit Webhook' : 'Create Webhook'}</SheetTitle>
            <SheetDescription>
              {editingWebhook
                ? 'Update your webhook configuration.'
                : 'Configure a new webhook to receive real-time events.'}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-fg-muted">(optional)</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Production Monitor"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* URL */}
            <div className="space-y-2">
              <Label htmlFor="url">
                Endpoint URL <span className="text-danger">*</span>
              </Label>
              <Input
                id="url"
                type="url"
                placeholder="https://api.example.com/webhooks"
                value={formData.url}
                onChange={(e) => handleUrlChange(e.target.value)}
                onBlur={() => handleBlur('url')}
                className={
                  touched.url && errors.url ? 'border-danger focus-visible:ring-danger/20' : ''
                }
              />
              {touched.url && errors.url ? (
                <div className="flex items-center gap-1.5 text-xs text-danger">
                  <AlertCircle className="h-3 w-3" />
                  {errors.url}
                </div>
              ) : (
                <p className="text-xs text-fg-muted">Must be a valid HTTPS URL</p>
              )}
            </div>

            {/* Events */}
            <div className="space-y-3">
              <div>
                <Label>
                  Events <span className="text-danger">*</span>
                </Label>
                <p className="text-xs text-fg-muted mt-1">
                  Select which events should trigger this webhook
                </p>
              </div>

              <div className="space-y-2 border border-border rounded-lg p-3 bg-bg-card max-h-[300px] overflow-y-auto">
                {AVAILABLE_EVENTS.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-2 rounded-md hover:bg-bg cursor-pointer"
                    onClick={() => toggleEvent(event.id)}
                  >
                    <Checkbox
                      checked={formData.events.includes(event.id)}
                      onCheckedChange={() => toggleEvent(event.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 space-y-0.5">
                      <p className="text-sm font-medium leading-none">{event.label}</p>
                      <p className="text-xs text-fg-muted">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {touched.events && errors.events && (
                <div className="flex items-center gap-1.5 text-xs text-danger">
                  <AlertCircle className="h-3 w-3" />
                  {errors.events}
                </div>
              )}

              {formData.events.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-fg-muted">
                  <Check className="h-3 w-3 text-accent" />
                  {formData.events.length} event{formData.events.length !== 1 ? 's' : ''}{' '}
                  selected
                </div>
              )}
            </div>

            {/* Status */}
            <div className="space-y-3">
              <Label>Status</Label>
              <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-bg-card">
                <div>
                  <p className="text-sm font-medium">
                    {formData.active ? 'Enabled' : 'Disabled'}
                  </p>
                  <p className="text-xs text-fg-muted">
                    {formData.active
                      ? 'Webhook will receive events'
                      : 'Webhook will not receive events'}
                  </p>
                </div>
                <Switch
                  checked={formData.active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, active: checked })
                  }
                />
              </div>
            </div>
          </div>

          <SheetFooter className="gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setIsSheetOpen(false);
                resetForm();
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!isFormValid() || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {editingWebhook ? 'Saving...' : 'Creating...'}
                </>
              ) : editingWebhook ? (
                'Save Changes'
              ) : (
                'Create Webhook'
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete webhook?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the webhook <strong>{webhookToDelete?.name}</strong> and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-danger text-white hover:opacity-90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

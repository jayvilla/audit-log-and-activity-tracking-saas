'use client';

import { useState, useEffect } from 'react';
import { usePageTitle } from '../../../../lib/use-page-title';
import {
  Button,
  Input,
  Badge,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Skeleton,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Select,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@audit-log-and-activity-tracking-saas/ui';
import {
  Search,
  Filter,
  ChevronDown,
  Calendar,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  ExternalLink,
  Copy,
  ChevronRight,
  RotateCw,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  getWebhookDeliveries,
  replayWebhookDelivery,
  getWebhooks,
  type WebhookDelivery,
  type GetWebhookDeliveriesParams,
  type Webhook,
} from '../../../../lib/api-client';

interface DeliveryMetrics {
  successRate: number;
  avgLatency: number;
  failed: number;
}

export default function WebhookDeliveriesPage() {
  usePageTitle('Webhooks - Deliveries');
  const pathname = usePathname();

  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<DeliveryMetrics | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('Last 7 days');
  const [selectedWebhook, setSelectedWebhook] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [eventType, setEventType] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [minLatency, setMinLatency] = useState('');
  const [maxLatency, setMaxLatency] = useState('');

  // Drawer state
  const [selectedDelivery, setSelectedDelivery] = useState<WebhookDelivery | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<{
    payload: boolean;
    response: boolean;
  }>({ payload: false, response: false });

  // Load webhooks for mapping
  useEffect(() => {
    async function loadWebhooks() {
      try {
        const data = await getWebhooks();
        setWebhooks(data);
      } catch (err) {
        console.error('Failed to load webhooks:', err);
      }
    }
    loadWebhooks();
  }, []);

  // Load deliveries
  useEffect(() => {
    async function loadDeliveries() {
      setIsLoading(true);
      setError(null);
      try {
        // Build date range
        const now = new Date();
        let startDate: string | undefined;
        if (dateRange === 'Last 7 days') {
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        } else if (dateRange === 'Last 30 days') {
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        } else if (dateRange === 'Last 90 days') {
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
        }

        const params: GetWebhookDeliveriesParams = {
          webhookId: selectedWebhook !== 'all' ? selectedWebhook : undefined,
          status: selectedStatus !== 'all' ? selectedStatus as any : undefined,
          startDate,
          eventType: eventType || undefined,
          endpoint: endpoint || undefined,
          minLatency: minLatency ? parseInt(minLatency) : undefined,
          maxLatency: maxLatency ? parseInt(maxLatency) : undefined,
          limit: 50,
        };

        const data = await getWebhookDeliveries(params);
        
        // Map webhook names
        const webhookMap = new Map(webhooks.map((w) => [w.id, w.name]));
        const deliveriesWithNames = data.deliveries.map((d) => ({
          ...d,
          webhookName: d.webhookName || webhookMap.get(d.webhookId) || 'Unknown',
        }));
        
        // Apply search filter
        let filteredDeliveries = deliveriesWithNames;
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filteredDeliveries = deliveriesWithNames.filter(
            (d) =>
              d.webhookName?.toLowerCase().includes(query) ||
              d.eventType.toLowerCase().includes(query) ||
              d.endpoint.toLowerCase().includes(query)
          );
        }
        
        setDeliveries(filteredDeliveries);

        // Calculate metrics
        const total = data.deliveries.length;
        const successful = data.deliveries.filter((d) => d.status === 'success').length;
        const failed = data.deliveries.filter((d) => d.status === 'failed').length;
        const latencies = data.deliveries
          .filter((d) => d.latency !== null)
          .map((d) => d.latency!);
        const avgLatency = latencies.length > 0
          ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
          : 0;

        setMetrics({
          successRate: total > 0 ? Math.round((successful / total) * 100 * 10) / 10 : 0,
          avgLatency,
          failed,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load deliveries';
        setError(message);
        console.error('Failed to load deliveries:', err);
        // Set empty state on error
        setDeliveries([]);
        setMetrics({
          successRate: 0,
          avgLatency: 0,
          failed: 0,
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadDeliveries();
  }, [searchQuery, dateRange, selectedWebhook, selectedStatus, eventType, endpoint, minLatency, maxLatency, webhooks]);

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const formatLatency = (latency: number | null) => {
    if (latency === null) return '—';
    return `${latency}ms`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Success
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case 'retrying':
        return (
          <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">
            <Clock className="h-3 w-3 mr-1" />
            Retrying
          </Badge>
        );
      default:
        return (
          <Badge className="bg-fg-muted/10 text-fg-muted border-fg-muted/20">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const handleDeliveryClick = (delivery: WebhookDelivery) => {
    setSelectedDelivery(delivery);
    setIsDrawerOpen(true);
  };

  const handleReplay = async (deliveryId: string) => {
    try {
      await replayWebhookDelivery(deliveryId);
      // Reload deliveries after replay
      const data = await getWebhookDeliveries({ limit: 50 });
      setDeliveries(data.deliveries);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to replay delivery';
      setError(message);
      console.error('Failed to replay delivery:', err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const toggleSection = (section: 'payload' | 'response') => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
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
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <Link
          href="/webhooks"
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            !pathname?.includes('/deliveries')
              ? 'text-accent border-b-2 border-accent'
              : 'text-fg-muted hover:text-fg'
          }`}
        >
          Configuration
        </Link>
        <Link
          href="/webhooks/deliveries"
          className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1 ${
            pathname?.includes('/deliveries')
              ? 'text-accent border-b-2 border-accent'
              : 'text-fg-muted hover:text-fg'
          }`}
        >
          <Zap className="h-4 w-4" />
          Deliveries
        </Link>
      </div>

      {/* Section Header */}
      <div>
        <h3 className="text-lg font-semibold text-fg">Webhook Deliveries</h3>
        <p className="text-sm text-fg-muted mt-1">
          Monitor webhook delivery attempts and debug failed requests.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-fg-muted" />
            <Input
              placeholder="Search by webhook, event, or endpoint..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-fg-muted pointer-events-none" />
            <Select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="pl-10"
            >
              <option value="Last 7 days">Last 7 days</option>
              <option value="Last 30 days">Last 30 days</option>
              <option value="Last 90 days">Last 90 days</option>
              <option value="All time">All time</option>
            </Select>
          </div>
          <Select
            value={selectedWebhook}
            onChange={(e) => setSelectedWebhook(e.target.value)}
          >
            <option value="all">All Webhooks</option>
            {webhooks.map((webhook) => (
              <option key={webhook.id} value={webhook.id}>
                {webhook.name}
              </option>
            ))}
          </Select>
          <Select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
            <option value="retrying">Retrying</option>
          </Select>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Export
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Export as JSON</DropdownMenuItem>
              <DropdownMenuItem>Export as CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border border-border rounded-lg bg-bg-card">
            <div className="space-y-2">
              <label className="text-sm font-medium">Event Type</label>
              <Input
                placeholder="e.g., user.created"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Endpoint</label>
              <Input
                placeholder="e.g., api.acme.com"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Min Latency (ms)</label>
              <Input
                placeholder="e.g., 100"
                value={minLatency}
                onChange={(e) => setMinLatency(e.target.value)}
                type="number"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Latency (ms)</label>
              <Input
                placeholder="e.g., 1000"
                value={maxLatency}
                onChange={(e) => setMaxLatency(e.target.value)}
                type="number"
              />
            </div>
          </div>
        )}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="bordered" className="p-4 border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-fg-muted">Success Rate</p>
              <p className="text-2xl font-semibold mt-1">
                {metrics ? `${metrics.successRate}%` : '—'}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-green-500" />
            </div>
          </div>
        </Card>
        <Card variant="bordered" className="p-4 border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-fg-muted">Avg Latency</p>
              <p className="text-2xl font-semibold mt-1">
                {metrics ? `${metrics.avgLatency}ms` : '—'}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-accent" />
            </div>
          </div>
        </Card>
        <Card variant="bordered" className="p-4 border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-fg-muted">Failed</p>
              <p className="text-2xl font-semibold mt-1">
                {metrics ? metrics.failed : '—'}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Deliveries Table */}
      <Card variant="bordered" className="overflow-hidden border-border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Webhook</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-fg-muted">
                    No deliveries found
                  </TableCell>
                </TableRow>
              ) : (
                deliveries.map((delivery) => (
                  <TableRow
                    key={delivery.id}
                    className="border-border cursor-pointer hover:bg-bg-card"
                    onClick={() => handleDeliveryClick(delivery)}
                  >
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-fg-muted" />
                    </TableCell>
                    <TableCell className="text-sm text-fg-muted">
                      {formatTimestamp(delivery.attemptedAt)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {delivery.webhookName || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {delivery.eventType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-bg-card px-2 py-1 rounded font-mono">
                        {delivery.endpoint}
                      </code>
                    </TableCell>
                    <TableCell>{getStatusBadge(delivery.status)}</TableCell>
                    <TableCell className="text-sm text-fg-muted">
                      {formatLatency(delivery.latency)}
                    </TableCell>
                    <TableCell className="text-sm text-fg-muted">
                      {delivery.attempts}x
                    </TableCell>
                    <TableCell>
                      {delivery.status === 'failed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReplay(delivery.id);
                          }}
                        >
                          <RotateCw className="h-3 w-3" />
                          Replay
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Delivery Details Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedDelivery && (
            <>
              <SheetHeader>
                <SheetTitle>Webhook Delivery Details</SheetTitle>
                <SheetDescription>
                  Complete information for this delivery attempt
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 py-6">
                {/* Delivery Summary */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {selectedDelivery.eventType}
                    </Badge>
                    <span className="text-sm text-fg-muted">
                      {formatTimestamp(selectedDelivery.attemptedAt)}
                    </span>
                    <div className="ml-auto">
                      {getStatusBadge(selectedDelivery.status)}
                    </div>
                  </div>
                </div>

                {/* Webhook & Endpoint */}
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-4 w-4 text-accent" />
                      <span className="font-medium">{selectedDelivery.webhookName || 'Unknown Webhook'}</span>
                    </div>
                    <p className="text-xs text-fg-muted">hook_xyz789</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Endpoint URL</label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={selectedDelivery.endpoint}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button variant="ghost" size="icon" className="h-9 w-9">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-fg-muted mb-1">Status Code</p>
                    <p className={`text-sm font-medium ${selectedDelivery.statusCode === 200 ? 'text-green-500' : 'text-red-500'}`}>
                      {selectedDelivery.statusCode || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-fg-muted mb-1">Latency</p>
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-medium">{formatLatency(selectedDelivery.latency)}</p>
                      <Zap className="h-3 w-3 text-green-500" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-fg-muted mb-1">Attempts</p>
                    <p className="text-sm font-medium">{selectedDelivery.attempts}x</p>
                  </div>
                </div>

                {/* Request Payload */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Request Payload</label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(selectedDelivery.payload)}
                        className="h-7 gap-1"
                      >
                        <Copy className="h-3 w-3" />
                        Copy
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSection('payload')}
                        className="h-7"
                      >
                        {expandedSections.payload ? 'Collapse' : 'Expand'}
                      </Button>
                    </div>
                  </div>
                  <div className={`border border-border rounded-lg bg-bg-card p-3 font-mono text-xs overflow-auto ${expandedSections.payload ? '' : 'max-h-32'}`}>
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(JSON.parse(selectedDelivery.payload), null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Response Body */}
                {selectedDelivery.response && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Response Body</label>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(selectedDelivery.response || '')}
                          className="h-7 gap-1"
                        >
                          <Copy className="h-3 w-3" />
                          Copy
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSection('response')}
                          className="h-7"
                        >
                          {expandedSections.response ? 'Collapse' : 'Expand'}
                        </Button>
                      </div>
                    </div>
                    <div className={`border border-border rounded-lg bg-bg-card p-3 font-mono text-xs overflow-auto ${expandedSections.response ? '' : 'max-h-32'}`}>
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(JSON.parse(selectedDelivery.response), null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Delivery ID */}
                <div className="pt-4 border-t border-border">
                  <Badge variant="outline" className="text-xs">
                    Delivery ID: {selectedDelivery.id}
                  </Badge>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}


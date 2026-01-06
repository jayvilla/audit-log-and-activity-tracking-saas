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
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
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
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Info,
  Server,
  Activity,
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
  const [copiedRequest, setCopiedRequest] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);

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
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayName = days[date.getDay()];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    const hourStr = hour12.toString().padStart(2, '0');
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tzAbbr = date.toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ').pop() || '';
    return `${dayName}, ${month} ${day}, ${year}, ${hourStr}:${minutes}:${seconds} ${ampm} ${tzAbbr}`;
  };

  const formatWebhookId = (webhookId: string) => {
    // Extract short ID from UUID (first 8 chars after 'hook_')
    return `hook_${webhookId.substring(0, 8)}`;
  };

  const formatDeliveryId = (deliveryId: string) => {
    // Extract short ID from UUID (first 8 chars after 'del_')
    return `del_${deliveryId.substring(0, 8)}`;
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

  const handleCopyRequest = () => {
    if (selectedDelivery) {
      navigator.clipboard.writeText(selectedDelivery.payload);
      setCopiedRequest(true);
      setTimeout(() => setCopiedRequest(false), 2000);
    }
  };

  const handleCopyResponse = () => {
    if (selectedDelivery) {
      const content = selectedDelivery.response || selectedDelivery.error || '';
      navigator.clipboard.writeText(content);
      setCopiedResponse(true);
      setTimeout(() => setCopiedResponse(false), 2000);
    }
  };

  const toggleSection = (section: 'payload' | 'response') => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const getLatencyColor = (latency: number | null) => {
    if (latency === null) return 'text-fg-muted';
    if (latency < 200) return 'text-green-500';
    if (latency < 1000) return 'text-orange-500';
    return 'text-red-500';
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
      <TooltipProvider>
        <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <SheetContent side="right" className="w-full sm:max-w-2xl bg-bg border-l border-border overflow-y-auto">
            {selectedDelivery && (
              <>
                <SheetHeader className="pb-6">
                  <SheetTitle className="text-base font-semibold text-fg">Webhook Delivery Details</SheetTitle>
                  <SheetDescription className="text-sm text-fg-muted">
                    Complete information for this delivery attempt
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-6 py-6">
                  {/* Delivery Summary */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-sm font-semibold text-fg">Delivery Summary</h3>
                    </div>
                    
                    <Card variant="bordered" className="p-4 border-border space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <code className="text-base bg-accent px-3 py-1.5 rounded font-mono text-fg">
                            {selectedDelivery.eventType}
                          </code>
                          <p className="text-sm text-fg-muted mt-2">
                            {formatTimestamp(selectedDelivery.attemptedAt)}
                          </p>
                        </div>
                        {getStatusBadge(selectedDelivery.status)}
                      </div>

                      {selectedDelivery.status === 'retrying' && selectedDelivery.nextRetryAt && (
                        <div className="pt-3 border-t border-border">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-orange-500" />
                            <span className="text-fg-muted">Next retry scheduled for:</span>
                            <span className="font-mono text-orange-500">
                              {new Date(selectedDelivery.nextRetryAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                    </Card>
                  </div>

                  <Separator />

                  {/* Webhook & Endpoint Info */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-sm font-semibold text-fg">Webhook & Endpoint</h3>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-5 w-5">
                            <Info className="h-3 w-3 text-fg-muted" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <p className="text-xs">
                            The webhook configuration that triggered this delivery and the target endpoint URL.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    <Card variant="bordered" className="p-4 border-border space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                          <Zap className="h-5 w-5 text-accent-fg" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-fg">{selectedDelivery.webhookName || 'Unknown Webhook'}</p>
                          <p className="text-xs text-fg-muted font-mono mt-0.5">
                            {formatWebhookId(selectedDelivery.webhookId)}
                          </p>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <p className="text-xs text-fg-muted mb-1.5">Endpoint URL</p>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-accent px-2 py-1.5 rounded font-mono flex-1 break-all text-fg">
                            {selectedDelivery.endpoint}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={() => window.open(selectedDelivery.endpoint, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </div>

                  <Separator />

                  {/* Delivery Metrics */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-sm font-semibold text-fg">Performance Metrics</h3>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-5 w-5">
                            <Info className="h-3 w-3 text-fg-muted" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <p className="text-xs">
                            Performance data for this delivery attempt. Latency measures the time from request sent to response received.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    <Card variant="bordered" className="p-4 border-border">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-fg-muted mb-1">Status Code</p>
                          <div className="flex items-center gap-2">
                            {selectedDelivery.statusCode !== null ? (
                              <code className={`text-sm font-mono font-semibold ${
                                selectedDelivery.statusCode >= 200 && selectedDelivery.statusCode < 300
                                  ? 'text-green-500'
                                  : 'text-red-500'
                              }`}>
                                {selectedDelivery.statusCode}
                              </code>
                            ) : (
                              <span className="text-sm text-fg-muted">N/A</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-fg-muted mb-1">Latency</p>
                          <div className="flex items-center gap-2">
                            {selectedDelivery.latency !== null ? (
                              <>
                                <Activity className={`h-4 w-4 ${getLatencyColor(selectedDelivery.latency)}`} />
                                <span className={`text-sm font-mono font-semibold ${getLatencyColor(selectedDelivery.latency)}`}>
                                  {formatLatency(selectedDelivery.latency)}
                                </span>
                              </>
                            ) : (
                              <span className="text-sm text-fg-muted">N/A</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-fg-muted mb-1">Attempts</p>
                          <Badge variant="outline" className="font-mono">
                            {selectedDelivery.attempts}x
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  </div>

                  <Separator />

                  {/* Request Payload */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-fg">Request Payload</h3>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5">
                              <Info className="h-3 w-3 text-fg-muted" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <p className="text-xs">
                              The exact JSON payload that was sent to your webhook endpoint. This is read-only and cannot be modified.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyRequest}
                          className="gap-2 h-7"
                        >
                          {copiedRequest ? (
                            <>
                              <CheckCircle className="h-3 w-3" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              Copy
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSection('payload')}
                          className="gap-2 h-7"
                        >
                          {expandedSections.payload ? (
                            <>
                              <ChevronDown className="h-3 w-3" />
                              Collapse
                            </>
                          ) : (
                            <>
                              <ChevronRight className="h-3 w-3" />
                              Expand
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {expandedSections.payload && (
                      <Card variant="bordered" className="p-4 border-border bg-accent/30">
                        <div className="flex items-center gap-2 mb-2">
                          <Server className="h-4 w-4 text-fg-muted" />
                          <span className="text-xs font-medium text-fg-muted">POST Request Body</span>
                        </div>
                        <pre className="text-xs font-mono overflow-x-auto text-fg">
                          <code>{(() => {
                            try {
                              return JSON.stringify(JSON.parse(selectedDelivery.payload), null, 2);
                            } catch {
                              return selectedDelivery.payload;
                            }
                          })()}</code>
                        </pre>
                      </Card>
                    )}
                  </div>

                  <Separator />

                  {/* Response / Error */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-fg">
                          {selectedDelivery.status === 'success' ? 'Response Body' : 'Error Details'}
                        </h3>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5">
                              <Info className="h-3 w-3 text-fg-muted" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <p className="text-xs">
                              {selectedDelivery.status === 'success' 
                                ? 'The response body returned by your webhook endpoint.'
                                : 'Error information captured during the failed delivery attempt. Use this to debug and fix your endpoint.'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex items-center gap-2">
                        {(selectedDelivery.response || selectedDelivery.error) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCopyResponse}
                            className="gap-2 h-7"
                          >
                            {copiedResponse ? (
                              <>
                                <CheckCircle className="h-3 w-3" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                Copy
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSection('response')}
                          className="gap-2 h-7"
                        >
                          {expandedSections.response ? (
                            <>
                              <ChevronDown className="h-3 w-3" />
                              Collapse
                            </>
                          ) : (
                            <>
                              <ChevronRight className="h-3 w-3" />
                              Expand
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {expandedSections.response && (
                      <Card variant="bordered" className={`p-4 border-border ${
                        selectedDelivery.status === 'success' ? 'bg-accent/30' : 'bg-red-500/5 border-red-500/20'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          {selectedDelivery.status === 'success' ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <span className="text-xs font-medium text-green-500">Response ({selectedDelivery.statusCode})</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-4 w-4 text-red-500" />
                              <span className="text-xs font-medium text-red-500">Error ({selectedDelivery.statusCode || 'N/A'})</span>
                            </>
                          )}
                        </div>
                        <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words text-fg">
                          <code>{selectedDelivery.response || selectedDelivery.error || 'No response body'}</code>
                        </pre>
                      </Card>
                    )}
                  </div>

                  {/* Observability Notice */}
                  {selectedDelivery.status === 'failed' && (
                    <>
                      <Separator />
                      <Card variant="bordered" className="p-4 bg-blue-500/5 border-blue-500/20">
                        <div className="flex gap-3">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 shrink-0">
                                <Activity className="h-5 w-5 text-blue-500" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              <p className="text-xs">
                                Failed deliveries are automatically retried with exponential backoff. You can also manually replay this delivery from the main table.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-blue-500">Debugging Tip</p>
                            <p className="text-xs text-fg-muted">
                              Review the error details above to identify the issue. Common causes: endpoint timeout, incorrect URL, authentication failure, or server errors. Fix your endpoint and use the Replay button to retry.
                            </p>
                          </div>
                        </div>
                      </Card>
                    </>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-4 border-t border-border flex items-center justify-between">
                    <p className="text-xs text-fg-muted">
                      Delivery ID: <code className="bg-accent px-1.5 py-0.5 rounded font-mono text-fg">{formatDeliveryId(selectedDelivery.id)}</code>
                    </p>
                    {selectedDelivery.status === 'failed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleReplay(selectedDelivery.id)}
                      >
                        <RotateCw className="h-4 w-4" />
                        Replay Delivery
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </TooltipProvider>
    </div>
  );
}


'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getAuditEvents, exportAuditEventsAsJson, exportAuditEventsAsCsv, type AuditEvent, type GetAuditEventsParams } from '../../../lib/api-client';
import { usePageTitle } from '../../../lib/use-page-title';
import {
  Button,
  Input,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Card,
  Label,
  Select,
  Skeleton,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Calendar,
} from '@audit-log-and-activity-tracking-saas/ui';
import {
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronRight,
  User,
  FileText,
  Database,
  X,
  CalendarIcon,
} from 'lucide-react';
import { format } from 'date-fns';

export default function AuditLogsPage() {
  usePageTitle('Audit Logs');
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL-driven state
  const searchQuery = searchParams.get('search') || '';
  const dateRange = searchParams.get('dateRange') || 'Last 7 days';
  const actions = searchParams.get('actions')?.split(',').filter(Boolean) || [];
  const statuses = searchParams.get('statuses')?.split(',').filter(Boolean) || [];
  const actorFilter = searchParams.get('actor') || '';
  const resourceTypeFilter = searchParams.get('resourceType') || '';
  const resourceIdFilter = searchParams.get('resourceId') || '';
  const ipFilter = searchParams.get('ip') || '';
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');

  // Local state
  const [logs, setLogs] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showSecondaryFilters, setShowSecondaryFilters] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(
    startDateParam ? new Date(startDateParam) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    endDateParam ? new Date(endDateParam) : undefined
  );

  // Update URL params
  const updateSearchParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.push(`/audit-logs?${params.toString()}`);
  };

  // Load data
  useEffect(() => {
    async function loadLogs() {
      setIsLoading(true);
      setError(null);
      try {
        const params: GetAuditEventsParams = {
          limit: 50,
          metadataText: searchQuery || undefined,
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
          action: actions.length > 0 ? actions : undefined,
          resourceType: resourceTypeFilter || undefined,
          resourceId: resourceIdFilter || undefined,
          status: statuses.length > 0 ? statuses : undefined,
          actorId: actorFilter || undefined,
          ipAddress: ipFilter || undefined,
        };

        const response = await getAuditEvents(params);
        if (response) {
          setLogs(response.data || []);
        }
      } catch (err: any) {
        console.error('Failed to load audit logs:', err);
        setError(err.message || 'Failed to load audit logs');
      } finally {
        setIsLoading(false);
      }
    }

    loadLogs();
  }, [searchQuery, dateRange, startDate, endDate, actions.join(','), statuses.join(','), actorFilter, resourceTypeFilter, resourceIdFilter, ipFilter]);

  // Extract unique values for filters
  const uniqueActions = useMemo(() => {
    return Array.from(new Set(logs.map(log => log.action))).sort();
  }, [logs]);

  const uniqueResources = useMemo(() => {
    return Array.from(new Set(logs.map(log => log.resourceType))).sort();
  }, [logs]);

  // Filter handlers
  const handleSearchChange = (value: string) => {
    updateSearchParams({ search: value });
  };

  const handleDatePreset = (preset: string) => {
    updateSearchParams({ dateRange: preset });
    const now = new Date();
    let start = new Date();
    
    switch (preset) {
      case 'Last 24 hours':
        start.setDate(now.getDate() - 1);
        break;
      case 'Last 7 days':
        start.setDate(now.getDate() - 7);
        break;
      case 'Last 30 days':
        start.setDate(now.getDate() - 30);
        break;
      case 'Last 90 days':
        start.setDate(now.getDate() - 90);
        break;
      case 'Custom range':
        setStartDate(undefined);
        setEndDate(undefined);
        updateSearchParams({ startDate: null, endDate: null });
        return;
    }
    
    setStartDate(start);
    setEndDate(now);
    updateSearchParams({
      startDate: start.toISOString(),
      endDate: now.toISOString(),
    });
  };

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date);
    if (date) {
      updateSearchParams({ startDate: date.toISOString() });
    } else {
      updateSearchParams({ startDate: null });
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date);
    if (date) {
      updateSearchParams({ endDate: date.toISOString() });
    } else {
      updateSearchParams({ endDate: null });
    }
  };

  const toggleAction = (action: string) => {
    const newActions = actions.includes(action)
      ? actions.filter(a => a !== action)
      : [...actions, action];
    updateSearchParams({ actions: newActions.length > 0 ? newActions.join(',') : null });
  };

  const toggleStatus = (status: string) => {
    const newStatuses = statuses.includes(status)
      ? statuses.filter(s => s !== status)
      : [...statuses, status];
    updateSearchParams({ statuses: newStatuses.length > 0 ? newStatuses.join(',') : null });
  };

  const handleActorChange = (value: string) => {
    updateSearchParams({ actor: value });
  };

  const handleResourceTypeChange = (value: string) => {
    updateSearchParams({ resourceType: value === 'all' ? null : value });
  };

  const handleResourceIdChange = (value: string) => {
    updateSearchParams({ resourceId: value });
  };

  const handleIpChange = (value: string) => {
    updateSearchParams({ ip: value });
  };

  const clearAllFilters = () => {
    router.push('/audit-logs');
  };

  const removeFilter = (type: string, value?: string) => {
    switch (type) {
      case 'search':
        updateSearchParams({ search: null });
        break;
      case 'dateRange':
        updateSearchParams({ dateRange: null, startDate: null, endDate: null });
        setStartDate(undefined);
        setEndDate(undefined);
        break;
      case 'action':
        if (value) {
          const newActions = actions.filter(a => a !== value);
          updateSearchParams({ actions: newActions.length > 0 ? newActions.join(',') : null });
        }
        break;
      case 'status':
        if (value) {
          const newStatuses = statuses.filter(s => s !== value);
          updateSearchParams({ statuses: newStatuses.length > 0 ? newStatuses.join(',') : null });
        }
        break;
      case 'actor':
        updateSearchParams({ actor: null });
        break;
      case 'resourceType':
        updateSearchParams({ resourceType: null });
        break;
      case 'resourceId':
        updateSearchParams({ resourceId: null });
        break;
      case 'ip':
        updateSearchParams({ ip: null });
        break;
    }
  };

  const hasActiveFilters =
    searchQuery ||
    actions.length > 0 ||
    statuses.length > 0 ||
    actorFilter ||
    resourceTypeFilter ||
    resourceIdFilter ||
    ipFilter ||
    startDate ||
    endDate ||
    dateRange !== 'Last 7 days';

  // Export handlers
  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const params: GetAuditEventsParams = {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        action: actions.length > 0 ? actions : undefined,
        resourceType: resourceTypeFilter || undefined,
        resourceId: resourceIdFilter || undefined,
        status: statuses.length > 0 ? statuses : undefined,
        actorId: actorFilter || undefined,
        ipAddress: ipFilter || undefined,
        metadataText: searchQuery || undefined,
      };

      if (format === 'json') {
        const data = await exportAuditEventsAsJson(params);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString()}.json`;
        a.click();
      } else {
        const blob = await exportAuditEventsAsCsv(params);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString()}.csv`;
        a.click();
      }
    } catch (err: any) {
      console.error('Export failed:', err);
      setError(err.message || 'Failed to export audit logs');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getActorName = (log: AuditEvent) => {
    return log.actorId || 'Unknown';
  };

  const getActorEmail = (log: AuditEvent) => {
    // In a real app, you'd fetch actor details
    return '';
  };

  const getStatus = (log: AuditEvent): 'success' | 'failure' => {
    // Backend doesn't have status field - check metadata
    return log.metadata?.status === 'failure' ? 'failure' : 'success';
  };

  if (error && !isLoading) {
    return (
      <div className="space-y-6">
        <Card variant="bordered" className="p-8 border-border">
          <div className="text-center">
            <p className="text-sm text-fg-muted mb-4">{error}</p>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Retry
            </Button>
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
          <h2 className="text-2xl font-semibold text-fg">Audit Logs</h2>
          <p className="text-sm text-fg-muted mt-1">
            Immutable record of all system activity
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="secondary" className="gap-2">
              <Download className="h-4 w-4" />
              Export
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleExport('json')}>
              Export as JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('csv')}>
              Export as CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Primary Filters */}
      <Card variant="bordered" className="p-4 border-border">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
            <Input
              placeholder="Search by actor, action, or resource..."
              className="pl-9 bg-bg-card border-border"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          {/* Date Range Preset */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" className="gap-2 lg:w-[180px]">
                <CalendarIcon className="h-4 w-4" />
                {dateRange}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleDatePreset('Last 24 hours')}>
                Last 24 hours
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDatePreset('Last 7 days')}>
                Last 7 days
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDatePreset('Last 30 days')}>
                Last 30 days
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDatePreset('Last 90 days')}>
                Last 90 days
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleDatePreset('Custom range')}>
                Custom range
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Action Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" className="gap-2 lg:w-[160px]">
                Action
                {actions.length > 0 && (
                  <Badge variant="default" className="ml-1 px-1 min-w-5 h-5 flex items-center justify-center text-xs">
                    {actions.length}
                  </Badge>
                )}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuLabel>Select Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {uniqueActions.map(action => (
                <DropdownMenuCheckboxItem
                  key={action}
                  checked={actions.includes(action)}
                  onCheckedChange={() => toggleAction(action)}
                >
                  <code className="text-xs">{action}</code>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" className="gap-2 lg:w-[140px]">
                Status
                {statuses.length > 0 && (
                  <Badge variant="default" className="ml-1 px-1 min-w-5 h-5 flex items-center justify-center text-xs">
                    {statuses.length}
                  </Badge>
                )}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[160px]">
              <DropdownMenuLabel>Select Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={statuses.includes('success')}
                onCheckedChange={() => toggleStatus('success')}
              >
                Success
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statuses.includes('failure')}
                onCheckedChange={() => toggleStatus('failure')}
              >
                Failure
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Show/Hide Filters Button */}
          <Button
            variant="secondary"
            size="sm"
            className="gap-2 lg:w-auto"
            onClick={() => setShowSecondaryFilters(!showSecondaryFilters)}
          >
            <Filter className="h-4 w-4" />
            {showSecondaryFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
        </div>

        {/* Custom Date Range */}
        {dateRange === 'Custom range' && (
          <div className="flex gap-3 items-end pt-2 border-t border-border mt-4">
            <div className="flex-1">
              <Label className="text-xs text-fg-muted mb-1.5 block">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="secondary" size="sm" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={handleStartDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex-1">
              <Label className="text-xs text-fg-muted mb-1.5 block">End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="secondary" size="sm" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={handleEndDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}

        {/* Secondary Filters (Collapsible) */}
        {showSecondaryFilters && (
          <div className="pt-4 border-t border-border space-y-3 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs text-fg-muted mb-1.5 block">Actor</Label>
                <Input
                  placeholder="Name, email, or ID"
                  className="bg-bg-card border-border"
                  value={actorFilter}
                  onChange={(e) => handleActorChange(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs text-fg-muted mb-1.5 block">Resource Type</Label>
                <Select
                  value={resourceTypeFilter || 'all'}
                  onChange={(e) => handleResourceTypeChange(e.target.value)}
                  className="bg-bg-card border-border"
                >
                  <option value="all">All types</option>
                  {uniqueResources.map(resource => (
                    <option key={resource} value={resource}>
                      {resource}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label className="text-xs text-fg-muted mb-1.5 block">Resource ID</Label>
                <Input
                  placeholder="e.g., doc_12345"
                  className="bg-bg-card border-border"
                  value={resourceIdFilter}
                  onChange={(e) => handleResourceIdChange(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs text-fg-muted mb-1.5 block">IP Address</Label>
                <Input
                  placeholder="e.g., 192.168.1.100"
                  className="bg-bg-card border-border"
                  value={ipFilter}
                  onChange={(e) => handleIpChange(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="pt-3 border-t border-border flex items-center justify-between mt-4">
            <div className="flex flex-wrap gap-2 items-center">
              <p className="text-xs text-fg-muted">
                Showing {logs.length} events
              </p>
              {searchQuery && (
                <Badge variant="default" className="gap-1 text-xs">
                  Search: {searchQuery}
                  <button
                    onClick={() => removeFilter('search')}
                    className="ml-1 hover:opacity-70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {dateRange !== 'Last 7 days' && (
                <Badge variant="default" className="gap-1 text-xs">
                  {dateRange}
                  <button
                    onClick={() => removeFilter('dateRange')}
                    className="ml-1 hover:opacity-70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {actions.map(action => (
                <Badge key={action} variant="default" className="gap-1 text-xs">
                  Action: {action}
                  <button
                    onClick={() => removeFilter('action', action)}
                    className="ml-1 hover:opacity-70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {statuses.map(status => (
                <Badge key={status} variant="default" className="gap-1 text-xs">
                  Status: {status}
                  <button
                    onClick={() => removeFilter('status', status)}
                    className="ml-1 hover:opacity-70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {actorFilter && (
                <Badge variant="default" className="gap-1 text-xs">
                  Actor: {actorFilter}
                  <button
                    onClick={() => removeFilter('actor')}
                    className="ml-1 hover:opacity-70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {resourceTypeFilter && (
                <Badge variant="default" className="gap-1 text-xs">
                  Resource: {resourceTypeFilter}
                  <button
                    onClick={() => removeFilter('resourceType')}
                    className="ml-1 hover:opacity-70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {resourceIdFilter && (
                <Badge variant="default" className="gap-1 text-xs">
                  Resource ID: {resourceIdFilter}
                  <button
                    onClick={() => removeFilter('resourceId')}
                    className="ml-1 hover:opacity-70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {ipFilter && (
                <Badge variant="default" className="gap-1 text-xs">
                  IP: {ipFilter}
                  <button
                    onClick={() => removeFilter('ip')}
                    className="ml-1 hover:opacity-70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="gap-2 h-7"
            >
              <X className="h-3 w-3" />
              Clear all filters
            </Button>
          </div>
        )}
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="bordered" className="p-4 border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-10">
              <FileText className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-fg-muted">Total Events</p>
              <p className="text-2xl font-semibold text-fg">
                {isLoading ? <Skeleton className="h-8 w-16" /> : logs.length.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
        <Card variant="bordered" className="p-4 border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-semantic-success/10">
              <User className="h-5 w-5 text-semantic-success" />
            </div>
            <div>
              <p className="text-sm text-fg-muted">Active Users</p>
              <p className="text-2xl font-semibold text-fg">
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  new Set(logs.map(log => log.actorId)).size
                )}
              </p>
            </div>
          </div>
        </Card>
        <Card variant="bordered" className="p-4 border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
              <Database className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-fg-muted">Failed Actions</p>
              <p className="text-2xl font-semibold text-fg">
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  logs.filter(log => getStatus(log) === 'failure').length
                )}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card variant="bordered" className="overflow-hidden border-border">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="h-32 flex items-center justify-center">
            <div className="flex flex-col items-center justify-center gap-2">
              <Search className="h-8 w-8 text-fg-muted/50" />
              <p className="text-sm text-fg-muted">No events found</p>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="mt-2"
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const isExpanded = expandedRow === log.id;
                const status = getStatus(log);
                return (
                  <>
                    <TableRow
                      key={log.id}
                      className="border-border hover:bg-accent-10 cursor-pointer"
                      onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                    >
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="text-sm text-fg-muted font-mono">
                        {formatTimestamp(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-fg">{getActorName(log)}</p>
                          {getActorEmail(log) && (
                            <p className="text-xs text-fg-muted">{getActorEmail(log)}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-accent-10 px-2 py-1 rounded text-accent">
                          {log.actorType}:{log.action}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm text-fg">{log.resourceType}</p>
                          <p className="text-xs text-fg-muted font-mono">{log.resourceId}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="default"
                          className={
                            status === 'success'
                              ? 'border-semantic-success/30 bg-semantic-success/10 text-semantic-success'
                              : 'border-red-500/30 bg-red-500/10 text-red-500'
                          }
                        >
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-fg-muted font-mono">
                        {log.ipAddress || 'N/A'}
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow className="border-border hover:bg-transparent">
                        <TableCell colSpan={7} className="bg-accent-10 p-4">
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-fg-muted uppercase tracking-wide">
                              Event Metadata
                            </p>
                            <pre className="text-xs bg-bg-card border border-border rounded-md p-3 overflow-x-auto text-fg">
                              <code>{JSON.stringify(log.metadata || {}, null, 2)}</code>
                            </pre>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

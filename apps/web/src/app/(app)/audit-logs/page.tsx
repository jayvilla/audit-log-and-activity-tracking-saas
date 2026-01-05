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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@audit-log-and-activity-tracking-saas/ui';
import {
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  User,
  FileText,
  Database,
  X,
  CalendarIcon,
  Copy,
  Info,
  Lock,
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
  const [selectedLog, setSelectedLog] = useState<AuditEvent | null>(null);
  const [showSecondaryFilters, setShowSecondaryFilters] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isRawDataExpanded, setIsRawDataExpanded] = useState(false);
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
    return format(new Date(timestamp), 'MM/dd/yyyy, h:mm:ss a');
  };

  const formatTimestampLong = (timestamp: string) => {
    return format(new Date(timestamp), 'EEE, MMM d, yyyy, hh:mm:ss a zzz');
  };

  const formatTimestampISO = (timestamp: string) => {
    return format(new Date(timestamp), "yyyy-MM-dd'T'HH:mm:ss'Z'");
  };

  const getActorName = (log: AuditEvent) => {
    // Try to get name from metadata or use actorId
    return log.metadata?.actorName || log.actorId || 'Unknown';
  };

  const getActorEmail = (log: AuditEvent) => {
    return log.metadata?.actorEmail || '';
  };

  const getStatus = (log: AuditEvent): 'success' | 'failure' => {
    return log.metadata?.status === 'failure' ? 'failure' : 'success';
  };

  const toggleRowExpansion = (logId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedRows(newExpanded);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Calculate stats
  const totalEvents = logs.length;
  const activeUsers = new Set(logs.map(log => log.actorId)).size;
  const failedActions = logs.filter(log => getStatus(log) === 'failure').length;

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
    <div className="flex flex-col gap-6 pt-8 px-[38.5px]">
      {/* Header - Exact Figma Layout */}
      <div className="flex items-start justify-between h-14">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold text-fg leading-8">Audit Logs</h2>
          <p className="text-sm text-fg-muted leading-5">
            Immutable record of all system activity
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="secondary" 
              size="sm" 
              className="h-8 gap-2 bg-bg border border-border rounded-lg px-2.5 text-sm text-fg hover:bg-bg-ui-30"
            >
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

      {/* Filter Bar - Exact Figma Layout */}
      <div className="border border-border rounded-[10px] p-[17px] h-[70px] flex flex-col">
        <div className="h-9 relative flex items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 h-9">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted pointer-events-none" />
            <Input
              placeholder="Search by actor, action, or resource..."
              className="pl-9 h-9 bg-bg border border-border rounded-lg text-sm text-fg-muted placeholder:text-fg-muted"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          {/* Date Range Preset */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="secondary" 
                size="sm" 
                className="h-8 w-[180px] gap-2 bg-bg border border-border rounded-lg px-2.5 text-sm text-fg hover:bg-bg-ui-30"
              >
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
              <Button 
                variant="secondary" 
                size="sm" 
                className="h-8 w-[160px] gap-2 bg-bg border border-border rounded-lg px-2.5 text-sm text-fg hover:bg-bg-ui-30"
              >
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
              <Button 
                variant="secondary" 
                size="sm" 
                className="h-8 w-[140px] gap-2 bg-bg border border-border rounded-lg px-2.5 text-sm text-fg hover:bg-bg-ui-30"
              >
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
            className="h-8 gap-2 bg-bg border border-border rounded-lg px-2.5 text-sm text-fg hover:bg-bg-ui-30"
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
                  className="bg-bg border border-border"
                  value={actorFilter}
                  onChange={(e) => handleActorChange(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs text-fg-muted mb-1.5 block">Resource Type</Label>
                <Select
                  value={resourceTypeFilter || 'all'}
                  onChange={(e) => handleResourceTypeChange(e.target.value)}
                  className="bg-bg border border-border"
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
                  className="bg-bg border border-border"
                  value={resourceIdFilter}
                  onChange={(e) => handleResourceIdChange(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs text-fg-muted mb-1.5 block">IP Address</Label>
                <Input
                  placeholder="e.g., 192.168.1.100"
                  className="bg-bg border border-border"
                  value={ipFilter}
                  onChange={(e) => handleIpChange(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards - Exact Figma Layout */}
      <div className="grid grid-cols-3 gap-4 h-[86px]">
        <Card variant="bordered" className="bg-[#18181b] border border-border rounded-xl p-[17px]">
          <div className="flex gap-3 items-center h-full">
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-accent-10 shrink-0">
              <FileText className="h-5 w-5 text-accent" />
            </div>
            <div className="flex flex-col">
              <p className="text-sm text-fg-muted leading-5">Total Events</p>
              <p className="text-2xl font-semibold text-fg leading-8">
                {isLoading ? <Skeleton className="h-8 w-16" /> : totalEvents.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
        <Card variant="bordered" className="bg-[#18181b] border border-border rounded-xl p-[17px]">
          <div className="flex gap-3 items-center h-full">
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[rgba(0,201,80,0.1)] shrink-0">
              <User className="h-5 w-5 text-semantic-success" />
            </div>
            <div className="flex flex-col">
              <p className="text-sm text-fg-muted leading-5">Active Users</p>
              <p className="text-2xl font-semibold text-fg leading-8">
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  activeUsers
                )}
              </p>
            </div>
          </div>
        </Card>
        <Card variant="bordered" className="bg-[#18181b] border border-border rounded-xl p-[17px]">
          <div className="flex gap-3 items-center h-full">
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[rgba(251,44,54,0.1)] shrink-0">
              <Database className="h-5 w-5 text-[#fb2c36]" />
            </div>
            <div className="flex flex-col">
              <p className="text-sm text-fg-muted leading-5">Failed Actions</p>
              <p className="text-2xl font-semibold text-fg leading-8">
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  failedActions
                )}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Table - Exact Figma Layout with Expandable Rows */}
      <Card variant="bordered" className="bg-[#18181b] border border-border rounded-xl overflow-hidden">
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
              <TableRow className="border-border hover:bg-transparent h-10">
                <TableHead className="w-10 p-0"></TableHead>
                <TableHead className="text-sm text-fg leading-5 px-2">Timestamp</TableHead>
                <TableHead className="text-sm text-fg leading-5 px-2">Actor</TableHead>
                <TableHead className="text-sm text-fg leading-5 px-2">Action</TableHead>
                <TableHead className="text-sm text-fg leading-5 px-2">Resource</TableHead>
                <TableHead className="text-sm text-fg leading-5 px-2">Status</TableHead>
                <TableHead className="text-sm text-fg leading-5 px-2">IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const status = getStatus(log);
                const isExpanded = expandedRows.has(log.id);
                const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;
                
                return (
                  <>
                    <TableRow
                      key={log.id}
                      className="border-border hover:bg-transparent h-[53px] cursor-pointer"
                      onClick={() => {
                        setSelectedLog(log);
                      }}
                    >
                      <TableCell className="p-0 w-10">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 rounded-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (hasMetadata) {
                              toggleRowExpansion(log.id);
                            }
                          }}
                        >
                          {hasMetadata ? (
                            isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="text-sm text-fg-muted font-mono leading-5 px-2">
                        {formatTimestamp(log.createdAt)}
                      </TableCell>
                      <TableCell className="px-2">
                        <div className="flex flex-col gap-0.5">
                          <p className="text-sm text-fg leading-5">{getActorName(log)}</p>
                          {getActorEmail(log) && (
                            <p className="text-xs text-fg-muted leading-4">{getActorEmail(log)}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-2">
                        <div className="bg-[#27272a] inline-flex items-center px-2 py-1 rounded">
                          <code className="text-xs text-fg leading-4 font-mono">{log.action}</code>
                        </div>
                      </TableCell>
                      <TableCell className="px-2">
                        <div className="flex flex-col gap-0.5">
                          <p className="text-sm text-fg leading-5">{log.resourceType}</p>
                          <p className="text-xs text-fg-muted font-mono leading-4">{log.resourceId}</p>
                        </div>
                      </TableCell>
                      <TableCell className="px-2">
                        <Badge
                          variant="default"
                          className={
                            status === 'success'
                              ? 'border-[rgba(0,201,80,0.3)] bg-[rgba(0,201,80,0.1)] text-semantic-success h-[22px] px-2.5 py-0.5 rounded-lg text-xs leading-4'
                              : 'border-[rgba(251,44,54,0.3)] bg-[rgba(251,44,54,0.1)] text-[#fb2c36] h-[22px] px-2.5 py-0.5 rounded-lg text-xs leading-4'
                          }
                        >
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-fg-muted font-mono leading-5 px-2">
                        {log.ipAddress || 'N/A'}
                      </TableCell>
                    </TableRow>
                    {/* Expanded Metadata Row */}
                    {isExpanded && hasMetadata && (
                      <TableRow className="border-border">
                        <TableCell colSpan={7} className="p-0 bg-[rgba(39,39,42,0.3)]">
                          <div className="flex flex-col gap-2 p-4">
                            <p className="text-xs text-fg-muted uppercase tracking-[0.3px]">
                              Event Metadata
                            </p>
                            <div className="bg-bg border border-border rounded-lg p-3.5 overflow-x-auto">
                              <pre className="text-xs font-mono text-fg leading-4 m-0">
                                <code>{JSON.stringify(log.metadata, null, 2)}</code>
                              </pre>
                            </div>
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

      {/* Event Details Drawer - Exact Figma Layout */}
      <Sheet open={!!selectedLog} onOpenChange={(open) => {
        if (!open) {
          setSelectedLog(null);
          setIsRawDataExpanded(false);
        }
      }}>
        <SheetContent side="right" className="w-full sm:max-w-[672px] bg-bg border-l border-border overflow-y-auto">
          {selectedLog && (
            <>
              <SheetHeader className="pb-6">
                <SheetTitle className="text-base font-semibold text-fg">Audit Event Details</SheetTitle>
                <SheetDescription className="text-sm text-fg-muted">
                  Complete information for this audit event
                </SheetDescription>
              </SheetHeader>
              
              <div className="flex flex-col gap-6 pt-6">
                {/* Event Summary */}
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold text-fg tracking-[-0.14px]">Event Summary</h3>
                  <Card variant="bordered" className="bg-[#18181b] border border-border rounded-xl p-[17px]">
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-1">
                        <div className="bg-[#27272a] inline-flex items-center px-3 py-1.5 rounded">
                          <code className="text-base font-mono text-fg">{selectedLog.action}</code>
                        </div>
                        <p className="text-sm text-fg-muted">
                          {formatTimestampLong(selectedLog.createdAt)}
                        </p>
                      </div>
                      <Badge
                        variant="default"
                        className={
                          getStatus(selectedLog) === 'success'
                            ? 'border-[rgba(0,201,80,0.3)] bg-[rgba(0,201,80,0.1)] text-semantic-success h-[22px] px-2.5 py-0.5 rounded-lg text-xs leading-4 flex items-center gap-1.5'
                            : 'border-[rgba(251,44,54,0.3)] bg-[rgba(251,44,54,0.1)] text-[#fb2c36] h-[22px] px-2.5 py-0.5 rounded-lg text-xs leading-4 flex items-center gap-1.5'
                        }
                      >
                        {getStatus(selectedLog) === 'success' && (
                          <span className="w-3 h-3 rounded-full bg-semantic-success" />
                        )}
                        {getStatus(selectedLog)}
                      </Badge>
                    </div>
                  </Card>
                </div>

                <div className="h-px bg-border" />

                {/* Actor & Source */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-fg">Actor & Source</h3>
                    <Button variant="ghost" size="icon" className="h-5 w-5">
                      <Info className="h-4 w-4" />
                    </Button>
                  </div>
                  <Card variant="bordered" className="bg-[#18181b] border border-border rounded-xl p-[17px]">
                    <div className="flex flex-col gap-9">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-accent-10 shrink-0">
                          <User className="h-4 w-4 text-accent" />
                        </div>
                        <div className="flex-1 flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-fg">{getActorName(selectedLog)}</p>
                            <Badge variant="default" className="border-[rgba(43,127,255,0.3)] bg-[rgba(43,127,255,0.1)] text-semantic-info h-[22px] px-2.5 py-0.5 rounded-lg text-xs leading-4 flex items-center gap-1.5">
                              <span className="w-3 h-3 rounded-full bg-semantic-info" />
                              Human
                            </Badge>
                          </div>
                          {getActorEmail(selectedLog) && (
                            <p className="text-xs text-fg-muted font-mono">{getActorEmail(selectedLog)}</p>
                          )}
                        </div>
                      </div>
                      <div className="h-px bg-border" />
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <p className="text-xs text-fg-muted">IP Address</p>
                          <div className="bg-[#27272a] inline-flex items-center px-2 py-1 rounded">
                            <code className="text-xs font-mono text-fg">{selectedLog.ipAddress || 'N/A'}</code>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <p className="text-xs text-fg-muted">Event ID</p>
                          <div className="bg-[#27272a] inline-flex items-center px-2 py-1 rounded">
                            <code className="text-xs font-mono text-fg">{selectedLog.id}</code>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>

                <div className="h-px bg-border" />

                {/* Immutable Event Notice */}
                <Card variant="bordered" className="bg-[rgba(43,127,255,0.05)] border border-[rgba(43,127,255,0.2)] rounded-xl p-[17px]">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[rgba(43,127,255,0.1)] shrink-0">
                      <Lock className="h-5 w-5 text-semantic-info" />
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                      <p className="text-sm text-semantic-info">Immutable Event</p>
                      <p className="text-xs text-fg-muted">
                        This event is permanently recorded and cannot be modified or deleted. Part of your tamper-proof audit trail.
                      </p>
                    </div>
                  </div>
                </Card>

                <div className="h-px bg-border" />

                {/* Event Details */}
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold text-fg tracking-[-0.14px]">Event Details</h3>
                  <Card variant="bordered" className="bg-[#18181b] border border-border rounded-xl p-[17px]">
                    <div className="flex flex-col gap-3">
                      <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
                        <p className="text-xs text-fg-muted">Action</p>
                        <div className="bg-[#27272a] flex items-center px-2 py-1 rounded w-full">
                          <code className="text-xs font-mono text-fg text-left">{selectedLog.action}</code>
                        </div>
                      </div>
                      <div className="h-px bg-border" />
                      <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
                        <p className="text-xs text-fg-muted">Resource Type</p>
                        <div className="bg-[#27272a] flex items-center px-2 py-1 rounded w-full">
                          <code className="text-xs font-mono text-fg text-left">{selectedLog.resourceType}</code>
                        </div>
                      </div>
                      <div className="h-px bg-border" />
                      <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
                        <p className="text-xs text-fg-muted">Resource ID</p>
                        <div className="bg-[#27272a] flex items-center px-2 py-1 rounded w-full">
                          <code className="text-xs font-mono text-fg text-left">{selectedLog.resourceId}</code>
                        </div>
                      </div>
                      <div className="h-px bg-border" />
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <p className="text-xs text-fg-muted">Timestamp</p>
                        <div className="flex flex-col gap-1 w-full">
                          <div className="bg-[#27272a] flex items-center px-2 py-1 rounded w-full">
                            <code className="text-xs font-mono text-fg text-left">{formatTimestampISO(selectedLog.createdAt)}</code>
                          </div>
                          <p className="text-xs text-fg-muted text-left">{formatTimestamp(selectedLog.createdAt)}</p>
                        </div>
                      </div>
                      {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                        <>
                          <div className="h-px bg-border" />
                          <div className="grid grid-cols-[120px_1fr] gap-2">
                            <p className="text-xs text-fg-muted">Metadata</p>
                            <div className="flex flex-col gap-1 w-full">
                              {Object.entries(selectedLog.metadata).map(([key, value]) => (
                                <div key={key} className="flex items-center gap-2 w-full">
                                  <span className="text-xs text-fg-muted font-mono w-24 flex-shrink-0">{key}:</span>
                                  <div className="flex-1 bg-[#27272a] flex items-center px-1.5 py-0.5 rounded">
                                    <code className="text-xs font-mono text-fg text-left">{String(value)}</code>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </Card>
                </div>

                <div className="h-px bg-border" />

                {/* Raw Event Data */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-fg">Raw Event Data</h3>
                      <Button variant="ghost" size="icon" className="h-5 w-5">
                        <Info className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 gap-2 bg-bg border border-border rounded-lg px-2.5 text-sm text-fg hover:bg-bg-ui-30"
                        onClick={() => copyToClipboard(JSON.stringify(selectedLog, null, 2))}
                      >
                        <Copy className="h-4 w-4" />
                        Copy
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 gap-2 bg-bg border border-border rounded-lg px-2.5 text-sm text-fg hover:bg-bg-ui-30"
                        onClick={() => setIsRawDataExpanded(!isRawDataExpanded)}
                      >
                        {isRawDataExpanded ? (
                          <>
                            <ChevronDown className="h-4 w-4 rotate-180" />
                            Collapse
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4" />
                            Expand
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  {isRawDataExpanded && (
                    <Card variant="bordered" className="bg-[#18181b] border border-border rounded-xl p-[17px]">
                      <div className="bg-[#18181b] rounded-lg p-4 overflow-x-auto">
                        <pre className="text-xs font-mono text-fg leading-4 m-0">
                          <code>{JSON.stringify(selectedLog, null, 2)}</code>
                        </pre>
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { getMe, getAuditEvents, exportAuditEventsAsJson, exportAuditEventsAsCsv, type AuditEvent, type GetAuditEventsParams } from '../../../lib/api-client';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Skeleton } from '../../../components/ui/skeleton';
import { DropdownMenu, DropdownMenuItem } from '../../../components/ui/dropdown-menu';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/table';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'user';
  orgId: string;
}

export default function AuditLogsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const isInitialLoad = useRef(true);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Filters
  const [filters, setFilters] = useState<GetAuditEventsParams>({
    limit: 50,
  });

  // Load user and initial data
  useEffect(() => {
    async function loadData() {
      try {
        // Load user for role checks (AppShell handles auth redirect)
        const meResponse = await getMe();
        if (meResponse?.user) {
          setUser(meResponse.user);
        }

        // Load audit events with current filters
        setIsLoading(true);
        setEvents([]);
        setNextCursor(null);
        const response = await getAuditEvents(filters);
        setEvents(response.data);
        setNextCursor(response.pageInfo.nextCursor);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Load audit events when filters change (but not on initial load)
  useEffect(() => {
    if (user && !isInitialLoad.current) {
      async function reloadEvents() {
        setIsLoading(true);
        setEvents([]);
        setNextCursor(null);
        try {
          const response = await getAuditEvents(filters);
          setEvents(response.data);
          setNextCursor(response.pageInfo.nextCursor);
          setError(null);
        } catch (err: any) {
          setError(err.message || 'Failed to load audit events');
        } finally {
          setIsLoading(false);
        }
      }
      reloadEvents();
    } else if (user && isInitialLoad.current) {
      isInitialLoad.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);


  async function loadAuditEvents(reset = false) {
    try {
      if (reset) {
        setIsLoading(true);
        setEvents([]);
        setNextCursor(null);
      } else {
        setIsLoadingMore(true);
      }

      const response = await getAuditEvents({
        ...filters,
        cursor: reset ? undefined : nextCursor || undefined,
      });

      if (reset) {
        setEvents(response.data);
      } else {
        setEvents((prev) => [...prev, ...response.data]);
      }
      setNextCursor(response.pageInfo.nextCursor);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit events');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }

  function handleFilterChange(key: keyof GetAuditEventsParams, value: any) {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  }

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString();
  }


  // Create a flat list of items for virtualization (includes both rows and expanded rows)
  const virtualItems = useMemo(() => {
    const items: Array<{ type: 'row' | 'expanded'; event: AuditEvent; index: number }> = [];
    events.forEach((event, index) => {
      items.push({ type: 'row', event, index });
      if (expandedRows.has(event.id)) {
        items.push({ type: 'expanded', event, index });
      }
    });
    return items;
  }, [events, expandedRows]);

  // Virtualizer setup
  const rowVirtualizer = useVirtualizer({
    count: virtualItems.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: (index) => {
      const item = virtualItems[index];
      return item?.type === 'expanded' ? 300 : 60; // Expanded rows are taller
    },
    overscan: 5,
    // Recalculate when expanded rows change
    keyExtractor: (index) => {
      const item = virtualItems[index];
      return item ? `${item.event.id}-${item.type}` : index.toString();
    },
  });

  function isAdminOrAuditor(role: string): boolean {
    return role === 'admin'; // API only supports admin, not auditor
  }

  async function handleExportJson() {
    setIsExporting(true);
    setExportError(null);

    try {
      const data = await exportAuditEventsAsJson(filters);
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-events-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setExportError(err.message || 'Failed to export JSON');
    } finally {
      setIsExporting(false);
    }
  }

  async function handleExportCsv() {
    setIsExporting(true);
    setExportError(null);

    try {
      const blob = await exportAuditEventsAsCsv(filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-events-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setExportError(err.message || 'Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  }

  // Loading skeleton state
  if (isLoading && events.length === 0) {
    return (
      <div className="space-y-6">
        {/* Filters skeleton */}
        <div className="border border-border rounded-lg p-6 space-y-4">
          <Skeleton className="h-5 w-24" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
        {/* Table skeleton */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="border-b border-border p-4">
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && events.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="border border-border rounded-lg bg-card-2 text-danger px-6 py-4">
          <p className="text-sm font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Export */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-fg">Audit Logs</h1>
        {user && isAdminOrAuditor(user.role) && (
          <DropdownMenu
            align="right"
            trigger={
              <Button variant="secondary" size="sm" disabled={isExporting}>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
            }
          >
            <DropdownMenuItem onClick={handleExportJson} disabled={isExporting}>
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Export JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportCsv} disabled={isExporting}>
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Export CSV
            </DropdownMenuItem>
          </DropdownMenu>
        )}
      </div>

      {exportError && (
        <div className="border border-border rounded-lg bg-card-2 text-danger px-4 py-3">
          <p className="text-sm">{exportError}</p>
        </div>
      )}

      {/* Filters */}
      <div className="border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-sm font-semibold text-fg">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Date Range */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-muted">
              Start Date
            </label>
            <Input
              type="datetime-local"
              value={filters.startDate ? new Date(filters.startDate).toISOString().slice(0, 16) : ''}
              onChange={(e) => {
                const value = e.target.value;
                handleFilterChange('startDate', value ? new Date(value).toISOString() : undefined);
              }}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-muted">
              End Date
            </label>
            <Input
              type="datetime-local"
              value={filters.endDate ? new Date(filters.endDate).toISOString().slice(0, 16) : ''}
              onChange={(e) => {
                const value = e.target.value;
                handleFilterChange('endDate', value ? new Date(value).toISOString() : undefined);
              }}
            />
          </div>

          {/* Action */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-muted">
              Action
            </label>
            <Input
              type="text"
              value={filters.action || ''}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              placeholder="e.g., created, updated"
            />
          </div>

          {/* Actor Type */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-muted">
              Actor Type
            </label>
            <Select
              value={filters.actorType || ''}
              onChange={(e) => handleFilterChange('actorType', e.target.value)}
            >
              <option value="">All</option>
              <option value="user">User</option>
              <option value="api-key">API Key</option>
              <option value="system">System</option>
            </Select>
          </div>

          {/* Resource Type */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-muted">
              Resource Type
            </label>
            <Input
              type="text"
              value={filters.resourceType || ''}
              onChange={(e) => handleFilterChange('resourceType', e.target.value)}
              placeholder="e.g., user, api-key"
            />
          </div>

          {/* Resource ID */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-muted">
              Resource ID
            </label>
            <Input
              type="text"
              value={filters.resourceId || ''}
              onChange={(e) => handleFilterChange('resourceId', e.target.value)}
              placeholder="UUID"
            />
          </div>

          {/* Metadata Text */}
          <div className="md:col-span-2 lg:col-span-3 space-y-2">
            <label className="block text-xs font-medium text-muted">
              Metadata Search
            </label>
            <Input
              type="text"
              value={filters.metadataText || ''}
              onChange={(e) => handleFilterChange('metadataText', e.target.value)}
              placeholder="Search in metadata JSON"
            />
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        {events.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <svg
              className="w-12 h-12 text-muted mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-sm font-medium text-muted mb-1">No audit events found</p>
            <p className="text-xs text-muted">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow hover={false}>
                    <TableHead className="min-w-[180px] text-xs font-semibold text-muted uppercase tracking-wider">
                      Timestamp
                    </TableHead>
                    <TableHead className="min-w-[200px] text-xs font-semibold text-muted uppercase tracking-wider">
                      Actor
                    </TableHead>
                    <TableHead className="min-w-[120px] text-xs font-semibold text-muted uppercase tracking-wider">
                      Action
                    </TableHead>
                    <TableHead className="min-w-[250px] text-xs font-semibold text-muted uppercase tracking-wider">
                      Resource
                    </TableHead>
                    <TableHead className="min-w-[140px] text-xs font-semibold text-muted uppercase tracking-wider">
                      IP Address
                    </TableHead>
                    <TableHead className="min-w-[120px] text-xs font-semibold text-muted uppercase tracking-wider">
                      Details
                    </TableHead>
                  </TableRow>
                </TableHeader>
              </Table>
              <div
                ref={tableContainerRef}
                className="overflow-auto"
                style={{ height: '600px' }}
              >
                <div
                  style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    minWidth: '1200px',
                    position: 'relative',
                  }}
                >
                  <Table>
                    <TableBody>
                      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const item = virtualItems[virtualRow.index];
                        if (!item) return null;

                        if (item.type === 'expanded') {
                          return (
                            <TableRow
                              key={`${item.event.id}-expanded`}
                              hover={false}
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: `${virtualRow.size}px`,
                                transform: `translateY(${virtualRow.start}px)`,
                              }}
                              className="bg-muted/30"
                            >
                              <TableCell colSpan={6} className="p-6">
                                <div className="space-y-4">
                                  {item.event.metadata && (
                                    <div>
                                      <h4 className="text-xs font-semibold text-muted mb-2">Metadata</h4>
                                      <pre className="bg-card-2 text-fg p-4 rounded-lg overflow-x-auto text-xs font-mono border border-border">
                                        {JSON.stringify(item.event.metadata, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  {item.event.userAgent && (
                                    <div>
                                      <h4 className="text-xs font-semibold text-muted mb-1">User Agent</h4>
                                      <p className="text-xs text-muted font-mono">{item.event.userAgent}</p>
                                    </div>
                                  )}
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <span className="text-xs font-medium text-muted">Event ID:</span>
                                      <span className="ml-2 text-xs text-muted font-mono">{item.event.id}</span>
                                    </div>
                                    <div>
                                      <span className="text-xs font-medium text-muted">Organization ID:</span>
                                      <span className="ml-2 text-xs text-muted font-mono">{item.event.orgId}</span>
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        }

                        return (
                          <TableRow
                            key={item.event.id}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: `${virtualRow.size}px`,
                              transform: `translateY(${virtualRow.start}px)`,
                            }}
                            className="cursor-pointer"
                            onClick={() => toggleRow(item.event.id)}
                          >
                            <TableCell className="min-w-[180px] text-sm text-fg">
                              {formatDate(item.event.createdAt)}
                            </TableCell>
                            <TableCell className="min-w-[200px] text-sm">
                              <div>
                                <span className="font-medium text-fg">{item.event.actorType}</span>
                                {item.event.actorId && (
                                  <div className="text-xs text-muted break-all font-mono mt-0.5">
                                    {item.event.actorId}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="min-w-[120px]">
                              <Badge variant="secondary" size="sm">
                                {item.event.action}
                              </Badge>
                            </TableCell>
                            <TableCell className="min-w-[250px] text-sm">
                              <div>
                                <span className="font-medium text-fg">{item.event.resourceType}</span>
                                <div className="text-xs text-muted break-all font-mono mt-0.5">
                                  {item.event.resourceId}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="min-w-[140px] text-sm text-muted">
                              {item.event.ipAddress || '-'}
                            </TableCell>
                            <TableCell className="min-w-[120px]">
                              <button className="text-xs font-medium text-accent hover:text-accent-2 transition-colors">
                                {expandedRows.has(item.event.id) ? 'Hide' : 'Show'} Details
                              </button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            {/* Load More Button */}
            {nextCursor && (
              <div className="border-t border-border p-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => loadAuditEvents(false)}
                  disabled={isLoadingMore}
                  loading={isLoadingMore}
                  className="w-full"
                >
                  {isLoadingMore ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}

            {error && events.length > 0 && (
              <div className="border-t border-border p-4 bg-card-2">
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

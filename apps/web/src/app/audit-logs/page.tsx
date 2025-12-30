'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { getMe, getAuditEvents, exportAuditEventsAsJson, exportAuditEventsAsCsv, type AuditEvent, type GetAuditEventsParams } from '../../lib/api-client';

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
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const isInitialLoad = useRef(true);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Filters
  const [filters, setFilters] = useState<GetAuditEventsParams>({
    limit: 50,
  });

  // Load user and initial data
  useEffect(() => {
    async function loadData() {
      try {
        const meResponse = await getMe();
        if (!meResponse || !meResponse.user) {
          window.location.href = '/login';
          return;
        }
        setUser(meResponse.user);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
        setShowExportDropdown(false);
      }
    }

    if (showExportDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportDropdown]);

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

  function getRoleBadgeColor(role: string) {
    return role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800';
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
    setShowExportDropdown(false);

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
    setShowExportDropdown(false);

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

  if (isLoading && events.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (error && events.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-[95vw]">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Audit Logs</h1>
              <p className="text-slate-600">
                Welcome, {user?.name || user?.email}! 
                {user && (
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${getRoleBadgeColor(user.role)}`}>
                    {user.role.toUpperCase()}
                  </span>
                )}
              </p>
            </div>
            {/* Export Dropdown */}
            <div className="relative" ref={exportDropdownRef}>
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                disabled={!user || !isAdminOrAuditor(user.role) || isExporting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
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
                <svg
                  className={`w-4 h-4 transition-transform ${showExportDropdown ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {showExportDropdown && user && isAdminOrAuditor(user.role) && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-10">
                  <button
                    onClick={handleExportJson}
                    disabled={isExporting}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-t-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
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
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Export JSON
                  </button>
                  <button
                    onClick={handleExportCsv}
                    disabled={isExporting}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-b-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
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
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Export CSV
                  </button>
                </div>
              )}
            </div>
          </div>
          {exportError && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {exportError}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Start Date
              </label>
              <input
                type="datetime-local"
                value={filters.startDate ? new Date(filters.startDate).toISOString().slice(0, 16) : ''}
                onChange={(e) => {
                  const value = e.target.value;
                  handleFilterChange('startDate', value ? new Date(value).toISOString() : undefined);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                End Date
              </label>
              <input
                type="datetime-local"
                value={filters.endDate ? new Date(filters.endDate).toISOString().slice(0, 16) : ''}
                onChange={(e) => {
                  const value = e.target.value;
                  handleFilterChange('endDate', value ? new Date(value).toISOString() : undefined);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Action */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Action
              </label>
              <input
                type="text"
                value={filters.action || ''}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                placeholder="e.g., created, updated"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Actor Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Actor Type
              </label>
              <select
                value={filters.actorType || ''}
                onChange={(e) => handleFilterChange('actorType', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">All</option>
                <option value="user">User</option>
                <option value="api-key">API Key</option>
                <option value="system">System</option>
              </select>
            </div>

            {/* Resource Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Resource Type
              </label>
              <input
                type="text"
                value={filters.resourceType || ''}
                onChange={(e) => handleFilterChange('resourceType', e.target.value)}
                placeholder="e.g., user, api-key"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Resource ID */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Resource ID
              </label>
              <input
                type="text"
                value={filters.resourceId || ''}
                onChange={(e) => handleFilterChange('resourceId', e.target.value)}
                placeholder="UUID"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Metadata Text */}
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Metadata Search
              </label>
              <input
                type="text"
                value={filters.metadataText || ''}
                onChange={(e) => handleFilterChange('metadataText', e.target.value)}
                placeholder="Search in metadata JSON"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {events.length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-500">
              No audit events found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[180px]">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[200px]">
                      Actor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[120px]">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[250px]">
                      Resource
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[140px]">
                      IP Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider min-w-[120px]">
                      Details
                    </th>
                  </tr>
                </thead>
              </table>
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
                  <table className="w-full min-w-[1200px]">
                    <tbody>
                      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const item = virtualItems[virtualRow.index];
                        if (!item) return null;

                        if (item.type === 'expanded') {
                          return (
                            <tr
                              key={`${item.event.id}-expanded`}
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: `${virtualRow.size}px`,
                                transform: `translateY(${virtualRow.start}px)`,
                              }}
                              className="bg-slate-50 border-t border-slate-200"
                            >
                              <td colSpan={6} className="px-6 py-4">
                                <div className="space-y-4">
                                  {item.event.metadata && (
                                    <div>
                                      <h4 className="text-sm font-semibold text-slate-900 mb-2">Metadata</h4>
                                      <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs">
                                        {JSON.stringify(item.event.metadata, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  {item.event.userAgent && (
                                    <div>
                                      <h4 className="text-sm font-semibold text-slate-900 mb-1">User Agent</h4>
                                      <p className="text-sm text-slate-600">{item.event.userAgent}</p>
                                    </div>
                                  )}
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <span className="font-semibold text-slate-700">Event ID:</span>
                                      <span className="ml-2 text-slate-600 font-mono text-xs">{item.event.id}</span>
                                    </div>
                                    <div>
                                      <span className="font-semibold text-slate-700">Organization ID:</span>
                                      <span className="ml-2 text-slate-600 font-mono text-xs">{item.event.orgId}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr
                            key={item.event.id}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: `${virtualRow.size}px`,
                              transform: `translateY(${virtualRow.start}px)`,
                            }}
                            className="hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-200"
                            onClick={() => toggleRow(item.event.id)}
                          >
                            <td className="px-6 py-4 text-sm text-slate-900 min-w-[180px]">
                              {formatDate(item.event.createdAt)}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-900 min-w-[200px]">
                              <div>
                                <span className="font-medium">{item.event.actorType}</span>
                                {item.event.actorId && (
                                  <div className="text-xs text-slate-500 break-all font-mono">
                                    {item.event.actorId}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-900 min-w-[120px]">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                {item.event.action}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-900 min-w-[250px]">
                              <div>
                                <span className="font-medium">{item.event.resourceType}</span>
                                <div className="text-xs text-slate-500 break-all font-mono">
                                  {item.event.resourceId}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500 min-w-[140px]">
                              {item.event.ipAddress || '-'}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500 min-w-[120px]">
                              <button className="text-blue-600 hover:text-blue-800 font-medium">
                                {expandedRows.has(item.event.id) ? 'Hide' : 'Show'} Details
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Load More Button */}
          {nextCursor && (
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => loadAuditEvents(false)}
                disabled={isLoadingMore}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}

          {error && events.length > 0 && (
            <div className="px-6 py-4 bg-red-50 border-t border-red-200">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

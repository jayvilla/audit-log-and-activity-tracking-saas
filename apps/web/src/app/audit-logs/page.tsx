'use client';

import { useState, useEffect, useRef } from 'react';
import { getMe, getAuditEvents, type AuditEvent, type GetAuditEventsParams } from '../../lib/api-client';

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
  const isInitialLoad = useRef(true);

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
      <div className="container mx-auto px-4 py-8 max-w-7xl">
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
          </div>
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      No audit events found
                    </td>
                  </tr>
                ) : (
                  events.map((event) => (
                    <>
                      <tr
                        key={event.id}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => toggleRow(event.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {formatDate(event.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          <div>
                            <span className="font-medium">{event.actorType}</span>
                            {event.actorId && (
                              <div className="text-xs text-slate-500 truncate max-w-xs">
                                {event.actorId}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                            {event.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          <div>
                            <span className="font-medium">{event.resourceType}</span>
                            <div className="text-xs text-slate-500 truncate max-w-xs">
                              {event.resourceId}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {event.ipAddress || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          <button className="text-blue-600 hover:text-blue-800 font-medium">
                            {expandedRows.has(event.id) ? 'Hide' : 'Show'} Details
                          </button>
                        </td>
                      </tr>
                      {expandedRows.has(event.id) && (
                        <tr key={`${event.id}-expanded`} className="bg-slate-50">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="space-y-4">
                              {event.metadata && (
                                <div>
                                  <h4 className="text-sm font-semibold text-slate-900 mb-2">Metadata</h4>
                                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs">
                                    {JSON.stringify(event.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {event.userAgent && (
                                <div>
                                  <h4 className="text-sm font-semibold text-slate-900 mb-1">User Agent</h4>
                                  <p className="text-sm text-slate-600">{event.userAgent}</p>
                                </div>
                              )}
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="font-semibold text-slate-700">Event ID:</span>
                                  <span className="ml-2 text-slate-600 font-mono text-xs">{event.id}</span>
                                </div>
                                <div>
                                  <span className="font-semibold text-slate-700">Organization ID:</span>
                                  <span className="ml-2 text-slate-600 font-mono text-xs">{event.orgId}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))
                )}
              </tbody>
            </table>
          </div>

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

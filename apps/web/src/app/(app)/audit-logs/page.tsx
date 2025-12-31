'use client';

import { useState, useEffect } from 'react';
import { getAuditEvents, type AuditEvent, type GetAuditEventsParams } from '../../../lib/api-client';
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
} from 'lucide-react';

export default function AuditLogsPage() {
  usePageTitle('Audit Logs');

  const [logs, setLogs] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadLogs() {
      setIsLoading(true);
      try {
        const params: GetAuditEventsParams = {
          limit: 50,
        };
        const response = await getAuditEvents(params);
        if (response) {
          setLogs(response.data || []);
        }
      } catch (error) {
        console.error('Failed to load audit logs:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.actorId?.toLowerCase().includes(query) ||
      log.action.toLowerCase().includes(query) ||
      log.resourceType.toLowerCase().includes(query) ||
      log.resourceId.toLowerCase().includes(query)
    );
  });

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getActorName = (log: AuditEvent) => {
    // In a real app, you'd fetch actor details
    return log.actorId || 'Unknown';
  };

  const getActorEmail = (log: AuditEvent) => {
    // In a real app, you'd fetch actor details
    return '';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-bg-ui-30 rounded animate-pulse" />
        <div className="h-64 bg-bg-ui-30 rounded animate-pulse" />
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
        <Button size="sm" variant="secondary" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <Card variant="bordered" className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
            <Input
              placeholder="Search by actor, action, or resource..."
              className="pl-9 bg-bg-card border-border"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="secondary" size="sm" className="gap-2 sm:w-auto">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button variant="secondary" size="sm" className="gap-2 sm:w-auto">
            Last 7 days
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
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
              <p className="text-2xl font-semibold text-fg">{logs.length}</p>
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
                {new Set(logs.map(l => l.actorId)).size}
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
              <p className="text-2xl font-semibold text-fg">0</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card variant="bordered" className="overflow-hidden border-border">
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
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-fg-muted py-8">
                  No audit logs found
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => {
                const isExpanded = expandedRow === log.id;
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
                          {log.action}
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
                          className="border-semantic-success/30 bg-semantic-success/10 text-semantic-success"
                        >
                          success
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
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}


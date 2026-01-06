'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePageTitle } from '../../../lib/use-page-title';
import {
  getAnalytics,
  type AnalyticsData,
  type AnalyticsTimeRange,
} from '../../../lib/api-client';
import {
  Button,
  Card,
  Badge,
  Select,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@audit-log-and-activity-tracking-saas/ui';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
  Download,
  ChevronDown,
  Info,
  Calendar,
  BarChart3,
  Users,
  Zap,
  Loader2,
} from 'lucide-react';

export default function AnalyticsPage() {
  usePageTitle('Analytics');
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>('30d');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    async function loadAnalytics() {
      setIsLoading(true);
      setError(null);
      try {
        const analyticsData = await getAnalytics(timeRange);
        setData(analyticsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setIsLoading(false);
      }
    }

    loadAnalytics();
  }, [timeRange]);

  const handleExport = (format: 'json' | 'csv') => {
    if (!data) return;

    const exportData = format === 'json'
      ? JSON.stringify(data, null, 2)
      : convertToCSV(data.eventsPerDay);

    const blob = new Blob([exportData], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-analytics-${new Date().toISOString()}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    return [headers, ...rows].join('\n');
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-xs font-medium mb-2 text-fg">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs text-fg-muted" style={{ color: entry.color }}>
              {entry.name}: <span className="font-semibold text-fg">{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-fg">Analytics</h2>
            <p className="text-sm text-fg-muted mt-1">
              Analyze audit log patterns and trends
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-sm text-fg-muted">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-fg">Analytics</h2>
            <p className="text-sm text-fg-muted mt-1">
              Analyze audit log patterns and trends
            </p>
          </div>
        </div>

        <Card variant="bordered" className="p-4 border-danger/20 bg-danger/5">
          <div className="flex items-center gap-2 text-danger">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">Error: {error}</p>
          </div>
        </Card>
      </div>
    );
  }

  // Empty State
  if (!data || data.summary.totalEvents === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-fg">Analytics</h2>
            <p className="text-sm text-fg-muted mt-1">
              Analyze audit log patterns and trends
            </p>
          </div>
        </div>

        <Card variant="bordered" className="border-border">
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 mb-4">
              <BarChart3 className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-lg font-semibold text-fg mb-2">No data available</h3>
            <p className="text-sm text-fg-muted text-center max-w-md">
              There are no audit events in the selected time range. Analytics will appear here once audit events are recorded.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const { summary, eventsPerDay, actionsByType, actorsByVolume } = data;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-fg">Analytics</h2>
          <p className="text-sm text-fg-muted mt-1">
            Analyze audit log patterns and trends
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-fg-muted pointer-events-none" />
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as AnalyticsTimeRange)}
              className="w-[140px] pl-10"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </Select>
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
      </div>

      {/* Info Notice */}
      <Card variant="bordered" className="p-4 bg-semantic-info/5 border-semantic-info/20">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-semantic-info flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-fg">Deterministic Analytics</p>
            <p className="text-sm text-fg-muted">
              All charts are based on actual audit event data with no predictions or AI inference. Data is aggregated in real-time from your immutable audit trail.
            </p>
          </div>
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="bordered" className="p-4 border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
              <Activity className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-fg-muted">Total Events</p>
              <p className="text-2xl font-semibold text-fg">{summary.totalEvents.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <Card variant="bordered" className="p-4 border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-semantic-success/10">
              <BarChart3 className="h-5 w-5 text-semantic-success" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-fg-muted">Avg/Day</p>
              <p className="text-2xl font-semibold text-fg">{summary.avgEventsPerDay}</p>
            </div>
          </div>
        </Card>

        <Card variant="bordered" className="p-4 border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-fg-muted">Failure Rate</p>
              <p className="text-2xl font-semibold text-fg">{summary.failureRate.toFixed(2)}%</p>
            </div>
          </div>
        </Card>

        <Card variant="bordered" className="p-4 border-border">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              summary.trend >= 0 ? 'bg-semantic-success/10' : 'bg-red-500/10'
            }`}>
              {summary.trend >= 0 ? (
                <TrendingUp className="h-5 w-5 text-semantic-success" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-fg-muted">7-Day Trend</p>
              <p className={`text-2xl font-semibold ${
                summary.trend >= 0 ? 'text-semantic-success' : 'text-red-500'
              }`}>
                {summary.trend > 0 ? '+' : ''}{summary.trend.toFixed(1)}%
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Events Per Day */}
      <Card variant="bordered" className="p-6 border-border">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-fg">Events Per Day</h3>
            <p className="text-sm text-fg-muted mt-1">
              Total audit events recorded each day, split by success and failure
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Info className="h-4 w-4 text-fg-muted" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="text-xs text-fg">
                This chart shows the daily count of all audit events. Green represents successful events, red represents failures. Use this to identify activity patterns and anomalies.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={eventsPerDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="#71717a"
              style={{ fontSize: '12px', fill: '#71717a' }}
            />
            <YAxis 
              stroke="#71717a"
              style={{ fontSize: '12px', fill: '#71717a' }}
            />
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ fontSize: '12px', color: 'hsl(var(--fg-muted))' }}
              iconType="line"
            />
            <Line 
              type="monotone" 
              dataKey="success" 
              stroke="#10b981" 
              strokeWidth={2}
              name="Success"
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line 
              type="monotone" 
              dataKey="failure" 
              stroke="#ef4444" 
              strokeWidth={2}
              name="Failure"
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Actions by Type */}
      <Card variant="bordered" className="p-6 border-border">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-fg">Actions by Type</h3>
            <p className="text-sm text-fg-muted mt-1">
              Distribution of audit events by action type
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Info className="h-4 w-4 text-fg-muted" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="text-xs text-fg">
                This chart breaks down audit events by action type. Use this to understand which operations are most common in your system.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={actionsByType} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              type="number"
              stroke="#71717a"
              style={{ fontSize: '12px', fill: '#71717a' }}
            />
            <YAxis 
              type="category"
              dataKey="action" 
              stroke="#71717a"
              style={{ fontSize: '11px', fill: '#71717a' }}
              width={140}
            />
            <RechartsTooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="count" 
              fill="#6366f1"
              radius={[0, 4, 4, 0]}
              name="Count"
            />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 pt-4 border-t border-border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {actionsByType.slice(0, 4).map((action) => (
              <div key={action.action} className="space-y-1">
                <p className="text-xs text-fg-muted truncate">{action.action}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-sm font-semibold text-fg">{action.count.toLocaleString()}</p>
                  <Badge variant="outline" className="text-xs">
                    {action.percentage}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Actors by Volume */}
      <Card variant="bordered" className="p-6 border-border">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-fg">Actors by Volume</h3>
            <p className="text-sm text-fg-muted mt-1">
              Top actors by number of audit events generated
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Info className="h-4 w-4 text-fg-muted" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="text-xs text-fg">
                This chart shows which users, API keys, or system processes generate the most audit events. Use this to identify high-activity accounts or automated processes.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={actorsByVolume}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="actor" 
              stroke="#71717a"
              style={{ fontSize: '11px', fill: '#71717a' }}
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis 
              stroke="#71717a"
              style={{ fontSize: '12px', fill: '#71717a' }}
            />
            <RechartsTooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="count" 
              fill="#6366f1"
              radius={[4, 4, 0, 0]}
              name="Events"
            />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 pt-4 border-t border-border">
          <div className="space-y-2">
            {actorsByVolume.slice(0, 5).map((actor, index) => (
              <div key={`${actor.actor}-${index}`} className="flex items-center gap-3">
                <span className="text-xs text-fg-muted w-4">#{index + 1}</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 shrink-0">
                  {actor.type === 'user' ? (
                    <Users className="h-4 w-4 text-accent" />
                  ) : actor.type === 'api_key' ? (
                    <Zap className="h-4 w-4 text-orange-500" />
                  ) : (
                    <Activity className="h-4 w-4 text-purple-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-fg truncate">{actor.actor}</p>
                  <p className="text-xs text-fg-muted capitalize">{actor.type}</p>
                </div>
                <Badge variant="outline" className="shrink-0">
                  {actor.count.toLocaleString()}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </Card>
      </div>
    </TooltipProvider>
  );
}


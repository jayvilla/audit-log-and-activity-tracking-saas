'use client';

import { useEffect, useState } from 'react';
import { Card } from '@audit-log-and-activity-tracking-saas/ui';
import { Activity, TrendingUp, Users, Shield } from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { usePageTitle } from '../../../lib/use-page-title';
import { getOverviewMetrics, type OverviewMetrics } from '../../../lib/api-client';

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

export default function OverviewPage() {
  usePageTitle('Overview');
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true);
        setError(null);
        const data = await getOverviewMetrics();
        setMetrics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load overview metrics');
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-fg">Overview</h2>
          <p className="text-sm text-fg-muted mt-1">
            Your audit log activity at a glance
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <p className="text-fg-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-fg">Overview</h2>
          <p className="text-sm text-fg-muted mt-1">
            Your audit log activity at a glance
          </p>
        </div>
        <Card variant="bordered" className="p-6 border-border">
          <p className="text-fg-muted">Error: {error}</p>
        </Card>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-fg">Overview</h2>
          <p className="text-sm text-fg-muted mt-1">
            Your audit log activity at a glance
          </p>
        </div>
        <Card variant="bordered" className="p-6 border-border">
          <p className="text-fg-muted">No data available</p>
        </Card>
      </div>
    );
  }

  // Format top actions for the chart (combine resourceType.action)
  const actionDistribution = metrics.topActions.map((item) => ({
    action: item.action,
    count: item.count,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-fg">Overview</h2>
        <p className="text-sm text-fg-muted mt-1">
          Your audit log activity at a glance
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card variant="bordered" className="p-6 border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-10">
              <Activity className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-fg-muted">Events Today</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-semibold text-fg">{metrics.eventsToday.toLocaleString()}</p>
                {metrics.eventsTodayChange !== 0 && (
                  <span className={`text-xs flex items-center gap-1 ${
                    metrics.eventsTodayChange > 0 ? 'text-semantic-success' : 'text-red-500'
                  }`}>
                    <TrendingUp className="h-3 w-3" />
                    {Math.abs(metrics.eventsTodayChange)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card variant="bordered" className="p-6 border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-semantic-info/10">
              <Users className="h-5 w-5 text-semantic-info" />
            </div>
            <div>
              <p className="text-sm text-fg-muted">Active Users</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-semibold text-fg">{metrics.activeUsers.toLocaleString()}</p>
                {metrics.activeUsersChange !== 0 && (
                  <span className={`text-xs flex items-center gap-1 ${
                    metrics.activeUsersChange > 0 ? 'text-semantic-success' : 'text-red-500'
                  }`}>
                    <TrendingUp className="h-3 w-3" />
                    {Math.abs(metrics.activeUsersChange)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card variant="bordered" className="p-6 border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-semantic-success/10">
              <Shield className="h-5 w-5 text-semantic-success" />
            </div>
            <div>
              <p className="text-sm text-fg-muted">Success Rate</p>
              <p className="text-2xl font-semibold text-fg">{metrics.successRate.toFixed(1)}%</p>
            </div>
          </div>
        </Card>

        <Card variant="bordered" className="p-6 border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-30">
              <Activity className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-fg-muted">Avg Response</p>
              <p className="text-2xl font-semibold text-fg">{metrics.avgResponseTime}ms</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card variant="bordered" className="p-6 border-border">
          <div className="mb-6">
            <h3 className="text-base font-semibold text-fg">Event Activity</h3>
            <p className="text-sm text-fg-muted">Last 7 days</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={metrics.eventActivityLast7Days}>
              <defs>
                <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis 
                dataKey="date" 
                stroke="#71717a" 
                fontSize={12}
                tickLine={false}
              />
              <YAxis 
                stroke="#71717a" 
                fontSize={12}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#18181b', 
                  border: '1px solid #27272a',
                  borderRadius: '8px',
                  color: '#e4e4e7'
                }}
              />
              <Area
                type="monotone"
                dataKey="events"
                stroke="#8b5cf6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorEvents)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card variant="bordered" className="p-6 border-border">
          <div className="mb-6">
            <h3 className="text-base font-semibold text-fg">Top Actions</h3>
            <p className="text-sm text-fg-muted">Most common events</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={actionDistribution} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis 
                type="number" 
                stroke="#71717a" 
                fontSize={12}
                tickLine={false}
              />
              <YAxis 
                type="category" 
                dataKey="action" 
                stroke="#71717a" 
                fontSize={12}
                tickLine={false}
                width={130}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#18181b', 
                  border: '1px solid #27272a',
                  borderRadius: '8px',
                  color: '#e4e4e7'
                }}
              />
              <Bar 
                dataKey="count" 
                fill="#8b5cf6" 
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent activity */}
      <Card variant="bordered" className="p-6 border-border">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-fg">Recent Activity</h3>
          <p className="text-sm text-fg-muted">Latest audit events</p>
        </div>
        <div className="space-y-3">
          {metrics.recentActivity.length === 0 ? (
            <p className="text-sm text-fg-muted py-4 text-center">No recent activity</p>
          ) : (
            metrics.recentActivity.map((event) => (
              <div 
                key={event.id} 
                className="flex items-center justify-between py-3 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${
                    event.status === 'success' ? 'bg-semantic-success' : 'bg-red-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-fg">{event.actor || 'Unknown'}</p>
                    <code className="text-xs text-fg-muted">{event.action}</code>
                  </div>
                </div>
                <p className="text-xs text-fg-muted">{formatTimeAgo(event.createdAt)}</p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}


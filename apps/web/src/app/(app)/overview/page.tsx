'use client';

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

const activityData = [
  { date: 'Dec 25', events: 420 },
  { date: 'Dec 26', events: 380 },
  { date: 'Dec 27', events: 520 },
  { date: 'Dec 28', events: 490 },
  { date: 'Dec 29', events: 650 },
  { date: 'Dec 30', events: 580 },
  { date: 'Dec 31', events: 720 },
];

const actionDistribution = [
  { action: 'user.login', count: 450 },
  { action: 'document.updated', count: 320 },
  { action: 'apikey.created', count: 180 },
  { action: 'role.assigned', count: 95 },
  { action: 'export.requested', count: 75 },
];

export default function OverviewPage() {
  usePageTitle('Overview');

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
                <p className="text-2xl font-semibold text-fg">720</p>
                <span className="text-xs text-semantic-success flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  12%
                </span>
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
                <p className="text-2xl font-semibold text-fg">247</p>
                <span className="text-xs text-semantic-success flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  8%
                </span>
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
              <p className="text-2xl font-semibold text-fg">99.7%</p>
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
              <p className="text-2xl font-semibold text-fg">45ms</p>
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
            <AreaChart data={activityData}>
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
          {[
            { actor: 'Sarah Johnson', action: 'user.login', time: '2 minutes ago', status: 'success' },
            { actor: 'Michael Chen', action: 'document.updated', time: '5 minutes ago', status: 'success' },
            { actor: 'Emily Davis', action: 'apikey.created', time: '12 minutes ago', status: 'success' },
            { actor: 'David Wilson', action: 'user.password_reset', time: '18 minutes ago', status: 'failure' },
            { actor: 'Lisa Anderson', action: 'webhook.triggered', time: '23 minutes ago', status: 'success' },
          ].map((event, i) => (
            <div 
              key={i} 
              className="flex items-center justify-between py-3 border-b border-border last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full ${
                  event.status === 'success' ? 'bg-semantic-success' : 'bg-red-500'
                }`} />
                <div>
                  <p className="text-sm font-medium text-fg">{event.actor}</p>
                  <code className="text-xs text-fg-muted">{event.action}</code>
                </div>
              </div>
              <p className="text-xs text-fg-muted">{event.time}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}


'use client';

import { useState } from 'react';
import {
  Card,
  Button,
  Badge,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
  Skeleton,
} from '@audit-log-and-activity-tracking-saas/ui';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Info,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Ban,
  Eye,
  Clock,
  GitBranch,
  X,
  Zap,
  FileText,
  Filter,
} from 'lucide-react';
import { format } from 'date-fns';
import type { InvestigationResponse } from '../lib/api-client';

export type InvestigationData = InvestigationResponse;

interface AIInvestigationProps {
  data?: InvestigationData;
  loading?: boolean;
  error?: boolean;
  isEmpty?: boolean;
  isDisabled?: boolean;
  modelUnavailable?: boolean;
  onClose?: () => void;
  onRetry?: () => void;
  onViewEvent?: (eventId: string) => void;
  onViewSourceEvents?: (eventIds: string[]) => void;
}

type ViewMode = 'correlation' | 'timeline';

export function AIInvestigation({
  data,
  loading = false,
  error = false,
  isEmpty = false,
  isDisabled = false,
  modelUnavailable = false,
  onClose,
  onRetry,
  onViewEvent,
  onViewSourceEvents,
}: AIInvestigationProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('correlation');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  // Disabled State
  if (isDisabled) {
    return (
      <Card variant="bordered" className="border-border bg-card/50">
        <div className="p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-muted shrink-0">
              <Ban className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-fg">AI Investigation</h3>
                <Badge variant="default" className="bg-purple-500/10 border-purple-500/20 text-purple-400">
                  Disabled
                </Badge>
              </div>
              <p className="text-sm text-fg-muted">
                AI-guided investigation is not available for your account. Contact your administrator to enable this feature.
              </p>
            </div>
            {onClose && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // Model Unavailable State
  if (modelUnavailable) {
    return (
      <Card variant="bordered" className="border-border bg-card/50">
        <div className="p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-orange-500/10 shrink-0">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-fg">AI Investigation</h3>
                <Badge variant="default" className="bg-purple-500/10 border-purple-500/20 text-purple-400">
                  AI-guided
                </Badge>
              </div>
              <p className="text-sm text-fg-muted">
                The AI correlation model is temporarily unavailable. The audit log data is still accessible. Please try again later.
              </p>
              <div className="flex items-center gap-2">
                {onRetry && (
                  <Button variant="secondary" size="sm" onClick={onRetry}>
                    Try Again
                  </Button>
                )}
                {onClose && (
                  <Button variant="ghost" size="sm" onClick={onClose}>
                    Close
                  </Button>
                )}
              </div>
            </div>
            {onClose && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // Error State
  if (error) {
    return (
      <Card variant="bordered" className="border-border bg-card/50">
        <div className="p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-red-500/10 shrink-0">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-fg">AI Investigation</h3>
                <Badge variant="default" className="bg-purple-500/10 border-purple-500/20 text-purple-400">
                  AI-guided
                </Badge>
              </div>
              <p className="text-sm text-fg-muted">
                Unable to complete investigation. The audit log data is still available. Try again or contact support if the issue persists.
              </p>
              <div className="flex items-center gap-2">
                {onRetry && (
                  <Button variant="secondary" size="sm" onClick={onRetry}>
                    Try Again
                  </Button>
                )}
                {onClose && (
                  <Button variant="ghost" size="sm" onClick={onClose}>
                    Close
                  </Button>
                )}
              </div>
            </div>
            {onClose && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // Empty State
  if (isEmpty) {
    return (
      <Card variant="bordered" className="border-border bg-card/50">
        <div className="p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-purple-500/10 shrink-0">
              <Sparkles className="h-5 w-5 text-purple-400" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-fg">AI Investigation</h3>
                <Badge variant="default" className="bg-purple-500/10 border-purple-500/20 text-purple-400">
                  AI-guided
                </Badge>
              </div>
              <p className="text-sm text-fg-muted">
                No related events found for this investigation. Try adjusting filters or selecting a different time range.
              </p>
            </div>
            {onClose && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // Loading State
  if (loading) {
    return (
      <Card variant="bordered" className="border-border bg-card/50">
        <div className="p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-purple-500/10 shrink-0">
              <Loader2 className="h-5 w-5 text-purple-400 animate-spin" />
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-fg">AI Investigation</h3>
                <Badge variant="default" className="bg-purple-500/10 border-purple-500/20 text-purple-400">
                  AI-guided
                </Badge>
              </div>
              <p className="text-sm text-fg-muted">
                Analyzing event relationships and reconstructing timeline...
              </p>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              {onClose && (
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Cancel
                </Button>
              )}
            </div>
            {onClose && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // Default State (with data)
  if (!data) {
    return null;
  }

  const formatEventTime = (timestamp: string) => {
    return format(new Date(timestamp), 'h:mm a');
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 80) return 'bg-purple-500/10 border-purple-500/30 text-purple-400';
    if (score >= 50) return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
    return 'bg-muted border-border text-muted-foreground';
  };

  const getSeverityColor = (severity: 'high' | 'medium' | 'low') => {
    if (severity === 'high') return 'border-red-500/30 bg-red-500/5';
    if (severity === 'medium') return 'border-orange-500/30 bg-orange-500/5';
    return 'border-blue-500/30 bg-blue-500/5';
  };

  const getSignificanceColor = (significance: 'critical' | 'important' | 'normal') => {
    if (significance === 'critical') return 'bg-red-500/10 border-red-500/30';
    if (significance === 'important') return 'bg-orange-500/10 border-orange-500/30';
    return 'bg-primary/10 border-primary/30';
  };

  return (
    <Card variant="bordered" className="border-border bg-card/50">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-purple-500/10 shrink-0">
              <Sparkles className="h-5 w-5 text-purple-400" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-fg">AI Investigation</h3>
                <Badge variant="default" className="bg-purple-500/10 border-purple-500/20 text-purple-400">
                  AI-guided
                </Badge>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5">
                        <Info className="h-3 w-3 text-fg-muted" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p className="text-xs">
                        AI-guided investigation analyzes event relationships and reconstructs timelines. All findings are grounded in real audit events. This is read-only and cannot trigger actions.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-xs text-fg-muted">{data.triggerContext}</p>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Summary */}
        <div className="space-y-2">
          <p className="text-sm text-fg leading-5">{data.summary}</p>
        </div>

        {/* View Mode Toggle */}
        {data.correlationGroups && data.correlationGroups.length > 0 && data.timeline && data.timeline.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'correlation' ? 'default' : 'outline'}
              size="sm"
              className="h-8 gap-2"
              onClick={() => setViewMode('correlation')}
            >
              <GitBranch className="h-4 w-4" />
              Correlation Groups
            </Button>
            <Button
              variant={viewMode === 'timeline' ? 'default' : 'outline'}
              size="sm"
              className="h-8 gap-2"
              onClick={() => setViewMode('timeline')}
            >
              <Clock className="h-4 w-4" />
              Timeline View
            </Button>
          </div>
        )}

        {/* Correlation Groups View */}
        {viewMode === 'correlation' && data.correlationGroups && data.correlationGroups.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-fg">
                CORRELATION GROUPS ({data.correlationGroups.length})
              </h4>
              <span className="text-xs text-fg-muted">Sorted by relevance</span>
            </div>
            {data.correlationGroups.map((group) => {
              const isExpanded = expandedGroups.has(group.id);
              return (
                <Card key={group.id} variant="bordered" className="border-border">
                  <div className="p-4 space-y-4">
                    {/* Group Header */}
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <h5 className="text-sm font-medium text-fg">{group.title}</h5>
                        <Badge variant="default" className="text-xs">
                          {group.eventCount} events
                        </Badge>
                        <Badge
                          variant="default"
                          className={`text-xs ${getRelevanceColor(group.relevanceScore)}`}
                        >
                          {group.relevanceScore}% relevant
                        </Badge>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-fg-muted" />
                      ) : (
                        <ChevronUp className="h-4 w-4 text-fg-muted" />
                      )}
                    </button>

                    {/* Group Description */}
                    <p className="text-sm text-fg-muted">{group.description}</p>
                    <p className="text-xs text-fg-muted flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {group.timeSpan}
                    </p>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="space-y-4 pt-4 border-t border-border">
                        {/* Why Correlated */}
                        <Card variant="bordered" className="bg-purple-500/5 border-purple-500/10">
                          <div className="p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4 text-purple-400" />
                              <h6 className="text-xs font-semibold text-fg">WHY THESE EVENTS ARE RELATED</h6>
                            </div>
                            <p className="text-xs text-fg-muted leading-4">{group.whyCorrelated}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              <span className="text-xs text-fg-muted">Based on events:</span>
                              {group.citations.slice(0, 3).map((id) => (
                                <code key={id} className="text-xs font-mono text-fg-muted bg-bg px-1.5 py-0.5 rounded">
                                  {id.substring(0, 8)}
                                </code>
                              ))}
                              {group.citations.length > 3 && (
                                <span className="text-xs text-fg-muted">+{group.citations.length - 3} more</span>
                              )}
                            </div>
                          </div>
                        </Card>

                        {/* Events */}
                        {group.events.map((event, idx) => (
                          <Card key={event.id} variant="bordered" className="border-border">
                            <div className="p-3 space-y-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <code className="text-xs font-mono bg-[#27272a] px-2 py-1 rounded text-fg">
                                      {event.action}
                                    </code>
                                    <Badge
                                      variant="default"
                                      className={
                                        event.status === 'success'
                                          ? 'border-[rgba(0,201,80,0.3)] bg-[rgba(0,201,80,0.1)] text-semantic-success h-[22px] px-2.5 py-0.5 rounded-lg text-xs'
                                          : 'border-[rgba(251,44,54,0.3)] bg-[rgba(251,44,54,0.1)] text-[#fb2c36] h-[22px] px-2.5 py-0.5 rounded-lg text-xs'
                                      }
                                    >
                                      {event.status}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-fg-muted">
                                    {event.actor} • {formatEventTime(event.timestamp)}
                                  </p>
                                  <p className="text-xs text-fg-muted font-mono">
                                    {event.resourceType} / {event.resourceId}
                                  </p>
                                </div>
                                {onViewEvent && (
                                  <Button variant="ghost" size="sm" onClick={() => onViewEvent(event.id)}>
                                    View
                                  </Button>
                                )}
                              </div>
                              <Card variant="bordered" className="bg-accent/50 border-border">
                                <div className="p-2 space-y-1">
                                  <p className="text-xs font-semibold text-fg">🔗 WHY RELEVANT</p>
                                  <p className="text-xs text-fg-muted leading-4">{event.whyRelevant}</p>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    <span className="text-xs text-fg-muted">Sources:</span>
                                    {event.sourceCitations.slice(0, 2).map((id) => (
                                      <code key={id} className="text-xs font-mono text-fg-muted bg-bg px-1.5 py-0.5 rounded">
                                        {id.substring(0, 8)}
                                      </code>
                                    ))}
                                  </div>
                                </div>
                              </Card>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Timeline View */}
        {viewMode === 'timeline' && data.timeline && data.timeline.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-fg">
                TIMELINE RECONSTRUCTION ({data.timeline.length} events)
              </h4>
              <span className="text-xs text-fg-muted">Chronological order</span>
            </div>
            <div className="h-[400px] overflow-y-auto space-y-4 pr-2">
              {data.timeline.map((event, idx) => (
                <div key={event.id} className="flex gap-4">
                  {/* Timeline Line */}
                  <div className="flex flex-col items-center">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${getSignificanceColor(event.significance)}`}>
                      <div className="h-2 w-2 rounded-full bg-fg" />
                    </div>
                    {idx < data.timeline.length - 1 && (
                      <div className="w-px h-full bg-border flex-1 min-h-[60px]" />
                    )}
                  </div>
                  {/* Event Card */}
                  <Card variant="bordered" className="border-border flex-1">
                    <div className="p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-fg-muted font-mono">{formatEventTime(event.timestamp)}</span>
                            <code className="text-xs font-mono bg-[#27272a] px-2 py-1 rounded text-fg">
                              {event.action}
                            </code>
                            <Badge
                              variant="default"
                              className={
                                event.status === 'success'
                                  ? 'border-[rgba(0,201,80,0.3)] bg-[rgba(0,201,80,0.1)] text-semantic-success h-[22px] px-2.5 py-0.5 rounded-lg text-xs'
                                  : 'border-[rgba(251,44,54,0.3)] bg-[rgba(251,44,54,0.1)] text-[#fb2c36] h-[22px] px-2.5 py-0.5 rounded-lg text-xs'
                              }
                            >
                              {event.status}
                            </Badge>
                            {event.significance === 'critical' && (
                              <Badge variant="default" className="bg-red-500/10 border-red-500/30 text-red-400 text-xs">
                                critical
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-fg-muted">
                            {event.actor} • {event.resourceType} / {event.resourceId}
                          </p>
                          <p className="text-xs text-fg-muted leading-4">{event.explanation}</p>
                          {event.relatedEventIds.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              <span className="text-xs text-fg-muted">→ Related to:</span>
                              {event.relatedEventIds.slice(0, 3).map((id) => (
                                <code key={id} className="text-xs font-mono text-fg-muted bg-bg px-1.5 py-0.5 rounded">
                                  {id.substring(0, 8)}
                                </code>
                              ))}
                            </div>
                          )}
                        </div>
                        {onViewEvent && (
                          <Button variant="ghost" size="sm" onClick={() => onViewEvent(event.id)}>
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Findings */}
        {data.keyFindings && data.keyFindings.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-fg">KEY FINDINGS</h4>
            {data.keyFindings.map((finding) => (
              <Card
                key={finding.id}
                variant="bordered"
                className={`${getSeverityColor(finding.severity)}`}
              >
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <h5 className="text-sm font-semibold text-fg">{finding.title}</h5>
                    <Badge variant="default" className="text-xs">
                      {finding.severity}
                    </Badge>
                    <Badge variant="default" className="text-xs">
                      {finding.eventCount} events
                    </Badge>
                  </div>
                  <p className="text-sm text-fg-muted leading-5">{finding.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="text-xs text-fg-muted">Based on events:</span>
                    {finding.citations.slice(0, 3).map((id) => (
                      <code key={id} className="text-xs font-mono text-fg-muted bg-bg px-1.5 py-0.5 rounded">
                        {id.substring(0, 8)}
                      </code>
                    ))}
                    {finding.citations.length > 3 && (
                      <span className="text-xs text-fg-muted">+{finding.citations.length - 3} more</span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Provenance */}
        <div className="space-y-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-fg">INVESTIGATION PROVENANCE</h4>
            {onViewSourceEvents && data.provenance.sourceEventIds.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-2"
                onClick={() => onViewSourceEvents(data.provenance.sourceEventIds)}
              >
                <Eye className="h-4 w-4" />
                View All Source Events
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-fg-muted" />
                <span className="text-xs text-fg-muted">Time Range</span>
              </div>
              <p className="text-sm text-fg">{data.provenance.timeRange}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-fg-muted" />
                <span className="text-xs text-fg-muted">Events Analyzed</span>
              </div>
              <p className="text-sm text-fg">{data.provenance.totalEventsAnalyzed}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-fg-muted" />
                <span className="text-xs text-fg-muted">Correlation Model</span>
              </div>
              <p className="text-sm text-fg">{data.provenance.correlationModel}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-fg-muted" />
                <span className="text-xs text-fg-muted">Source Event IDs</span>
              </div>
              <p className="text-sm text-fg">{data.provenance.sourceEventIds.length} events</p>
            </div>
          </div>
          {data.provenance.filters.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-fg-muted" />
                <span className="text-xs text-fg-muted">Active Filters</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.provenance.filters.map((filter, idx) => (
                  <Badge key={idx} variant="default" className="text-xs">
                    {filter}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}


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
} from '@audit-log-and-activity-tracking-saas/ui';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Info,
  AlertCircle,
  Loader2,
  Ban,
  Eye,
  Clock,
  Filter,
  FileText,
} from 'lucide-react';

export type AISummaryData = {
  summary: string;
  patterns?: {
    id: string;
    title: string;
    description: string;
    eventCount: number;
    severity?: 'low' | 'medium' | 'high';
  }[];
  changes?: {
    id: string;
    description: string;
    eventCount: number;
  }[];
  provenance: {
    timeRange: string;
    filters: string[];
    totalEventsAnalyzed: number;
    sourceEventIds?: string[];
  };
};

interface AISummaryPanelProps {
  data?: AISummaryData;
  loading?: boolean;
  error?: boolean;
  isEmpty?: boolean;
  isDisabled?: boolean;
  onViewSourceEvents?: (eventIds?: string[]) => void;
  onGenerate?: () => void;
}

export function AISummaryPanel({
  data,
  loading = false,
  error = false,
  isEmpty = false,
  isDisabled = false,
  onViewSourceEvents,
  onGenerate,
}: AISummaryPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Disabled State
  if (isDisabled) {
    return (
      <Card variant="bordered" className="border-border bg-card/50">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
              <Ban className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-muted-foreground">AI Summary</h3>
                <Badge variant="default" size="sm">
                  Disabled
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                AI investigation assistant is not available for your account. Contact your administrator to enable this feature.
              </p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Loading State
  if (loading) {
    return (
      <Card variant="bordered" className="border-border bg-card/50">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 shrink-0">
              <Loader2 className="h-4 w-4 text-purple-500 animate-spin" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">AI Summary</h3>
                <Badge variant="default" size="sm" className="bg-purple-500/10 border-purple-500/20 text-purple-400">
                  AI-generated
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Analyzing audit events and identifying patterns...
              </p>
              <div className="space-y-2 mt-3">
                <div className="h-3 bg-muted rounded animate-pulse" />
                <div className="h-3 bg-muted rounded animate-pulse w-4/5" />
                <div className="h-3 bg-muted rounded animate-pulse w-3/5" />
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Error State
  if (error) {
    return (
      <Card variant="bordered" className="border-border bg-card/50">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 shrink-0">
              <AlertCircle className="h-4 w-4 text-red-500" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">AI Summary</h3>
                <Badge variant="default" size="sm" className="bg-purple-500/10 border-purple-500/20 text-purple-400">
                  AI-generated
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Unable to generate AI summary. The audit log data is still available below. Try again or contact support if the issue persists.
              </p>
              {onGenerate && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2 h-7 text-xs"
                  onClick={onGenerate}
                >
                  Try Again
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Empty State
  if (isEmpty || !data) {
    return (
      <Card variant="bordered" className="border-border bg-card/50">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 shrink-0">
              <Sparkles className="h-4 w-4 text-purple-500" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">AI Summary</h3>
                <Badge variant="default" size="sm" className="bg-purple-500/10 border-purple-500/20 text-purple-400">
                  AI-generated
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                No audit events available to analyze. Apply filters or select a different time range.
              </p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Default State with Data
  return (
    <TooltipProvider>
      <Card variant="bordered" className="border-border bg-card/50">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-start gap-3 flex-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 shrink-0">
                <Sparkles className="h-4 w-4 text-purple-500" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium">AI Summary</h3>
                  <Badge variant="default" size="sm" className="bg-purple-500/10 border-purple-500/20 text-purple-400">
                    AI-generated
                  </Badge>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-4 w-4 p-0">
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p className="text-xs">
                        This summary is AI-generated based on your audit events. It's read-only and cannot trigger actions. Always verify findings with source events.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-xs text-muted-foreground">
                  Read-only investigation assistant
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>

          {isExpanded && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="space-y-2">
                <p className="text-sm leading-relaxed">
                  {data.summary}
                </p>
              </div>

              {/* Patterns */}
              {data.patterns && data.patterns.length > 0 && (
                <>
                  <Separator className="bg-border" />
                  <div className="space-y-3">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Identified Patterns
                    </h4>
                    <div className="space-y-2">
                      {data.patterns.map((pattern) => (
                        <div
                          key={pattern.id}
                          className="rounded-lg border border-border bg-background/50 p-3 space-y-1"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium">{pattern.title}</p>
                            <div className="flex items-center gap-2 shrink-0">
                              {pattern.severity && (
                                <Badge
                                  variant="default"
                                  size="sm"
                                  className={
                                    pattern.severity === 'high'
                                      ? 'bg-red-500/10 border-red-500/20 text-red-400'
                                      : pattern.severity === 'medium'
                                      ? 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                                      : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                  }
                                >
                                  {pattern.severity}
                                </Badge>
                              )}
                              <Badge variant="default" size="sm">
                                {pattern.eventCount} events
                              </Badge>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {pattern.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Changes */}
              {data.changes && data.changes.length > 0 && (
                <>
                  <Separator className="bg-border" />
                  <div className="space-y-3">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      What Changed
                    </h4>
                    <div className="space-y-2">
                      {data.changes.map((change) => (
                        <div key={change.id} className="flex items-start gap-2">
                          <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 shrink-0 mt-0.5">
                            <FileText className="h-3 w-3 text-primary" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <p className="text-xs">{change.description}</p>
                            <p className="text-xs text-muted-foreground">
                              Based on {change.eventCount} events
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Provenance */}
              <Separator className="bg-border" />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Source Information
                  </h4>
                  {onViewSourceEvents && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 text-xs gap-1.5"
                      onClick={() => onViewSourceEvents(data.provenance.sourceEventIds)}
                    >
                      <Eye className="h-3 w-3" />
                      View Source Events
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-start gap-2 text-xs">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-muted-foreground">Time Range</p>
                      <p className="font-medium">{data.provenance.timeRange}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-xs">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-muted-foreground">Events Analyzed</p>
                      <p className="font-medium">
                        {data.provenance.totalEventsAnalyzed.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                {data.provenance.filters.length > 0 && (
                  <div className="flex items-start gap-2 text-xs">
                    <Filter className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-muted-foreground mb-1">Active Filters</p>
                      <div className="flex flex-wrap gap-1">
                        {data.provenance.filters.map((filter, index) => (
                          <Badge key={index} variant="default" size="sm">
                            {filter}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Disclaimer */}
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground italic">
                  AI summaries may be incomplete. Verify with source events.
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </TooltipProvider>
  );
}


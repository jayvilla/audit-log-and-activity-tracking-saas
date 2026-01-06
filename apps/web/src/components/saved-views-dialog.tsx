'use client';

import { useState } from 'react';
import {
  Button,
  Input,
  Label,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
  Card,
  Separator,
} from '@audit-log-and-activity-tracking-saas/ui';
import {
  Save,
  Info,
  Trash2,
  Eye,
  Calendar,
  Filter,
  User,
  Activity,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import type { SavedView } from '../lib/api-client';

export type SavedViewFilters = {
  search?: string;
  dateRange?: string;
  startDate?: string;
  endDate?: string;
  actors?: string[];
  actions?: string[];
  resources?: string[];
  statuses?: string[];
  actor?: string;
  resourceType?: string;
  resourceId?: string;
  ip?: string;
};

interface SavedViewsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  savedViews: SavedView[];
  currentFilters: SavedViewFilters;
  onSaveView: (name: string, description?: string) => void;
  onLoadView: (view: SavedView) => void;
  onDeleteView: (id: string) => void;
  isSaving?: boolean;
}

export function SavedViewsDialog({
  open,
  onOpenChange,
  savedViews,
  currentFilters,
  onSaveView,
  onLoadView,
  onDeleteView,
  isSaving = false,
}: SavedViewsDialogProps) {
  const [mode, setMode] = useState<'list' | 'create'>('list');
  const [newViewName, setNewViewName] = useState('');
  const [newViewDescription, setNewViewDescription] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewToDelete, setViewToDelete] = useState<SavedView | null>(null);

  const hasActiveFilters = Object.values(currentFilters).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== '';
  });

  const handleSave = () => {
    if (!newViewName.trim()) return;
    onSaveView(newViewName, newViewDescription || undefined);
    setNewViewName('');
    setNewViewDescription('');
    setMode('list');
  };

  const handleLoad = (view: SavedView) => {
    onLoadView(view);
    onOpenChange(false);
  };

  const handleDeleteClick = (view: SavedView, e: React.MouseEvent) => {
    e.stopPropagation();
    setViewToDelete(view);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (viewToDelete) {
      onDeleteView(viewToDelete.id);
      setDeleteDialogOpen(false);
      setViewToDelete(null);
    }
  };

  const getFilterSummary = (filters: SavedViewFilters) => {
    const parts: string[] = [];

    if (filters.search) parts.push(`Search: "${filters.search}"`);
    if (filters.dateRange) parts.push(`Date: ${filters.dateRange}`);
    if (filters.actors && filters.actors.length > 0)
      parts.push(`${filters.actors.length} actor${filters.actors.length !== 1 ? 's' : ''}`);
    if (filters.actions && filters.actions.length > 0)
      parts.push(`${filters.actions.length} action${filters.actions.length !== 1 ? 's' : ''}`);
    if (filters.resources && filters.resources.length > 0)
      parts.push(`${filters.resources.length} resource${filters.resources.length !== 1 ? 's' : ''}`);
    if (filters.statuses && filters.statuses.length > 0)
      parts.push(`${filters.statuses.length} status${filters.statuses.length !== 1 ? 'es' : ''}`);
    if (filters.actor) parts.push(`Actor: ${filters.actor}`);
    if (filters.resourceType) parts.push(`Resource Type: ${filters.resourceType}`);
    if (filters.resourceId) parts.push(`Resource ID: ${filters.resourceId}`);
    if (filters.ip) parts.push(`IP: ${filters.ip}`);

    return parts.length > 0 ? parts.join(' • ') : 'No filters';
  };

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] bg-bg border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="h-5 w-5 text-accent" />
              {mode === 'list' ? 'Saved Views' : 'Create Saved View'}
            </DialogTitle>
            <DialogDescription>
              {mode === 'list'
                ? 'Quickly apply commonly used filter combinations'
                : 'Save your current filters as a reusable view'}
            </DialogDescription>
          </DialogHeader>

          {mode === 'list' ? (
            <div className="space-y-4 py-4">
              {/* Info Notice */}
              <Card variant="bordered" className="p-3 bg-[rgba(43,127,255,0.05)] border-[rgba(43,127,255,0.2)]">
                <div className="flex gap-2">
                  <Info className="h-4 w-4 text-semantic-info flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-semantic-info">Read-Only Execution</p>
                    <p className="text-xs text-fg-muted mt-0.5">
                      Saved views are read-only filter presets. Loading a view will apply its filters to the audit log table.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Current Filters */}
              {hasActiveFilters && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-fg">Current Filters</Label>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setMode('create')}
                      className="gap-2 h-8"
                    >
                      <Save className="h-3 w-3" />
                      Save as View
                    </Button>
                  </div>
                  <Card variant="bordered" className="p-3 border-border bg-[#18181b]">
                    <p className="text-xs text-fg-muted">{getFilterSummary(currentFilters)}</p>
                  </Card>
                </div>
              )}

              <Separator className="bg-border" />

              {/* Saved Views List */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-fg">Saved Views ({savedViews.length})</Label>

                {savedViews.length === 0 ? (
                  <Card variant="bordered" className="p-8 border-border">
                    <div className="flex flex-col items-center text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 mb-3">
                        <Eye className="h-6 w-6 text-accent" />
                      </div>
                      <p className="text-sm font-medium mb-1 text-fg">No saved views yet</p>
                      <p className="text-xs text-fg-muted mb-4">
                        Save your filter combinations for quick access
                      </p>
                      {hasActiveFilters && (
                        <Button variant="secondary" size="sm" onClick={() => setMode('create')} className="gap-2">
                          <Save className="h-3 w-3" />
                          Save Current Filters
                        </Button>
                      )}
                    </div>
                  </Card>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {savedViews.map((view) => (
                      <Card
                        key={view.id}
                        variant="bordered"
                        className="p-3 border-border hover:bg-[#18181b] cursor-pointer transition-colors group"
                        onClick={() => handleLoad(view)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 shrink-0">
                            <Filter className="h-5 w-5 text-accent" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-fg">{view.name}</p>
                                {view.description && (
                                  <p className="text-xs text-fg-muted mt-0.5">{view.description}</p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => handleDeleteClick(view, e)}
                              >
                                <Trash2 className="h-3 w-3 text-[#fb2c36]" />
                              </Button>
                            </div>
                            <p className="text-xs text-fg-muted mt-2 truncate">
                              {getFilterSummary(view.filters)}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex items-center gap-1 text-xs text-fg-muted">
                                <Activity className="h-3 w-3" />
                                Used {view.useCount} times
                              </div>
                              {view.lastUsed && (
                                <div className="flex items-center gap-1 text-xs text-fg-muted">
                                  <Calendar className="h-3 w-3" />
                                  Last used {new Date(view.lastUsed).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="viewName" className="text-fg">
                  View Name <span className="text-[#fb2c36]">*</span>
                </Label>
                <Input
                  id="viewName"
                  placeholder="e.g., Failed Logins Last Week"
                  value={newViewName}
                  onChange={(e) => setNewViewName(e.target.value)}
                  className="bg-bg border-border text-fg"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="viewDescription" className="text-fg">
                  Description <span className="text-fg-muted">(optional)</span>
                </Label>
                <Input
                  id="viewDescription"
                  placeholder="e.g., Monitor failed login attempts from the past 7 days"
                  value={newViewDescription}
                  onChange={(e) => setNewViewDescription(e.target.value)}
                  className="bg-bg border-border text-fg"
                />
              </div>

              {/* Preview Filters */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-fg">Filters to Save</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5">
                        <Info className="h-3 w-3 text-fg-muted" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p className="text-xs">
                        These are your currently active filters. They will be saved exactly as configured and can be reapplied later.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Card variant="bordered" className="p-4 border-border bg-[#18181b]">
                  {hasActiveFilters ? (
                    <div className="space-y-2">
                      {currentFilters.search && (
                        <div className="flex items-center gap-2">
                          <Filter className="h-3 w-3 text-fg-muted" />
                          <span className="text-xs text-fg-muted">Search: </span>
                          <Badge variant="outline" className="text-xs">
                            "{currentFilters.search}"
                          </Badge>
                        </div>
                      )}
                      {currentFilters.dateRange && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-fg-muted" />
                          <span className="text-xs text-fg-muted">Date Range: </span>
                          <Badge variant="outline" className="text-xs">
                            {currentFilters.dateRange}
                          </Badge>
                        </div>
                      )}
                      {currentFilters.actors && currentFilters.actors.length > 0 && (
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-fg-muted" />
                          <span className="text-xs text-fg-muted">Actors: </span>
                          <Badge variant="outline" className="text-xs">
                            {currentFilters.actors.length} selected
                          </Badge>
                        </div>
                      )}
                      {currentFilters.actions && currentFilters.actions.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Activity className="h-3 w-3 text-fg-muted" />
                          <span className="text-xs text-fg-muted">Actions: </span>
                          <Badge variant="outline" className="text-xs">
                            {currentFilters.actions.length} selected
                          </Badge>
                        </div>
                      )}
                      {currentFilters.statuses && currentFilters.statuses.length > 0 && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-3 w-3 text-fg-muted" />
                          <span className="text-xs text-fg-muted">Statuses: </span>
                          <Badge variant="outline" className="text-xs">
                            {currentFilters.statuses.length} selected
                          </Badge>
                        </div>
                      )}
                      {currentFilters.actor && (
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-fg-muted" />
                          <span className="text-xs text-fg-muted">Actor: </span>
                          <Badge variant="outline" className="text-xs">
                            {currentFilters.actor}
                          </Badge>
                        </div>
                      )}
                      {currentFilters.resourceType && (
                        <div className="flex items-center gap-2">
                          <Filter className="h-3 w-3 text-fg-muted" />
                          <span className="text-xs text-fg-muted">Resource Type: </span>
                          <Badge variant="outline" className="text-xs">
                            {currentFilters.resourceType}
                          </Badge>
                        </div>
                      )}
                      {currentFilters.resourceId && (
                        <div className="flex items-center gap-2">
                          <Filter className="h-3 w-3 text-fg-muted" />
                          <span className="text-xs text-fg-muted">Resource ID: </span>
                          <Badge variant="outline" className="text-xs">
                            {currentFilters.resourceId}
                          </Badge>
                        </div>
                      )}
                      {currentFilters.ip && (
                        <div className="flex items-center gap-2">
                          <Filter className="h-3 w-3 text-fg-muted" />
                          <span className="text-xs text-fg-muted">IP: </span>
                          <Badge variant="outline" className="text-xs">
                            {currentFilters.ip}
                          </Badge>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-fg-muted">No active filters</p>
                  )}
                </Card>
              </div>
            </div>
          )}

          <DialogFooter>
            {mode === 'list' ? (
              <Button variant="secondary" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setMode('list');
                    setNewViewName('');
                    setNewViewDescription('');
                  }}
                  disabled={isSaving}
                >
                  Back
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!newViewName.trim() || !hasActiveFilters || isSaving}
                  className="gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save View
                    </>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete saved view?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the saved view <strong>"{viewToDelete?.name}"</strong>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-[#fb2c36] text-white hover:bg-[#fb2c36]/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}


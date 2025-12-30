'use client';

import { useState, useEffect } from 'react';
import { getApiKeys, createApiKey, revokeApiKey, type ApiKey, type CreateApiKeyRequest } from '../../../lib/api-client';
import { usePageTitle } from '../../../lib/use-page-title';
import {
  Card,
  CardContent,
  Button,
  Input,
  Modal,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Skeleton,
} from '@audit-log-and-activity-tracking-saas/ui';
import { DropdownMenu, DropdownMenuItem } from '../../../components/ui/dropdown-menu';
import { cn } from '../../../lib/utils';

export default function ApiKeysPage() {
  usePageTitle('API Keys');
  
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKey | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyData, setNewKeyData] = useState<{ key: string; name: string } | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      setIsLoading(true);
      const keys = await getApiKeys();
      setApiKeys(keys);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      setError('Name is required');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);
      const response = await createApiKey({ name: newKeyName.trim() });
      setNewKeyData({ key: response.key, name: response.name });
      setNewKeyName('');
      await loadApiKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeKey = async () => {
    if (!keyToRevoke) return;

    try {
      setIsRevoking(true);
      setError(null);
      await revokeApiKey(keyToRevoke.id);
      setIsRevokeModalOpen(false);
      setKeyToRevoke(null);
      await loadApiKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke API key');
    } finally {
      setIsRevoking(false);
    }
  };

  const handleCopyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      // You could add a toast notification here
    } catch (err) {
      setError('Failed to copy key to clipboard');
    }
  };

  const getKeyStatus = (key: ApiKey): { label: string; variant: 'default' | 'accent' | 'accent2' | 'muted' } => {
    if (key.expiresAt) {
      const expiresAt = new Date(key.expiresAt);
      const now = new Date();
      if (expiresAt < now) {
        return { label: 'Expired', variant: 'accent2' };
      }
      return { label: 'Active', variant: 'accent2' };
    }
    return { label: 'Active', variant: 'accent2' };
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setNewKeyName('');
    setNewKeyData(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--foreground))]">API Keys</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Manage your API keys for programmatic access</p>
        </div>
        <Button
          variant="default"
          onClick={() => setIsCreateModalOpen(true)}
          aria-label="Create new API key"
        >
          Create API Key
        </Button>
      </div>

      {error && (
        <Card variant="bordered" className="border-[hsl(var(--accent2))]/20 bg-[hsl(var(--accent2))]/10">
          <CardContent className="p-4">
            <p className="text-sm text-[hsl(var(--accent2))]">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* API Keys Table */}
      <Card variant="bordered" className="overflow-hidden">
        {isLoading ? (
          <CardContent className="p-8">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        ) : apiKeys.length === 0 ? (
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16 px-6" role="status" aria-live="polite">
              <svg
                className="w-12 h-12 text-[hsl(var(--muted-foreground))] mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
              <p className="text-sm font-medium text-[hsl(var(--muted-foreground))] mb-4">No API keys found</p>
              <Button
                variant="default"
                onClick={() => setIsCreateModalOpen(true)}
                aria-label="Create your first API key"
              >
                Create your first API key
              </Button>
            </div>
          </CardContent>
        ) : (
          <div className="overflow-auto">
            <Table role="table" aria-label="API keys">
              <TableHeader>
                <TableRow hover={false}>
                  <TableHead className="min-w-[200px] text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider" scope="col">
                    Name
                  </TableHead>
                  <TableHead className="min-w-[150px] text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider" scope="col">
                    Prefix
                  </TableHead>
                  <TableHead className="min-w-[180px] text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider" scope="col">
                    Created At
                  </TableHead>
                  <TableHead className="min-w-[180px] text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider" scope="col">
                    Last Used At
                  </TableHead>
                  <TableHead className="min-w-[100px] text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider" scope="col">
                    Status
                  </TableHead>
                  <TableHead className="min-w-[80px] text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider text-right" scope="col">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => {
                  const status = getKeyStatus(key);
                  return (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium text-[hsl(var(--foreground))]">{key.name}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-[hsl(var(--muted))] px-2 py-1 rounded text-[hsl(var(--foreground))] font-mono">
                          {key.keyPrefix}...
                        </code>
                      </TableCell>
                      <TableCell className="text-[hsl(var(--muted-foreground))]">{formatDate(key.createdAt)}</TableCell>
                      <TableCell className="text-[hsl(var(--muted-foreground))]">{formatDate(key.lastUsedAt)}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant} size="sm">
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu
                          trigger={
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={`Actions for API key ${key.name}`}
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                                />
                              </svg>
                            </Button>
                          }
                        >
                          <DropdownMenuItem
                            onClick={() => {
                              setKeyToRevoke(key);
                              setIsRevokeModalOpen(true);
                            }}
                            className="text-[hsl(var(--accent2))]"
                          >
                            Revoke Key
                          </DropdownMenuItem>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Create API Key Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        title={newKeyData ? 'API Key Created' : 'Create API Key'}
        size="md"
      >
        {newKeyData ? (
          <div className="space-y-4">
            <Card variant="bordered" className="border-[hsl(var(--accent2))]/20 bg-[hsl(var(--accent2))]/10">
              <CardContent className="p-4">
                <p className="text-sm text-[hsl(var(--foreground))] font-medium mb-2">⚠️ Important: Save this key now</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  You won't be able to see this key again. Make sure to copy it and store it securely.
                </p>
              </CardContent>
            </Card>
            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">API Key</label>
              <Card variant="bordered" className="overflow-hidden">
                <div className="bg-[hsl(var(--muted))]/30 px-4 py-2 text-sm font-medium text-[hsl(var(--muted-foreground))]">
                  API Key
                </div>
                <div className="p-4 bg-[hsl(var(--card))]">
                  <div className="flex gap-2 items-center">
                    <code className="flex-1 text-sm text-[hsl(var(--foreground))] font-mono break-all">
                      {newKeyData.key}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyKey(newKeyData.key)}
                      aria-label="Copy API key to clipboard"
                    >
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
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      Copy
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={handleCloseCreateModal}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="key-name" className="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
                Name
              </label>
              <Input
                id="key-name"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., Production API Key"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateKey();
                  }
                }}
              />
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                Give your API key a descriptive name to identify it later
              </p>
            </div>
            {error && (
              <Card variant="bordered" className="border-[hsl(var(--accent2))]/20 bg-[hsl(var(--accent2))]/10">
                <CardContent className="p-3">
                  <p className="text-sm text-[hsl(var(--accent2))]">{error}</p>
                </CardContent>
              </Card>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleCloseCreateModal}>
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={handleCreateKey}
                disabled={isCreating}
              >
                {isCreating && (
                  <svg
                    className="mr-2 h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                )}
                {isCreating ? 'Creating...' : 'Create Key'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Revoke Confirmation Modal */}
      <Modal
        isOpen={isRevokeModalOpen}
        onClose={() => {
          setIsRevokeModalOpen(false);
          setKeyToRevoke(null);
          setError(null);
        }}
        title="Revoke API Key"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-[hsl(var(--foreground))]">
            Are you sure you want to revoke the API key <strong>{keyToRevoke?.name}</strong>?
          </p>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            This action cannot be undone. Any applications using this key will stop working immediately.
          </p>
          {error && (
            <Card variant="bordered" className="border-[hsl(var(--accent2))]/20 bg-[hsl(var(--accent2))]/10">
              <CardContent className="p-3">
                <p className="text-sm text-[hsl(var(--accent2))]">{error}</p>
              </CardContent>
            </Card>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsRevokeModalOpen(false);
                setKeyToRevoke(null);
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="accent2"
              onClick={handleRevokeKey}
              disabled={isRevoking}
            >
              {isRevoking && (
                <svg
                  className="mr-2 h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
              {isRevoking ? 'Revoking...' : 'Revoke Key'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

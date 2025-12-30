'use client';

import { useState, useEffect } from 'react';
import { getApiKeys, createApiKey, revokeApiKey, type ApiKey, type CreateApiKeyRequest } from '../../../lib/api-client';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Modal } from '../../../components/ui/modal';
import { Badge } from '../../../components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/table';
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '../../../components/ui/dropdown-menu';

export default function ApiKeysPage() {
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

  const getKeyStatus = (key: ApiKey): { label: string; variant: 'default' | 'success' | 'destructive' | 'secondary' } => {
    if (key.expiresAt) {
      const expiresAt = new Date(key.expiresAt);
      const now = new Date();
      if (expiresAt < now) {
        return { label: 'Expired', variant: 'destructive' };
      }
      return { label: 'Active', variant: 'success' };
    }
    return { label: 'Active', variant: 'success' };
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
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-fg">API Keys</h1>
            <p className="text-sm text-muted mt-1">Manage your API keys for programmatic access</p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)} aria-label="Create new API key">
            Create API Key
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger">
          {error}
        </div>
      )}

      <div className="bg-card rounded-lg border border-border overflow-hidden flex-1 flex flex-col">
        {isLoading ? (
          <div className="p-8 text-center text-muted" role="status" aria-live="polite">
            Loading API keys...
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="p-8 text-center text-muted" role="status" aria-live="polite">
            <p className="mb-4">No API keys found</p>
            <Button onClick={() => setIsCreateModalOpen(true)} aria-label="Create your first API key">
              Create your first API key
            </Button>
          </div>
        ) : (
          <div className="overflow-auto flex-1">
            <Table role="table" aria-label="API keys">
              <TableHeader>
                <TableRow hover={false}>
                  <TableHead className="min-w-[200px] text-xs font-semibold text-muted uppercase tracking-wider" scope="col">
                    Name
                  </TableHead>
                  <TableHead className="min-w-[150px] text-xs font-semibold text-muted uppercase tracking-wider" scope="col">
                    Prefix
                  </TableHead>
                  <TableHead className="min-w-[180px] text-xs font-semibold text-muted uppercase tracking-wider" scope="col">
                    Created At
                  </TableHead>
                  <TableHead className="min-w-[180px] text-xs font-semibold text-muted uppercase tracking-wider" scope="col">
                    Last Used At
                  </TableHead>
                  <TableHead className="min-w-[100px] text-xs font-semibold text-muted uppercase tracking-wider" scope="col">
                    Status
                  </TableHead>
                  <TableHead className="min-w-[80px] text-xs font-semibold text-muted uppercase tracking-wider text-right" scope="col">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => {
                  const status = getKeyStatus(key);
                  return (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded text-fg">
                          {key.keyPrefix}...
                        </code>
                      </TableCell>
                      <TableCell className="text-muted">{formatDate(key.createdAt)}</TableCell>
                      <TableCell className="text-muted">{formatDate(key.lastUsedAt)}</TableCell>
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
                            className="text-destructive"
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
      </div>

      {/* Create API Key Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        title={newKeyData ? 'API Key Created' : 'Create API Key'}
        size="md"
      >
        {newKeyData ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-sm text-fg font-medium mb-2">⚠️ Important: Save this key now</p>
              <p className="text-xs text-muted">
                You won't be able to see this key again. Make sure to copy it and store it securely.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-fg mb-2">API Key</label>
              <div className="flex gap-2">
                <Input
                  value={newKeyData.key}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  variant="secondary"
                  onClick={() => handleCopyKey(newKeyData.key)}
                  aria-label="Copy API key to clipboard"
                >
                  Copy
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="secondary"
                onClick={handleCloseCreateModal}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="key-name" className="block text-sm font-medium text-fg mb-2">
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
              <p className="mt-1 text-xs text-muted">
                Give your API key a descriptive name to identify it later
              </p>
            </div>
            {error && (
              <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-sm text-danger">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="secondary" onClick={handleCloseCreateModal}>
                Cancel
              </Button>
              <Button onClick={handleCreateKey} loading={isCreating}>
                Create Key
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
          <p className="text-sm text-fg">
            Are you sure you want to revoke the API key <strong>{keyToRevoke?.name}</strong>?
          </p>
          <p className="text-xs text-muted">
            This action cannot be undone. Any applications using this key will stop working immediately.
          </p>
          {error && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-sm text-danger">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsRevokeModalOpen(false);
                setKeyToRevoke(null);
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevokeKey}
              loading={isRevoking}
            >
              Revoke Key
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

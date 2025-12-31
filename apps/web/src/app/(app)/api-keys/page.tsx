'use client';

import { useState, useEffect } from 'react';
import {
  getApiKeys,
  createApiKey,
  revokeApiKey,
  type ApiKey,
  type CreateApiKeyRequest,
  type CreateApiKeyResponse,
} from '../../../lib/api-client';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
} from '@audit-log-and-activity-tracking-saas/ui';
import {
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';

export default function ApiKeysPage() {
  usePageTitle('API Keys');

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadKeys() {
      setIsLoading(true);
      try {
        const apiKeys = await getApiKeys();
        setKeys(apiKeys);
      } catch (error) {
        console.error('Failed to load API keys:', error);
        setError('Failed to load API keys');
      } finally {
        setIsLoading(false);
      }
    }

    loadKeys();
  }, []);

  const toggleKeyVisibility = (keyId: string) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId);
    } else {
      newVisible.add(keyId);
    }
    setVisibleKeys(newVisible);
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      setError('Key name is required');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const request: CreateApiKeyRequest = {
        name: newKeyName.trim(),
      };
      const response = await createApiKey(request);
      setGeneratedKey(response.key);
      setNewKeyName('');
      
      // Reload keys list
      const apiKeys = await getApiKeys();
      setKeys(apiKeys);
    } catch (err: any) {
      setError(err.message || 'Failed to create API key');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    try {
      await revokeApiKey(keyId);
      const apiKeys = await getApiKeys();
      setKeys(apiKeys);
    } catch (err: any) {
      setError(err.message || 'Failed to revoke API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getKeyDisplay = (key: ApiKey) => {
    const isVisible = visibleKeys.has(key.id);
    if (isVisible) {
      // In a real app, you'd store the full key when it's created
      return `${key.keyPrefix}•••••••••••••••••`;
    }
    return `${key.keyPrefix}•••••••••••••••••`;
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
          <h2 className="text-2xl font-semibold text-fg">API Keys</h2>
          <p className="text-sm text-fg-muted mt-1">
            Manage API keys for programmatic access
          </p>
        </div>
        <Button
          size="sm"
          variant="primary"
          className="gap-2"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="h-4 w-4" />
          Create API Key
        </Button>
      </div>

      {/* Warning */}
      <Card variant="bordered" className="p-4 bg-accent-10 border-accent-30">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-fg">Keep your API keys secure</p>
            <p className="text-sm text-fg-muted">
              API keys provide full access to your account. Never share them publicly or commit them to version control.
            </p>
          </div>
        </div>
      </Card>

      {error && !showCreateModal && (
        <Card variant="bordered" className="p-4 bg-accent-10 border-accent-30">
          <p className="text-sm text-accent">{error}</p>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="bordered" className="p-4 border-border">
          <p className="text-sm text-fg-muted">Total Keys</p>
          <p className="text-2xl font-semibold mt-1 text-fg">{keys.length}</p>
        </Card>
        <Card variant="bordered" className="p-4 border-border">
          <p className="text-sm text-fg-muted">Active Keys</p>
          <p className="text-2xl font-semibold mt-1 text-fg">
            {keys.filter(k => !k.expiresAt || new Date(k.expiresAt) > new Date()).length}
          </p>
        </Card>
        <Card variant="bordered" className="p-4 border-border">
          <p className="text-sm text-fg-muted">Last Used</p>
          <p className="text-sm font-medium mt-1 text-fg">
            {keys.find(k => k.lastUsedAt) 
              ? new Date(keys.find(k => k.lastUsedAt)!.lastUsedAt!).toLocaleString()
              : 'Never'
            }
          </p>
        </Card>
      </div>

      {/* Table */}
      <Card variant="bordered" className="overflow-hidden border-border">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>API Key</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Used</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-fg-muted py-8">
                  No API keys found. Create your first API key to get started.
                </TableCell>
              </TableRow>
            ) : (
              keys.map((key) => {
                const isVisible = visibleKeys.has(key.id);
                const isExpired = key.expiresAt && new Date(key.expiresAt) < new Date();
                return (
                  <TableRow key={key.id} className="border-border">
                    <TableCell className="font-medium text-fg">{key.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-accent-10 px-2 py-1 rounded font-mono text-accent">
                          {getKeyDisplay(key)}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => toggleKeyVisibility(key.id)}
                        >
                          {isVisible ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(key.keyPrefix)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Badge variant="default" className="text-xs border-border">
                          read
                        </Badge>
                        <Badge variant="default" className="text-xs border-border">
                          write
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-fg-muted">
                      {new Date(key.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm text-fg-muted">
                      {key.lastUsedAt
                        ? new Date(key.lastUsedAt).toLocaleString()
                        : 'Never'
                      }
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="default"
                        className={
                          isExpired
                            ? 'border-gray-500/30 bg-gray-500/10 text-gray-500'
                            : 'border-semantic-success/30 bg-semantic-success/10 text-semantic-success'
                        }
                      >
                        {isExpired ? 'revoked' : 'active'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-500"
                        onClick={() => handleRevokeKey(key.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create Key Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-bg-card border-border">
          {!generatedKey ? (
            <>
              <DialogHeader>
                <DialogTitle>Create New API Key</DialogTitle>
                <DialogDescription>
                  Give your API key a descriptive name to help you identify it later.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="key-name">Key Name</Label>
                  <Input
                    id="key-name"
                    placeholder="e.g., Production Server"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="bg-bg-card border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Permissions</Label>
                  <div className="flex gap-2">
                    <Badge variant="default" className="cursor-pointer border-accent bg-accent-10 text-accent">
                      Read
                    </Badge>
                    <Badge variant="default" className="cursor-pointer border-accent bg-accent-10 text-accent">
                      Write
                    </Badge>
                  </div>
                </div>
                {error && <p className="text-sm text-accent">{error}</p>}
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => {
                  setShowCreateModal(false);
                  setError(null);
                  setNewKeyName('');
                }}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleCreateKey} disabled={isCreating} loading={isCreating}>
                  Create Key
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>API Key Created</DialogTitle>
                <DialogDescription>
                  Make sure to copy your API key now. You won't be able to see it again!
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Card variant="bordered" className="p-4 bg-accent-10 border-border">
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-sm font-mono break-all text-fg">{generatedKey}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(generatedKey)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
                <div className="rounded-lg bg-accent-10 border border-accent-30 p-3">
                  <div className="flex gap-2">
                    <AlertCircle className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-fg-muted">
                      Store this key securely. It provides full access to your account and cannot be recovered.
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="primary" onClick={() => {
                  setShowCreateModal(false);
                  setGeneratedKey(null);
                  setNewKeyName('');
                  setError(null);
                }}>
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


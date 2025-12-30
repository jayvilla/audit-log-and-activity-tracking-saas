'use client';

import { useState } from 'react';
import { usePageTitle } from '../../lib/use-page-title';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Input,
  Textarea,
  Select,
  Modal,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Skeleton,
} from '@audit-log-and-activity-tracking-saas/ui';

export default function UIDemoPage() {
  usePageTitle('UI Demo');
  
  const [modalOpen, setModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('option1');

  return (
    <div className="min-h-screen bg-[hsl(var(--bg))] p-8">
      <div className="mx-auto max-w-6xl space-y-12">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-[hsl(var(--foreground))]">Shared UI Components Demo</h1>
          <p className="text-[hsl(var(--muted-foreground))]">Token-based design system components from @audit-log-and-activity-tracking-saas/ui</p>
        </div>

        {/* Button Section */}
        <section>
          <h2 className="mb-4 text-2xl font-semibold text-[hsl(var(--foreground))]">Buttons</h2>
          <Card>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="mb-3 text-sm font-medium text-muted">Variants</h3>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="default">Default</Button>
                    <Button variant="accent">Accent</Button>
                    <Button variant="accent2">Accent 2</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                  </div>
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-medium text-muted">Sizes</h3>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button size="sm">Small</Button>
                    <Button size="md">Medium</Button>
                    <Button size="lg">Large</Button>
                  </div>
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-medium text-muted">States</h3>
                  <div className="flex flex-wrap gap-3">
                    <Button disabled>Disabled</Button>
                    <Button variant="accent2" disabled>
                      Disabled Accent
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Card Section */}
        <section>
          <h2 className="mb-4 text-2xl font-semibold text-[hsl(var(--foreground))]">Cards</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Default Card</CardTitle>
                <CardDescription>Card with default styling</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted">
                  This is the default card variant with border and background.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" size="sm">
                  Action
                </Button>
              </CardFooter>
            </Card>
            <Card variant="bordered">
              <CardHeader>
                <CardTitle>Bordered Card</CardTitle>
                <CardDescription>Card with border variant</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted">
                  This card uses the bordered variant styling.
                </p>
              </CardContent>
            </Card>
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Elevated Card</CardTitle>
                <CardDescription>Card with elevated variant</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted">
                  This card has shadow and border for elevation.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Badge Section */}
        <section>
          <h2 className="mb-4 text-2xl font-semibold text-[hsl(var(--foreground))]">Badges</h2>
          <Card>
            <CardContent className="space-y-6 pt-6">
              <div>
                <h3 className="mb-3 text-sm font-medium text-muted">Variants</h3>
                <div className="flex flex-wrap gap-3">
                  <Badge variant="default">Default</Badge>
                  <Badge variant="accent">Accent</Badge>
                  <Badge variant="accent2">Accent 2</Badge>
                  <Badge variant="muted">Muted</Badge>
                </div>
              </div>
              <div>
                <h3 className="mb-3 text-sm font-medium text-muted">Sizes</h3>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge size="sm">Small</Badge>
                  <Badge size="md">Medium</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Form Elements Section */}
        <section>
          <h2 className="mb-4 text-2xl font-semibold text-[hsl(var(--foreground))]">Form Elements</h2>
          <Card>
            <CardHeader>
              <CardTitle>Inputs</CardTitle>
              <CardDescription>Text input, textarea, and select components</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[hsl(var(--foreground))]">Text Input</label>
                <Input
                  placeholder="Enter text..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[hsl(var(--foreground))]">Input with Error</label>
                <Input error placeholder="This has an error" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[hsl(var(--foreground))]">Textarea</label>
                <Textarea placeholder="Enter longer text..." rows={4} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[hsl(var(--foreground))]">Select</label>
                <Select
                  value={selectValue}
                  onChange={(e) => setSelectValue(e.target.value)}
                >
                  <option value="option1">Option 1</option>
                  <option value="option2">Option 2</option>
                  <option value="option3">Option 3</option>
                </Select>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Button with Link Section */}
        <section>
          <h2 className="mb-4 text-2xl font-semibold text-[hsl(var(--foreground))]">Button as Link</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <Button href="/" variant="accent2">
                  Link Button
                </Button>
                <Button href="/" variant="outline">
                  Outline Link
                </Button>
                <Button href="/" variant="ghost">
                  Ghost Link
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Modal Section */}
        <section>
          <h2 className="mb-4 text-2xl font-semibold text-[hsl(var(--foreground))]">Modal</h2>
          <Card>
            <CardContent className="pt-6">
              <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
              <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Example Modal"
                size="md"
              >
                <p className="text-sm text-muted">
                  This is an accessible modal dialog. Press ESC to close or click
                  outside the modal.
                </p>
                <div className="mt-6 flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setModalOpen(false)}>Confirm</Button>
                </div>
              </Modal>
            </CardContent>
          </Card>
        </section>

        {/* Table Section */}
        <section>
          <h2 className="mb-4 text-2xl font-semibold text-[hsl(var(--foreground))]">Table</h2>
          <Card>
            <CardContent className="p-0 pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">John Doe</TableCell>
                    <TableCell>
                      <Badge variant="accent2">Active</Badge>
                    </TableCell>
                    <TableCell>Admin</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Jane Smith</TableCell>
                    <TableCell>
                      <Badge variant="default">Pending</Badge>
                    </TableCell>
                    <TableCell>User</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Bob Johnson</TableCell>
                    <TableCell>
                      <Badge variant="muted">Inactive</Badge>
                    </TableCell>
                    <TableCell>User</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        {/* Skeleton Section */}
        <section>
          <h2 className="mb-4 text-2xl font-semibold text-[hsl(var(--foreground))]">Skeleton</h2>
          <Card>
            <CardContent className="space-y-4 pt-6">
              <Skeleton className="h-12 w-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" variant="text" />
                <Skeleton className="h-4 w-[200px]" variant="text" />
              </div>
              <div className="flex gap-4">
                <Skeleton className="h-12 w-12" variant="circular" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-full" variant="text" />
                  <Skeleton className="h-4 w-3/4" variant="text" />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}


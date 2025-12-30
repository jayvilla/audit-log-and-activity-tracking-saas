'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '../lib/utils';
import { getMe, logout } from '../lib/api-client';
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from './ui/dropdown-menu';
import { Input } from './ui/input';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'member' | 'viewer';
  orgId: string;
}

interface AppShellProps {
  children: React.ReactNode;
  pageTitle?: string;
}

type NavigationItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  comingSoon?: boolean;
  roles: ('admin' | 'member' | 'viewer')[];
};

const allNavigationItems: NavigationItem[] = [
  { name: 'Audit Logs', href: '/audit-logs', icon: LogIcon, roles: ['admin', 'member', 'viewer'] },
  { name: 'API Keys', href: '/api-keys', icon: KeyIcon, roles: ['admin'] },
  { name: 'Webhooks', href: '/webhooks', icon: WebhookIcon, comingSoon: true, roles: ['admin'] },
  { name: 'Settings', href: '/settings', icon: SettingsIcon, roles: ['admin', 'member', 'viewer'] },
];

function getNavigationForRole(role: 'admin' | 'member' | 'viewer'): NavigationItem[] {
  return allNavigationItems.filter((item) => item.roles.includes(role));
}

export function AppShell({ children, pageTitle }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const meResponse = await getMe();
        if (!meResponse || !meResponse.user) {
          router.push('/login');
          return;
        }
        setUser(meResponse.user);
      } catch (error) {
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, [router]);

  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    }

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform duration-300 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo/Product Name */}
        <div className="flex h-16 items-center border-b border-border px-6">
          <Link href="/audit-logs" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
              <span className="text-sm font-bold text-white">AL</span>
            </div>
            <span className="text-lg font-semibold text-fg">AuditLog</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {getNavigationForRole(user.role).map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.comingSoon ? '#' : item.href}
                onClick={() => {
                  if (isMobile) {
                    setSidebarOpen(false);
                  }
                }}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-muted-2 text-fg'
                    : 'text-muted hover:bg-muted hover:text-fg',
                  item.comingSoon && 'cursor-not-allowed opacity-50'
                )}
              >
                <item.icon
                  className={cn(
                    'h-5 w-5 flex-shrink-0',
                    isActive ? 'text-accent' : 'text-muted group-hover:text-fg'
                  )}
                />
                <span className="flex-1">{item.name}</span>
                {item.comingSoon && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted">
                    Soon
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-16 items-center gap-4 border-b border-border bg-card px-4 lg:px-6">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden rounded-lg p-2 text-muted hover:bg-muted hover:text-fg"
            aria-label="Toggle sidebar"
          >
            <MenuIcon className="h-5 w-5" />
          </button>

          {/* Page title */}
          <h1 className="flex-1 text-lg font-semibold text-fg">
            {pageTitle || getPageTitle(pathname)}
          </h1>

          {/* Search input */}
          <div className="hidden md:block">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                type="search"
                placeholder="Search..."
                className="w-64 pl-9"
                disabled
              />
            </div>
          </div>

          {/* User menu */}
          <DropdownMenu
            trigger={
              <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-medium text-white">
                  {user.email.charAt(0).toUpperCase()}
                </div>
                <div className="hidden text-left md:block">
                  <div className="text-xs font-medium text-fg">{user.email}</div>
                  <div className="text-xs text-muted capitalize">{user.role}</div>
                </div>
                <ChevronDownIcon className="hidden h-4 w-4 text-muted md:block" />
              </button>
            }
            align="right"
          >
            <div className="px-3 py-2">
              <div className="text-xs font-medium text-fg">{user.email}</div>
              <div className="text-xs text-muted capitalize">{user.role}</div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
          </DropdownMenu>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

function getPageTitle(pathname: string | null): string {
  if (!pathname) return 'Dashboard';
  const route = allNavigationItems.find((item) => pathname === item.href || pathname.startsWith(item.href + '/'));
  return route?.name || 'Dashboard';
}

// Icons
function LogIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function KeyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
      />
    </svg>
  );
}

function WebhookIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}


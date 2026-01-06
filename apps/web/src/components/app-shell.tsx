'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '../lib/utils';
import { getMe, logout } from '../lib/api-client';
import {
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@audit-log-and-activity-tracking-saas/ui';
import {
  LayoutDashboard,
  FileText,
  Key,
  Webhook,
  Settings,
  HelpCircle,
  LogOut,
  Menu,
  Search,
  ChevronDown,
  BarChart3,
} from 'lucide-react';

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
  { name: 'Overview', href: '/overview', icon: LayoutDashboard, roles: ['admin', 'member', 'viewer'] },
  { name: 'Audit Logs', href: '/audit-logs', icon: FileText, roles: ['admin', 'member', 'viewer'] },
  { name: 'Analytics', href: '/analytics', icon: BarChart3, roles: ['admin', 'member', 'viewer'] },
  { name: 'API Keys', href: '/api-keys', icon: Key, roles: ['admin'] },
  { name: 'Webhooks', href: '/webhooks', icon: Webhook, roles: ['admin'] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['admin', 'member', 'viewer'] },
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);

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
      <div className="flex h-screen items-center justify-center bg-bg">
        <div className="text-fg-muted">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const navItems = getNavigationForRole(user.role);

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-bg-card transition-transform duration-300 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <Link href="/overview" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4 text-fg-on-accent"
              >
                <path
                  d="M12 2L2 7L12 12L22 7L12 2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 17L12 22L22 17"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 12L12 17L22 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="font-semibold text-sm text-fg">AuditLog</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return item.comingSoon ? (
              <button
                key={item.name}
                disabled
                className={cn(
                  'w-full justify-start gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  'text-fg-muted opacity-50 cursor-not-allowed',
                  'flex items-center'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm">{item.name}</span>
              </button>
            ) : (
              <Button
                key={item.name}
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-3',
                  isActive
                    ? 'bg-accent text-fg'
                    : 'text-fg-muted hover:text-fg hover:bg-accent-10'
                )}
                href={item.href}
                onClick={() => {
                  if (isMobile) {
                    setSidebarOpen(false);
                  }
                }}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm">{item.name}</span>
              </Button>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-border p-3 space-y-1">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-fg-muted hover:text-fg hover:bg-accent-10"
            href="#"
          >
            <HelpCircle className="h-4 w-4" />
            <span className="text-sm">Help & Support</span>
          </Button>

          {/* User profile */}
          <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent-10 cursor-pointer group">
            <Avatar className="h-8 w-8">
              <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.email)}&background=8b5cf6&color=fff`} />
              <AvatarFallback className="bg-accent text-fg-on-accent">
                {user.email.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-fg">
                {user.name || user.email.split('@')[0]}
              </p>
              <p className="text-xs text-fg-muted truncate">{user.email}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
              onClick={handleLogout}
            >
              <LogOut className="h-3 w-3" />
            </Button>
          </div>
        </div>
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
        <header className="flex h-16 items-center gap-4 border-b border-border bg-bg-card px-4 lg:px-6">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Page title */}
          <h1 className="flex-1 text-lg font-semibold text-fg">
            {pageTitle || getPageTitle(pathname)}
          </h1>

          {/* Search input */}
          <div className="hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
              <input
                type="search"
                placeholder="Search..."
                className="w-64 rounded-md border border-border bg-bg-card px-3 py-2 pl-9 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg"
                disabled
              />
            </div>
          </div>
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

'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, LayoutDashboard, TrendingUp, Menu } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, logout, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900"></div>
          <p className="mt-2 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b bg-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 sm:gap-8 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 whitespace-nowrap">
                Portfolio Dashboard
              </h1>

              <div className="hidden md:flex gap-2">
                <Link href="/dashboard">
                  <Button variant={pathname === '/dashboard' ? 'default' : 'ghost'} size="sm">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
                <Link href="/dashboard/stocks">
                  <Button
                    variant={pathname.startsWith('/dashboard/stocks') ? 'default' : 'ghost'}
                    size="sm"
                  >
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Stocks
                  </Button>
                </Link>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-3">
              <span className="text-sm text-slate-600">Welcome, {user?.username || 'User'}</span>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pt-4 border-t space-y-2">
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                <Button
                  variant={pathname === '/dashboard' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  size="sm"
                >
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Link href="/dashboard/stocks" onClick={() => setMobileMenuOpen(false)}>
                <Button
                  variant={pathname.startsWith('/dashboard/stocks') ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  size="sm"
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Stocks
                </Button>
              </Link>
              <div className="pt-2 border-t">
                <p className="text-sm text-slate-600 px-3 py-2">
                  Welcome, {user?.username || 'User'}
                </p>
                <Button variant="outline" className="w-full" size="sm" onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">{children}</main>
    </div>
  );
}

/**
 * AppShell — dark-blue sidebar + white top header wrapper.
 * All authenticated pages render inside this shell.
 *
 * Sidebar highlights the current route automatically via useLocation().
 * Collapses to a bottom-nav on small screens (responsive).
 */
import { ReactNode } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { UserContext } from '@/lib/auth';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Brain,
  Building2,
  BarChart3,
  FileText,
  Settings,
  LogOut,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  icon: React.ElementType;
  to: string;
  /** If provided, the item is only shown for this role */
  role?: 'PAYER' | 'ACO';
}

interface AppShellProps {
  children: ReactNode;
  userContext: UserContext | null;
  /** Title shown in the top header */
  pageTitle?: string;
  /** Year badge shown in header */
  performanceYear?: number;
}

// ─── Navigation items ────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  // Dashboard
  { label: 'Dashboard',      icon: LayoutDashboard, to: '/payer/dashboard',    role: 'PAYER' },
  { label: 'Dashboard',      icon: LayoutDashboard, to: '/aco/dashboard',      role: 'ACO'   },
  
  // Payer-specific
  { label: 'ACO List',       icon: Building2,       to: '/payer/acos',         role: 'PAYER' },
  { label: 'Analysis',       icon: BarChart3,       to: '/payer/analysis',     role: 'PAYER' },
  { label: 'AI Predictions', icon: Brain,           to: '/payer/predictions',  role: 'PAYER' },
  { label: 'Reports',        icon: FileText,        to: '/payer/reports',      role: 'PAYER' },
  
  // ACO-specific
  { label: 'AI Predictions', icon: Brain,           to: '/aco/predictions',    role: 'ACO'   },
  
  // Both roles
  { label: 'Settings',       icon: Settings,        to: '/payer/settings',     role: 'PAYER' },
  { label: 'Settings',       icon: Settings,        to: '/aco/settings',       role: 'ACO'   },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function AppShell({
  children,
  userContext,
  pageTitle = 'ContractIQ',
  performanceYear,
}: AppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const role = userContext?.role ?? null;

  // Filter nav items for the current user role
  const visibleItems = NAV_ITEMS.filter(
    item => !item.role || item.role === role
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-950">

      {/* ── Dark sidebar (desktop) ──────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 flex-shrink-0 bg-gradient-to-b from-[#0f1729] to-[#1a2642] text-white shadow-2xl">
        {/* Logo / brand */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold leading-tight tracking-wide block">
              ContractIQ
            </span>
            <span className="text-xs text-blue-200/60">
              Healthcare Analytics
            </span>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {visibleItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to || 
                           (item.to !== '/' && location.pathname.startsWith(item.to));
            return (
              <NavLink
                key={item.label + item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                    : 'text-blue-100/70 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User info + Logout at bottom */}
        <div className="px-4 py-4 border-t border-white/10 space-y-2">
          {userContext && (
            <div className="px-4 py-3 bg-white/5 rounded-lg">
              <p className="text-sm font-medium text-white truncate">
                {userContext.fullName}
              </p>
              <p className="text-xs text-blue-200/60 truncate">
                {userContext.role === 'PAYER' ? 'CMS / Payer' : 'ACO User'}
              </p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-blue-100/70 hover:bg-white/10 hover:text-white transition-all duration-200"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Main column ─────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* White top header */}
        <header className="flex-shrink-0 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 shadow-sm z-10">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
              {pageTitle}
            </span>
            {performanceYear && (
              <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                PY {performanceYear}
              </span>
            )}
          </div>

          {/* Right: user avatar */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden sm:block text-right leading-tight">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {userContext?.fullName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {userContext?.role === 'PAYER' ? 'CMS / Payer' : 'ACO User'}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-md">
              {userContext?.fullName?.[0]?.toUpperCase() ?? '?'}
            </div>
          </div>
        </header>

        {/* Page content — scrollable */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          {children}
        </main>

        {/* ── Bottom nav (mobile only) ─────────────────────────────────── */}
        <nav className="md:hidden flex-shrink-0 bg-gradient-to-r from-[#0f1729] to-[#1a2642] border-t border-white/10 flex items-center justify-around px-2 py-2 shadow-lg">
          {visibleItems.slice(0, 5).map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to ||
                           (item.to !== '/' && location.pathname.startsWith(item.to));
            return (
              <NavLink
                key={item.label + item.to}
                to={item.to}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs transition-colors',
                  isActive ? 'text-white bg-white/10' : 'text-blue-100/60'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px]">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

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
  Activity,
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
  /** Title shown in the top header (defaults to "VBC Contract Performance Analytics") */
  pageTitle?: string;
  /** Year badge shown in header */
  performanceYear?: number;
}

// ─── Navigation items ────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',  icon: LayoutDashboard, to: '/payer/dashboard', role: 'PAYER' },
  { label: 'Dashboard',  icon: LayoutDashboard, to: '/aco/dashboard',   role: 'ACO'  },
  { label: 'Predict',    icon: Brain,           to: '/predict'                        },
  { label: 'ACO List',   icon: Building2,       to: '/payer/acos',      role: 'PAYER' },
  { label: 'Analytics',  icon: BarChart3,       to: '/payer/analysis',  role: 'PAYER' },
  { label: 'Reports',    icon: FileText,        to: '/reports'                        },
  { label: 'Settings',   icon: Settings,        to: '/settings'                       },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function AppShell({
  children,
  userContext,
  pageTitle = 'VBC Contract Performance Analytics',
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
      <aside className="hidden md:flex flex-col w-56 flex-shrink-0 bg-[#0f1729] text-white">
        {/* Logo / brand */}
        <div className="flex items-center gap-2 px-5 py-5 border-b border-white/10">
          <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <span className="text-sm font-bold leading-tight tracking-wide">
            VBC Analytics
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.label + item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-blue-100/70 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Logout at bottom */}
        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-blue-100/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main column ─────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* White top header */}
        <header className="flex-shrink-0 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile hamburger placeholder — sidebar replaced by bottom nav on mobile */}
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {pageTitle}
            </span>
            {performanceYear && (
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                PY {performanceYear}
              </span>
            )}
          </div>

          {/* Right: user info */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {userContext && (
              <div className="text-right leading-tight">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {userContext.fullName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {userContext.email}
                </p>
              </div>
            )}
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {userContext?.fullName?.[0]?.toUpperCase() ?? '?'}
            </div>
          </div>
        </header>

        {/* Page content — scrollable */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        {/* ── Bottom nav (mobile only) ─────────────────────────────────── */}
        <nav className="md:hidden flex-shrink-0 bg-[#0f1729] border-t border-white/10 flex items-center justify-around px-2 py-1.5">
          {visibleItems.slice(0, 5).map(item => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.label + item.to}
                to={item.to}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-2 py-1 rounded text-xs transition-colors',
                  isActive ? 'text-white' : 'text-blue-100/60'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

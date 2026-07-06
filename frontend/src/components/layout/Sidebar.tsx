import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { useAuth } from '../../context/AuthContext';
import { useDashboard } from '../../hooks/useDashboard';
import {
  LayoutDashboard, MessageSquare, FileText, ClipboardList,
  Zap, GraduationCap, LogOut, Crown, ChevronRight, TrendingUp, Bell, BookMarked, Settings
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard',       icon: LayoutDashboard, path: '/dashboard'    },
  { name: 'Doubt Solver',    icon: MessageSquare,   path: '/doubt-solver'  },
  { name: 'Smart Notes',     icon: FileText,        path: '/notes'         },
  { name: 'My Notes',        icon: BookMarked,      path: '/my-notes'      },
  { name: 'Exam Simulation', icon: ClipboardList,   path: '/simulation'    },
  { name: 'Likely Questions', icon: TrendingUp,  path: '/likely-questions' },
  { name: 'Emergency Mode',  icon: Zap,             path: '/emergency', special: true },
  { name: 'Settings',        icon: Settings,         path: '/settings'   },
];

interface SidebarProps { className?: string; }

export const Sidebar = ({ className }: SidebarProps) => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user, logout, isPro } = useAuth();
  const { progress } = useDashboard();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const initial = user?.name?.[0]?.toUpperCase() ?? 'U';
  const displayName = user?.name ?? 'Student';
  const planLabel = isPro ? 'Topper Pro' : 'Free Plan';

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col bg-slate-950 border-r border-slate-800/60 transition-all duration-300',
        collapsed ? 'w-18' : 'w-64',
        'h-screen sticky top-0 shrink-0',
        className
      )}
      aria-label="Sidebar navigation"
    >
      {/* Logo */}
      <div className={cn('flex items-center h-16 border-b border-slate-800/60', collapsed ? 'justify-center px-3' : 'px-5 gap-3')}>
        <div className="bg-blue-600 p-1.5 rounded-xl shrink-0">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <span className="text-base font-extrabold text-white tracking-tight">
            BoardTopper<span className="text-blue-400">AI</span>
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className={cn('flex-1 overflow-y-auto py-4', collapsed ? 'px-2' : 'px-3')} aria-label="Dashboard navigation">
        {!collapsed && (
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-3 mb-3">Main Menu</p>
        )}
        <ul className="space-y-0.5" role="list">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            return (
              <li key={item.path} role="listitem">
                <Link
                  to={item.path}
                  className={cn(
                    'flex items-center rounded-xl transition-all duration-200 font-semibold text-sm',
                    collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5',
                    active
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                      : item.special
                      ? 'text-amber-400 hover:bg-amber-500/10 hover:text-amber-300'
                      : 'text-slate-400 hover:bg-slate-800/70 hover:text-white'
                  )}
                  title={collapsed ? item.name : undefined}
                  aria-current={active ? 'page' : undefined}
                >
                  <item.icon size={18} className={cn('shrink-0', active ? 'text-white' : item.special ? 'text-amber-400' : '')} />
                  {!collapsed && <span>{item.name}</span>}
                  {!collapsed && active && <ChevronRight size={14} className="ml-auto text-blue-200" />}
                </Link>
              </li>
            );
          })}
        </ul>

        {!collapsed && (
          <>
            <div className="h-px bg-slate-800/60 my-4 mx-3" />
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-3 mb-3">Quick Stats</p>
            <div className="mx-3 space-y-2">
              <div className="flex items-center justify-between bg-slate-900/60 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} className="text-emerald-400" />
                  <span className="text-xs font-bold text-slate-300">Streak</span>
                </div>
                <span className="text-xs font-black text-emerald-400">{progress.streakCount} days 🔥</span>
              </div>
              <div className="flex items-center justify-between bg-slate-900/60 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2">
                  <Bell size={14} className="text-blue-400" />
                  <span className="text-xs font-bold text-slate-300">Doubts</span>
                </div>
                <span className="text-xs font-black text-blue-400">{progress.doubtsSolved} solved</span>
              </div>
            </div>
          </>
        )}
      </nav>

      {/* Upgrade Banner */}
      {!collapsed && !isPro && (
        <div className="mx-3 mb-3">
          <Link to="/pricing" className="block">
            <div className="bg-gradient-to-br from-blue-600/20 to-violet-600/10 border border-blue-500/20 rounded-2xl p-4 group hover:border-blue-500/40 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <Crown size={14} className="text-amber-400" />
                <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Free Plan</p>
              </div>
              <p className="text-xs font-semibold text-slate-400 mb-3">Upgrade to unlock unlimited AI, PDF notes & full mock tests.</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-white">â‚¹99/mo</span>
                <span className="text-[10px] font-black text-blue-400 group-hover:text-blue-300 uppercase tracking-wider flex items-center gap-1">
                  Upgrade <ChevronRight size={10} />
                </span>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* User */}
      <div className={cn('border-t border-slate-800/60 py-3', collapsed ? 'px-2 flex justify-center' : 'px-3')}>
        {collapsed ? (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-black text-sm">
            {initial}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-black text-sm shrink-0">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{displayName}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-tighter">{planLabel}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;


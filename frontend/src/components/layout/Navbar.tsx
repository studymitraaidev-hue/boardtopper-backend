import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';
import {
  Sparkles, Menu, X, GraduationCap, ShieldCheck,
  Zap, ChevronDown, BookOpen, MessageSquare, ClipboardList, LayoutDashboard
} from 'lucide-react';

const PRODUCTS = [
  { name: 'Study Dashboard',  desc: 'Track your progress daily',          icon: LayoutDashboard, path: '/dashboard',    color: 'text-blue-600',   bg: 'bg-blue-50'    },
  { name: 'AI Doubt Solver',  desc: 'Instant step-by-step solutions',     icon: MessageSquare,   path: '/doubt-solver', color: 'text-violet-600', bg: 'bg-violet-50'  },
  { name: 'Smart Notes',      desc: 'Board-focused chapter summaries',     icon: BookOpen,        path: '/notes',        color: 'text-emerald-600',bg: 'bg-emerald-50' },
  { name: 'Exam Simulation',  desc: 'Timed mock tests with AI marking',    icon: ClipboardList,   path: '/simulation',   color: 'text-amber-600',  bg: 'bg-amber-50'   },
  { name: 'Emergency Mode',   desc: 'Crash prep for tomorrow\'s exam',     icon: Zap,             path: '/emergency',    color: 'text-red-600',    bg: 'bg-red-50'     },
];

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const { user } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProductsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); setProductsOpen(false); }, [location.pathname]);

  // Prevent body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <>
      <nav
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100'
            : 'bg-transparent'
        )}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-18 flex items-center justify-between">

          {/* ── Logo ── */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group shrink-0"
            aria-label="BoardTopper AI home"
          >
            <div className="bg-blue-600 p-1.5 sm:p-2 rounded-xl shadow-md shadow-blue-200/50 group-hover:bg-slate-900 transition-colors">
              <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
              BoardTopper<span className="text-blue-600">AI</span>
            </span>
          </Link>

          {/* ── Desktop Nav ── */}
          <div className="hidden lg:flex items-center gap-1">
            {/* Products dropdown */}
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setProductsOpen(!productsOpen)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all"
              >
                Products
                <ChevronDown size={14} className={cn('transition-transform', productsOpen && 'rotate-180')} />
              </button>

              {productsOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 p-2 animate-fade-in">
                  {PRODUCTS.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                      onClick={() => setProductsOpen(false)}
                    >
                      <div className={cn('p-2 rounded-lg shrink-0', item.bg)}>
                        <item.icon size={16} className={item.color} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {isLanding ? (
              <a href="#parents" className="px-4 py-2 rounded-xl text-[13px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all">For Parents</a>
            ) : (
              <Link to="/#parents" className="px-4 py-2 rounded-xl text-[13px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all">For Parents</Link>
            )}
            <Link to="/pricing" className="px-4 py-2 rounded-xl text-[13px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all">Pricing</Link>
          </div>

          {/* ── Desktop CTA ── */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex items-center gap-1.5 mr-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
              <ShieldCheck size={12} className="text-emerald-600" />
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">Board Verified</span>
            </div>
            {user ? (
              <Link to="/dashboard">
                <Button variant="secondary" size="sm" className="gap-1.5 shadow-lg shadow-blue-100">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="font-bold text-slate-700">Login</Button>
                </Link>
                <Link to="/signup">
                  <Button variant="secondary" size="sm" className="gap-1.5 shadow-lg shadow-blue-100">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                    Start Free
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* ── Mobile right side ── */}
          <div className="lg:hidden flex items-center gap-2">
            <Link to="/signup" className="hidden sm:block">
              <Button variant="secondary" size="xs" className="font-bold">Start Free</Button>
            </Link>
            <button
              className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile Drawer ── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          {/* Panel */}
          <div className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-white z-50 lg:hidden shadow-2xl flex flex-col animate-slide-right">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <Link to="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                <div className="bg-blue-600 p-1.5 rounded-xl">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-black text-slate-900">
                  BoardTopper<span className="text-blue-600">AI</span>
                </span>
              </Link>
              <button
                className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Nav Links */}
            <div className="flex-1 overflow-y-auto p-5 space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 mb-3">Features</p>
              {PRODUCTS.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-2xl transition-all font-semibold text-sm',
                    location.pathname === item.path
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <div className={cn('p-2 rounded-lg', item.bg)}>
                    <item.icon size={16} className={item.color} />
                  </div>
                  {item.name}
                </Link>
              ))}

              <div className="h-px bg-slate-100 my-4" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 mb-3">Company</p>

              {isLanding ? (
                <a href="#parents" className="flex items-center gap-3 p-3 rounded-2xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all" onClick={() => setMobileOpen(false)}>For Parents</a>
              ) : (
                <Link to="/#parents" className="flex items-center gap-3 p-3 rounded-2xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all">For Parents</Link>
              )}
              <Link to="/pricing" className="flex items-center gap-3 p-3 rounded-2xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all">Pricing</Link>
            </div>

            {/* Footer CTA */}
            <div className="p-5 border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-1.5 justify-center bg-emerald-50 px-3 py-2 rounded-full border border-emerald-100">
                <ShieldCheck size={12} className="text-emerald-600" />
                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">Board Verified Platform</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Link to="/login" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" size="md" fullWidth className="font-bold">Login</Button>
                </Link>
                <Link to="/signup" onClick={() => setMobileOpen(false)}>
                  <Button variant="secondary" size="md" fullWidth className="font-bold gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                    Start Free
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Navbar;

import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { SkeletonCard, SkeletonLine, SkeletonAvatar } from '../components/ui/Skeleton';
import AppLayout from '../components/layout/AppLayout';
import { useDashboard } from '../hooks/useDashboard';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { cn } from '../utils/cn';
import {
  Search, Bell, Flame, Clock,
  ChevronRight, BookOpen, Zap, CheckCircle2, MessageSquare,
  Brain, Crown, Sparkles, Calendar, ArrowUp,
  FileText, Trophy
} from 'lucide-react';

export const Dashboard = () => {
  const { subjects, schedule, dashboard, progress, isLoading, error } = useDashboard();
  const { user, refreshUser } = useAuth();
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  // ── Notifications state ───────────────────────────────────────────────────
  const [notifOpen,     setNotifOpen]     = useState(false);
  const [notifications, setNotifications] = useState<Array<{
    id: string; type: string; title: string; body: string; read: boolean; createdAt: string;
  }>>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get<{ count: number }>('/api/notifications/unread-count')
      .then((d) => setUnreadCount(d.count))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!notifOpen) return;
    api.get<Array<{ id: string; type: string; title: string; body: string; read: boolean; createdAt: string }>>('/api/notifications')
      .then((data) => setNotifications(data))
      .catch(() => {});
  }, [notifOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifOpen]);

  const handleMarkRead = async (id: string) => {
    try {
      await api.patch(`/api/notifications/${id}/read`, {});
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* non-fatal */ }
  };

  const [searchQuery,   setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState<{
    chapters: Array<{ id: string; name: string; subjectId: string; chapterNumber: number; type: string; status: string }>;
    notes:    Array<{ id: string; title: string; subjectId: string; chapterId: string; type: string }>;
  }>({ chapters: [], notes: [] });
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate  = useNavigate();

  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSearchResults({ chapters: [], notes: [] });
      setSearchOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const data = await api.get<{
          chapters: typeof searchResults.chapters;
          notes:    typeof searchResults.notes;
        }>(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`);
        setSearchResults(data);
        setSearchOpen(true);
      } catch {
        setSearchResults({ chapters: [], notes: [] });
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTask = async (id: string) => {
    // Optimistic update
    setCompletedTasks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    // Persist to backend
    try {
      await api.patch(`/api/schedule/${id}/toggle`, {});
    } catch {
      // Rollback on failure
      setCompletedTasks(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
    }
  };

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' :
    hour < 17 ? 'Good afternoon' :
    hour < 21 ? 'Good evening' : 'Study late';

  const firstName = user?.name?.split(' ')[0] ?? 'Student';

  // Exam countdown — wired to user.examDate from backend.
  // If student has not set their exam date, hasExamDate is false
  // and the countdown section shows a "Set exam date" prompt instead.
  const examDateStr  = user?.examDate ?? null;
  const hasExamDate  = examDateStr !== null;
  const examDaysLeft = hasExamDate
    ? Math.max(0, Math.ceil(
        (new Date(examDateStr!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ))
    : 0;
  const examWeeks = Math.floor(examDaysLeft / 7);
  const examDays  = examDaysLeft % 7;

  // Day 5: AI Insights — driven by real doubt_topics data from backend.
  // Only show if user has asked doubts; never fabricate topics.
  const SUBJECT_COLORS: Record<string, { accent: string; bg: string }> = {
    Mathematics: { accent: 'text-blue-400',    bg: 'bg-blue-400/10' },
    Science:     { accent: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    History:     { accent: 'text-amber-400',   bg: 'bg-amber-400/10' },
    Geography:   { accent: 'text-cyan-400',    bg: 'bg-cyan-400/10' },
    English:     { accent: 'text-violet-400',  bg: 'bg-violet-400/10' },
    Marathi:     { accent: 'text-rose-400',    bg: 'bg-rose-400/10' },
    Hindi:       { accent: 'text-orange-400',  bg: 'bg-orange-400/10' },
  };
  // Use real weak topics from dashboard API; no fallback fake data
  const weakTopics = dashboard.weakTopics ?? [];
  const hasWeakTopics = weakTopics.length > 0;

  // FIX: Wire stats row to real progress data from backend.
  // totalCompleted tracks doubts/tasks done; streakCount is the actual streak.
  // Syllabus and mock score derive from bySubject averages where available.
  const subjectValues = Object.values(progress.bySubject);
  const avgProgress = subjectValues.length > 0
    ? Math.round(subjectValues.reduce((a, b) => a + b, 0) / subjectValues.length)
    : 0;
  const streakDisplay    = progress.streakCount > 0 ? `${progress.streakCount}d` : '0d';
  const doubtsDisplay    = progress.doubtsSolved;
  const mockScoreDisplay = progress.mockScoreAvg !== null ? `${progress.mockScoreAvg}%` : '—';
  const mockScoreSub     = progress.mockScoreAvg !== null ? 'Across all mock tests' : 'Complete a mock test';

  // Day 5: real note count from dashboard API
  const totalNotesDisplay = dashboard.totalNotes > 0 ? String(dashboard.totalNotes) : '0';
  const recentNotes       = dashboard.recentNotes ?? [];

  return (
    <>
    <AppLayout>
      {/* ── Top Header ── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4 relative">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMobileSearch(true)}
            className="sm:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors"
            aria-label="Search"
          >
            <Search size={18} className="text-slate-600" />
          </button>
          <div className="relative hidden sm:block" ref={searchRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults.chapters.length > 0 || searchResults.notes.length > 0) {
                  setSearchOpen(true);
                }
              }}
              placeholder="Search topics, notes, doubts…"
              className="pl-9 pr-4 py-2 bg-slate-100 hover:bg-slate-200/70 border border-transparent focus:bg-white focus:border-blue-300 rounded-xl text-sm outline-none transition-all w-64 lg:w-80 placeholder:text-slate-400"
              aria-label="Search"
            />
            {searchLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {searchOpen && (searchResults.chapters.length > 0 || searchResults.notes.length > 0) && (
              <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                {searchResults.chapters.length > 0 && (
                  <div>
                    <div className="px-4 pt-3 pb-1 text-xs font-bold text-slate-400 uppercase tracking-wider">Chapters</div>
                    {searchResults.chapters.map((ch) => (
                      <button
                        key={ch.id}
                        onClick={() => {
                          navigate(`/subjects/${ch.subjectId}/chapters`);
                          setSearchOpen(false);
                          setSearchQuery('');
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                      >
                        <BookOpen size={14} className="text-blue-500 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-slate-800">{ch.name}</p>
                          <p className="text-xs text-slate-400">Chapter {ch.chapterNumber} · {ch.type}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.notes.length > 0 && (
                  <div>
                    <div className="px-4 pt-3 pb-1 text-xs font-bold text-slate-400 uppercase tracking-wider">My Notes</div>
                    {searchResults.notes.map((note) => (
                      <button
                        key={note.id}
                        onClick={() => {
                          navigate(`/my-notes?note=${note.id}`);
                          setSearchOpen(false);
                          setSearchQuery('');
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                      >
                        <FileText size={14} className="text-emerald-500 shrink-0" />
                        <p className="text-sm font-medium text-slate-800">{note.title}</p>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.chapters.length === 0 && searchResults.notes.length === 0 && (
                  <div className="px-4 py-6 text-center text-sm text-slate-400">No results found.</div>
                )}
              </div>
            )}
          </div>
          <Badge variant="primary" className="hidden lg:flex py-1 px-3 text-[10px]">
            Maharashtra Board
          </Badge>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex items-center gap-1.5 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-100">
            <Flame size={14} className="text-orange-500" />
            <span className="text-xs font-black text-orange-700">{progress.streakCount}-day streak</span>
          </div>
          <button className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors" aria-label="Notifications"
            onClick={() => setNotifOpen((o) => !o)}
          >
            <Bell size={18} className="text-slate-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {/* Notification dropdown */}
          {notifOpen && (
            <div ref={notifRef} className="absolute top-14 sm:top-16 right-4 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-sm font-extrabold text-slate-900">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{unreadCount} unread</span>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-400">No notifications yet.</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.read && handleMarkRead(n.id)}
                      className={cn(
                        'px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors',
                        !n.read && 'bg-blue-50/60'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {!n.read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0" />}
                        <div className={cn('flex-1', n.read && 'ml-4')}>
                          <p className="text-xs font-bold text-slate-900">{n.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{n.body}</p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          <Link to="/doubt-solver">
            <Button variant="secondary" size="sm" className="gap-1.5 shadow-sm shadow-blue-100">
              <Sparkles size={13} className="text-amber-300 fill-amber-200" />
              <span className="hidden sm:inline">Ask AI</span>
              <span className="sm:hidden">AI</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* ── Body ── */}
      {isLoading ? (
        <div className="flex-1 p-4 sm:p-6 space-y-5 sm:space-y-6 overflow-x-hidden page-enter">
          {/* Skeleton: Welcome row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <SkeletonLine width="200px" height="2rem" />
              <SkeletonLine width="260px" height="1rem" />
            </div>
          </div>
          {/* Skeleton: Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          {/* Skeleton: Subject grid + schedule */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 sm:gap-6">
            <div className="xl:col-span-2 space-y-5">
              <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
                <SkeletonLine width="140px" height="1.25rem" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
                <SkeletonLine width="140px" height="1.25rem" />
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-3 items-center">
                    <SkeletonAvatar size={32} />
                    <div className="flex-1 space-y-1.5">
                      <SkeletonLine width="80%" height="0.875rem" />
                      <SkeletonLine width="50%" height="0.75rem" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-6 py-4 rounded-2xl text-center max-w-sm">
            <p className="font-extrabold mb-1">Failed to load dashboard</p>
            <p>{error}</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 p-4 sm:p-6 space-y-5 sm:space-y-6 overflow-x-hidden page-enter">

          {/* ── Welcome Row ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {greeting}, {firstName}! 👋
              </h1>
              <p className="text-sm text-slate-500 font-medium mt-0.5">
                Targeting <span className="font-black text-blue-600">{user?.targetPercent ?? 90}%</span> · {avgProgress >= (user?.targetPercent ?? 90) ? 'On Track to Topper Status' : 'Keep pushing!'}
              </p>
            </div>
            {hasExamDate ? (
              <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm self-start sm:self-auto">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Next Exam</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {new Date(examDateStr!).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </p>
                </div>
                <div className="h-8 w-px bg-slate-100" />
                <div className="flex items-center gap-1 text-slate-900">
                  <div className="bg-slate-900 text-white px-2.5 py-1 rounded-lg font-black text-sm tabular-nums">{examWeeks}</div>
                  <span className="font-black text-slate-400">w</span>
                  <div className="bg-slate-900 text-white px-2.5 py-1 rounded-lg font-black text-sm tabular-nums">{examDays}</div>
                  <span className="text-[10px] font-black text-slate-500 uppercase ml-1">days</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-1 bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm self-start sm:self-auto">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Next Exam</p>
                <p className="text-xs text-slate-400 mt-1">
                  Set your exam date to see countdown
                </p>
                <button
                  onClick={() => {
                    const date = prompt('Enter your exam date (YYYY-MM-DD), e.g. 2026-03-10:');
                    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
                      api.patch('/api/auth/me', { examDate: date })
                        .then(() => refreshUser())
                        .catch(() => {});
                    }
                  }}
                  className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-700 underline underline-offset-2 transition-colors"
                >
                  Set exam date →
                </button>
              </div>
            )}
          </div>

          {/* ── Upgrade Banner ── */}
          {user?.plan !== 'pro' && (
            <div className="relative bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950 rounded-2xl sm:rounded-3xl p-5 sm:p-7 overflow-hidden">
              <div className="absolute top-0 right-0 w-48 sm:w-72 h-full opacity-10 pointer-events-none">
                <Crown size={200} className="absolute -right-8 -top-4 rotate-12" />
              </div>
              <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                <div className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-400 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-500/30">
                  <Sparkles size={9} /> Limited Offer
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 relative z-10">
                <div className="space-y-2">
                  <h2 className="text-lg sm:text-2xl font-black text-white leading-tight">
                    Unlock Topper Mode — ₹99/month
                  </h2>
                  <p className="text-sm text-slate-400 max-w-md">
                    Unlimited AI doubts, printable PDF notes, and board-pattern mock tests with detailed grading.
                  </p>
                </div>
                <Link to="/pricing" className="shrink-0">
                  <Button variant="secondary" className="gap-2 shadow-xl shadow-blue-600/20 bg-blue-600 hover:bg-blue-500 whitespace-nowrap">
                    Upgrade Now <ChevronRight size={16} />
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* ── Stats Row ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { label: 'My Notes',       value: totalNotesDisplay,           sub: dashboard.totalNotes > 0 ? 'Personal notes saved' : 'Save your first note', icon: FileText,  dark: true  },
              { label: 'Doubts Solved',  value: String(doubtsDisplay),       sub: 'All time',                                                              icon: Brain,     dark: false },
              { label: 'Mock Score Avg', value: mockScoreDisplay,            sub: mockScoreSub,                                                            icon: Trophy,    dark: false },
              { label: 'Study Streak',   value: streakDisplay,               sub: progress.streakCount > 0 ? 'Keep it up!' : 'Start your streak today',   icon: Flame,     dark: false },
            ].map((stat) => (
              <div key={stat.label} className={cn('rounded-2xl p-4 sm:p-5 border', stat.dark ? 'bg-blue-600 border-transparent shadow-xl shadow-blue-200' : 'bg-white border-slate-100 shadow-sm')}>
                <div className="flex items-start justify-between mb-3">
                  <p className={cn('text-[9px] font-black uppercase tracking-widest', stat.dark ? 'text-blue-200' : 'text-slate-400')}>
                    {stat.label}
                  </p>
                  <stat.icon size={16} className={stat.dark ? 'text-blue-200/60' : 'text-slate-300'} />
                </div>
                <p className={cn('text-3xl sm:text-4xl font-black tracking-tight', stat.dark ? 'text-white' : 'text-slate-900')}>
                  {stat.value}
                </p>
                <p className={cn('text-xs font-semibold mt-1.5', stat.dark ? 'text-blue-200' : 'text-slate-500')}>
                  {stat.sub}
                </p>
              </div>
            ))}
          </div>

          {/* ── Main Grid ── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 sm:gap-6">

            {/* Left: Subjects + Schedule */}
            <div className="xl:col-span-2 space-y-5 sm:space-y-6">

              {/* Subject Mastery */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-extrabold text-slate-900">Subject Mastery</h3>
                  <Link to="/simulation" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors">
                    View Details <ChevronRight size={13} />
                  </Link>
                </div>
                <div className="space-y-4">
                  {subjects.map((sub) => (
                    <div key={sub.name} className="flex items-center gap-4">
                      <div className={cn('p-2 rounded-xl shrink-0', sub.light)}>
                        {sub.icon && <sub.icon size={16} className={sub.text} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-bold text-slate-800 truncate">{sub.name}</span>
                          <span className="text-sm font-black text-slate-700 shrink-0 ml-2">{sub.progress}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full transition-all duration-1000', sub.color)} style={{ width: `${sub.progress}%` }} />
                        </div>
                      </div>
                      {(sub.progress ?? 0) >= 85 && (
                        <div className="shrink-0"><ArrowUp size={14} className="text-emerald-500" /></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Daily Schedule */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-slate-400" />
                    <h3 className="font-extrabold text-slate-900">Today's Schedule</h3>
                  </div>
                  <Badge variant="success" className="text-[9px]">3 tasks</Badge>
                </div>
                <div className="space-y-3">
                  {schedule.map((item) => {
                    const done = item.done || completedTasks.has(item.id);
                    return (
                    <div
                      key={item.id}
                      onClick={() => toggleTask(item.id)}
                      className={cn('flex items-center gap-4 p-3.5 rounded-xl border transition-all cursor-pointer', done ? 'bg-slate-50 border-transparent opacity-60' : 'bg-white border-slate-100 hover:border-blue-200')}
                    >
                      <span className="text-xs font-black text-slate-400 w-14 shrink-0">{item.time}</span>
                      <div className={cn('w-2 h-2 rounded-full shrink-0', done ? 'bg-emerald-500' : 'bg-amber-400')} />
                      <p className={cn('text-sm font-semibold flex-1', done ? 'line-through text-slate-400' : 'text-slate-800')}>{item.task}</p>
                      {done ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> : <div className="w-5 h-5 rounded-full border-2 border-slate-200 shrink-0" />}
                    </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Actions — mobile only */}
              <div className="grid grid-cols-2 gap-3 xl:hidden">
                {[
                  { label: 'Ask a Doubt',    icon: MessageSquare, path: '/doubt-solver', color: 'bg-blue-600 text-white' },
                  { label: 'Emergency Mode', icon: Zap,           path: '/emergency',    color: 'bg-amber-500 text-white' },
                  { label: 'Smart Notes',    icon: FileText,      path: '/notes',        color: 'bg-white border border-slate-200 text-slate-900' },
                  { label: 'Mock Test',      icon: Trophy,        path: '/simulation',   color: 'bg-white border border-slate-200 text-slate-900' },
                ].map((action) => (
                  <Link key={action.path} to={action.path}>
                    <div className={cn('flex items-center gap-3 p-4 rounded-2xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-95 shadow-sm', action.color)}>
                      <action.icon size={18} />{action.label}
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Right: AI Insights + Recent */}
            <div className="space-y-5 sm:space-y-6">

              {/* AI Insights */}
              <div className="bg-slate-950 rounded-2xl overflow-hidden">
                <div className="bg-gradient-to-br from-blue-600/25 to-violet-600/15 p-5">
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-600/30">
                      <Brain size={16} className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-white text-sm">AI Insights</h4>
                      <p className="text-[9px] text-slate-400 uppercase tracking-widest">This week's weak areas</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {hasWeakTopics ? (
                      weakTopics.map((item, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl border border-white/5 bg-slate-400/10">
                          <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-slate-400">Frequent topic</p>
                          <p className="text-sm font-semibold text-white">{item.topic}</p>
                          <p className="text-[10px] text-slate-500 mt-1">Recommended: Solve 5 practice questions</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-3.5 rounded-xl border border-white/5 bg-slate-400/10 text-center">
                        <p className="text-sm text-slate-400">Ask doubts to unlock your weak area insights.</p>
                      </div>
                    )}
                  </div>
                  <Link to="/doubt-solver" className="block mt-4">
                    <Button variant="secondary" fullWidth className="bg-blue-600 hover:bg-blue-500 font-bold text-sm">
                      {hasWeakTopics ? 'Practice These Now →' : 'Ask a Doubt →'}
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Emergency Mode CTA */}
              <Link to="/emergency" className="bg-gradient-to-br from-red-600 to-orange-600 rounded-2xl p-5 flex items-center gap-4 group hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg shadow-red-200 cursor-pointer block">
                <div className="bg-white/20 p-3 rounded-xl">
                  <Zap size={20} className="text-white fill-white" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-red-200 uppercase tracking-widest mb-0.5">Exam soon?</p>
                  <p className="text-sm font-black text-white">Activate Emergency Mode</p>
                  <p className="text-xs text-red-200 mt-0.5">Focused crash revision</p>
                </div>
                <ChevronRight size={18} className="text-white group-hover:translate-x-1 transition-transform" />
              </Link>

              {/* Recently Saved */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock size={15} className="text-slate-400" />
                    <h4 className="font-bold text-slate-900 text-sm">Recently Saved</h4>
                  </div>
                  {dashboard.totalNotes > 0 && (
                    <span className="text-[10px] text-slate-400 font-semibold">{dashboard.totalNotes} total</span>
                  )}
                </div>
                <div className="space-y-1">
                  {recentNotes.length === 0 ? (
                    <div className="py-6 text-center">
                      <FileText size={24} className="text-slate-200 mx-auto mb-2" />
                      <p className="text-sm text-slate-400 font-medium">No notes yet</p>
                      <Link to="/my-notes" className="text-xs text-blue-600 font-semibold hover:text-blue-700 mt-1 inline-block">
                        Create your first note →
                      </Link>
                    </div>
                  ) : (
                    recentNotes.map((item) => {
                      const dateLabel = item.updated_at
                        ? new Date(item.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                        : '';
                      return (
                        <Link key={item.id} to="/my-notes">
                          <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer">
                            <div className="flex items-center gap-3">
                              <div className="p-1.5 rounded-lg shrink-0 bg-blue-50">
                                <FileText size={13} className="text-blue-600" />
                              </div>
                              <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors truncate max-w-[130px]">
                                {item.title}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 shrink-0 ml-2">{dateLabel}</span>
                          </div>
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
      {showMobileSearch && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics, notes, doubts…"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <button
              onClick={() => { setShowMobileSearch(false); setSearchQuery(''); setSearchResults({ chapters: [], notes: [] }); }}
              className="p-2 rounded-xl hover:bg-slate-100 text-sm font-medium text-slate-600"
            >
              Cancel
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {searchLoading && (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!searchLoading && searchQuery.length >= 3 && searchResults.chapters.length === 0 && searchResults.notes.length === 0 && (
              <p className="text-center text-sm text-slate-400 py-8">No results found.</p>
            )}
            {searchResults.chapters.length > 0 && (
              <div>
                <div className="px-4 pt-4 pb-1 text-xs font-bold text-slate-400 uppercase tracking-wider">Chapters</div>
                {searchResults.chapters.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => { navigate(`/subjects/${ch.subjectId}/chapters`); setShowMobileSearch(false); setSearchQuery(''); }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-50"
                  >
                    <BookOpen size={16} className="text-blue-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{ch.name}</p>
                      <p className="text-xs text-slate-400">Chapter {ch.chapterNumber} · {ch.type}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {searchResults.notes.length > 0 && (
              <div>
                <div className="px-4 pt-4 pb-1 text-xs font-bold text-slate-400 uppercase tracking-wider">My Notes</div>
                {searchResults.notes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => { navigate(`/my-notes?note=${note.id}`); setShowMobileSearch(false); setSearchQuery(''); }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-50"
                  >
                    <FileText size={16} className="text-emerald-500 shrink-0" />
                    <p className="text-sm font-medium text-slate-800">{note.title}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Dashboard;

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AppLayout from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { cn } from '../utils/cn';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../utils/api';
import { updateProfile, getQuickChapters, QuickChapterItem } from '../services/dashboardService';
import {
  Zap, AlertTriangle, CheckCircle2, BookOpen, ArrowRight, Crown,
  FileText, MessageCircle, Library, ChevronRight, X, Clock,
  Flame, RefreshCw, CheckCheck, Maximize2, Minimize2,
  ChevronLeft, AlertCircle, TrendingUp, Star, Sparkles, Calendar,
} from 'lucide-react';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface EmergencyItem {
  title:     string;
  content:   string;
  tag?:      string;
  priority?: 'high' | 'normal';
}

interface AiTip {
  subject: string;
  points:  string[];
}

type EmergencyMode = 'notes' | 'doubts' | 'fallback' | 'empty';
type LoadState     = 'idle' | 'loading' | 'success' | 'error';

interface ExamContext {
  examType:     'unit_test' | 'half_yearly' | 'board' | 'other';
  chapters:     string;
  hoursLeft:    number;
  examDateTime: string;
}

interface UserContext {
  examDate: string | null;
  weakSubjects: string[];
  streakCount: number;
  targetPercent: number;
  name: string;
  timeRemainingMinutes: number | null;
  urgencyLevel: 'unknown' | 'low' | 'medium' | 'high' | 'panic';
  prioritySubjects: string[];
}

interface EmergencyData {
  mode:        EmergencyMode;
  items:       EmergencyItem[];
  aiTips:      AiTip[];
  userContext: UserContext;
}

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const MODE_META: Record<EmergencyMode, {
  label: string; description: string;
  icon:  React.ComponentType<{ size?: number; className?: string }>;
  color: string; bg: string;
}> = {
  notes:    { label: 'Your Notes',        description: 'Your most recently edited personal notes.',    icon: FileText,      color: 'text-blue-400',    bg: 'bg-blue-950/40'    },
  doubts:   { label: 'Your Doubts',       description: 'Your recent academic doubt-solver questions.', icon: MessageCircle, color: 'text-violet-400',  bg: 'bg-violet-950/40'  },
  fallback: { label: 'Syllabus Chapters', description: 'Key chapters from the syllabus to focus on.', icon: Library,       color: 'text-emerald-400', bg: 'bg-emerald-950/40' },
  empty:    { label: 'No Data',           description: 'Nothing found. Create notes or ask doubts.',  icon: BookOpen,      color: 'text-slate-400',   bg: 'bg-slate-800/40'   },
};

const GRADIENT: Record<EmergencyMode, string> = {
  notes:    'from-blue-500 to-indigo-600',
  doubts:   'from-violet-500 to-purple-600',
  fallback: 'from-emerald-500 to-teal-600',
  empty:    'from-slate-400 to-slate-500',
};

// â”€â”€â”€ Hooks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function useCountdown(examDate: string | null) {
  const [left, setLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  useEffect(() => {
    if (!examDate) { setLeft(null); return; }
    const target = new Date(examDate).getTime();
    if (isNaN(target)) { setLeft(null); return; }
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) { setLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return; }
      setLeft({
        days:    Math.floor(diff / 86400000),
        hours:   Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000)  / 60000),
        seconds: Math.floor((diff % 60000)    / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [examDate]);
  return left;
}


function UpgradeModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl z-10 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-500" />
        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-2.5 rounded-2xl shadow-lg">
                <Crown size={22} className="text-white" />
              </div>
              <div>
                <p className="text-base font-black text-slate-900">Unlock Topper Pro</p>
                <p className="text-xs text-slate-400 mt-0.5">Emergency Mode + all premium features</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"><X size={18} /></button>
          </div>
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-2xl font-black text-white">Rs.99<span className="text-sm font-normal text-slate-400">/mo</span></p>
              <p className="text-xs text-slate-400 mt-0.5">Cancel anytime</p>
            </div>
            <span className="text-xs font-black text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">MOST POPULAR</span>
          </div>
          <div className="space-y-2.5">
            {[
              { icon: Zap,          text: 'Emergency Mode with Focus + Countdown'   },
              { icon: Sparkles,     text: 'AI revision tips for your weak subjects'  },
              { icon: AlertCircle,  text: 'Weak subject prioritisation'              },
              { icon: MessageCircle,text: 'Unlimited AI doubts'                      },
              { icon: Crown,        text: 'Priority AI response quality'             },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="p-1.5 bg-emerald-50 rounded-lg shrink-0"><Icon size={13} className="text-emerald-600" /></div>
                <p className="text-sm text-slate-700">{text}</p>
              </div>
            ))}
          </div>
          <Button variant="gold" fullWidth className="gap-2 justify-center font-black" onClick={() => navigate('/pricing')}>
            <Crown size={14} /> Upgrade to Topper Pro - Rs.99/mo
          </Button>
          <Link to="/pricing" className="block text-xs text-center text-slate-400 hover:text-slate-600 transition-colors">See full plan details</Link>
        </div>
      </motion.div>
    </div>
  );
}

// â”€â”€â”€ ProGate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ProGate({ onUpgradeClick }: { onUpgradeClick: () => void }) {
  return (
    <AppLayout>
      <main className="flex-1 min-w-0 overflow-y-auto h-screen bg-[#0a0a0f]">
        <header className="sticky top-0 z-20 bg-gradient-to-r from-red-700 to-orange-600 px-4 sm:px-6 h-14 sm:h-16 flex items-center shadow-lg shadow-red-900/50">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-1.5 rounded-lg"><Zap size={18} className="text-white fill-white" /></div>
            <h1 className="text-sm sm:text-base font-black text-white">Emergency Mode</h1>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative bg-[#111118] border border-white/10 rounded-3xl shadow-2xl p-8 max-w-sm w-full space-y-6 overflow-hidden"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-5 rounded-3xl inline-flex mx-auto shadow-xl shadow-amber-900/50">
                <Crown size={36} className="text-white" />
              </div>
            </div>
            <div className="relative space-y-2">
              <h2 className="text-2xl font-black text-white">Pro Feature</h2>
              <p className="text-sm text-white/40 leading-relaxed">You have used your free Emergency Mode trial. Upgrade to Topper Pro for unlimited exam-survival sessions, anytime you need them.</p>
            </div>
            <div className="relative space-y-2 text-left bg-white/5 border border-white/10 rounded-2xl p-4">
              {[
                'AI revision tips for your weak subjects',
                'Weak subject items shown first',
                'Live exam countdown timer',
                'Focused Revision â€” one card at a time',
                ].map(f => (
                <div key={f} className="flex items-center gap-2.5 text-sm text-white/60">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />{f}
                </div>
              ))}
            </div>
            <div className="relative">
              <Button variant="gold" fullWidth className="gap-2 justify-center font-black py-3 text-base" onClick={onUpgradeClick}>
                <Crown size={16} /> Upgrade to Topper Pro â€” Rs.99/mo
              </Button>
              <Link to="/pricing" className="block text-xs text-white/30 hover:text-white/60 transition-colors mt-3">See full plan details</Link>
            </div>
          </motion.div>
        </div>
      </main>
    </AppLayout>
  );
}

// â”€â”€â”€ AiTipsSection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function AiTipsSection({ tips }: { tips: AiTip[] }) {
  const [expanded, setExpanded] = useState<string | null>(tips[0]?.subject ?? null);
  if (tips.length === 0) return null;
  return (
    <div className="bg-[#0d0d1a] border border-indigo-500/20 rounded-2xl overflow-hidden shadow-xl">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
        <div className="bg-indigo-500/20 p-2 rounded-xl"><Sparkles size={16} className="text-indigo-400" /></div>
        <div>
          <p className="text-sm font-black text-white">AI Revision Tips</p>
          <p className="text-[10px] text-indigo-300/50 uppercase tracking-wider">Generated for your weak subjects</p>
        </div>
      </div>
      <div className="divide-y divide-white/5">
        {tips.map(tip => {
          const isOpen = expanded === tip.subject;
          return (
            <div key={tip.subject}>
              <button
                onClick={() => setExpanded(isOpen ? null : tip.subject)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-black text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full uppercase">Weak</span>
                  <span className="text-sm font-bold text-white">{tip.subject}</span>
                </div>
                <ChevronRight size={15} className={cn('text-white/20 transition-transform shrink-0', isOpen && 'rotate-90')} />
              </button>
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-4 space-y-2.5">
                      {tip.points.map((point, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="shrink-0 w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mt-0.5">
                            <span className="text-[9px] font-black text-indigo-400">{i + 1}</span>
                          </div>
                          <p className="text-sm text-white/60 leading-relaxed">{point}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// â”€â”€â”€ ExamContextSheet â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function examTypeCls(current: string, val: string) {
  return current === val
    ? 'px-3 py-2.5 rounded-xl border text-sm font-bold text-left transition-all bg-red-500/20 border-red-500/50 text-red-300'
    : 'px-3 py-2.5 rounded-xl border text-sm font-bold text-left transition-all bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500';
}

function ExamContextSheet({ ctx, setCtx, onStart, onClose, userContext }: {
  ctx:        ExamContext;
  setCtx:     (c: ExamContext) => void;
  onStart:    () => void;
  onClose:    () => void;
  userContext?: UserContext | null;
}) {
  const EXAM_TYPES = [
    { value: 'unit_test'   as const, label: 'Unit Test',   emoji: 'ðŸ“', hint: 'Quick rescue for one unit' },
    { value: 'half_yearly' as const, label: 'Half Yearly', emoji: 'ðŸ“…', hint: 'A few chapters to revise' },
    { value: 'board'       as const, label: 'Board Exam',  emoji: 'ðŸŽ¯', hint: 'Full, high-stakes revision' },
    { value: 'other'       as const, label: 'Other',       emoji: 'ðŸ“–', hint: 'Custom exam plan' },
  ];

  const QUICK_HOURS = [
    { hours: 2,  label: '2h',  note: 'Crash rescue' },
    { hours: 6,  label: '6h',  note: 'Tonight focus' },
    { hours: 12, label: '12h', note: 'Most common' },
    { hours: 24, label: 'Tomorrow', note: 'One full day' },
    { hours: 48, label: '2 days', note: 'More breathing room' },
  ];

  const [quickChapters, setQuickChapters] = useState<QuickChapterItem[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    getQuickChapters().then(items => {
      if (!cancelled) { setQuickChapters(items); setChaptersLoading(false); }
    });
    return () => { cancelled = true; };
  }, []);

  const [step, setStep] = useState(0);
  const [validationError, setValidationError] = useState('');

  const nowLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  const handleDateTimeChange = (val: string) => {
    if (!val) {
      setCtx({ ...ctx, examDateTime: '', hoursLeft: 12 });
      return;
    }
    const diff = new Date(val).getTime() - Date.now();
    const hours = Math.max(1, Math.round(diff / 3600000));
    setCtx({ ...ctx, examDateTime: val, hoursLeft: hours });
  };

  const previewHours = ctx.examDateTime
    ? Math.max(0, Math.round((new Date(ctx.examDateTime).getTime() - Date.now()) / 3600000))
    : null;

  const examTypeMeta = EXAM_TYPES.find(t => t.value === ctx.examType) ?? EXAM_TYPES[2];
  const selectedTimingLabel = ctx.examDateTime
    ? `On ${new Date(ctx.examDateTime).toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })}`
    : ctx.hoursLeft < 24
    ? `In ${ctx.hoursLeft} hours`
    : ctx.hoursLeft === 24
    ? 'Tomorrow'
    : `${Math.round(ctx.hoursLeft / 24)} days away`;

  const focusTopics = ctx.chapters.split(',').map(t => t.trim()).filter(Boolean);
const selectedFocusLabel =
  focusTopics.length === 0
    ? 'No chapter added yet'
    : focusTopics.length === 1
    ? focusTopics[0]
    : focusTopics.length + ' Topics Selected';

const weak = userContext?.weakSubjects ?? [];
const priority = userContext?.prioritySubjects ?? [];
const effectiveHours = ctx.examDateTime
  ? Math.max(1, Math.round((new Date(ctx.examDateTime).getTime() - Date.now()) / 3600000))
  : ctx.hoursLeft;
const strategyTip = (() => {
  const subjectHint = weak.length > 0
    ? ` Focus extra on ${weak.slice(0, 2).join(' and ')}.`
    : priority.length > 0
    ? ` Prioritise ${priority.slice(0, 2).join(' and ')}.`
    : '';
  if (effectiveHours <= 2)
    return '⚡ PYQ Blitz: Only previous year questions, formulas and key definitions.' + subjectHint;
  if (effectiveHours <= 6)
    return '🔥 High-Weightage Rescue: Revise important topics and frequent concepts.' + subjectHint;
  if (effectiveHours <= 12)
    return '📚 Smart Revision: Cover selected chapters once, then revise weak points.' + subjectHint;
  return '🎯 Full Recovery Plan: Syllabus coverage, revision and practice questions.' + subjectHint;
})();

  const steps = [
    { title: 'When is the exam?', subtitle: 'Start with the timing so we can make the plan realistic.' },
    { title: 'What kind of exam is it?', subtitle: 'We will tune the rescue plan to the right level.' },
    { title: 'What should we focus on?', subtitle: 'Add chapters or topics and build the final plan.' },
  ];

  const progress = ((step + 1) / steps.length) * 100;
  const isFinalStep = step === steps.length - 1;

  const goNext = () => {
    if (step === 0) {
      const hasQuickTiming = ctx.hoursLeft > 0 && ctx.examDateTime === '';
      const hasExactTiming = ctx.examDateTime !== '';
      if (!hasQuickTiming && !hasExactTiming) {
        setValidationError('Please pick a timing option or enter an exact exam date & time.');
        return;
      }
    }
    if (step === 2 && !ctx.chapters.trim()) {
      setValidationError('Please add at least one chapter or topic to focus on.');
      return;
    }
    setValidationError('');
    setStep(s => Math.min(steps.length - 1, s + 1));
  };
  const goBack = () => { setValidationError(''); setStep(s => Math.max(0, s - 1)); };

  const timingPreset = (hours: number) => {
    setCtx({ ...ctx, hoursLeft: hours, examDateTime: '' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        className="relative bg-[#111118] border border-white/10 w-full max-w-lg rounded-t-3xl z-10 p-6 space-y-5 max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto" />

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black text-red-400/70 uppercase tracking-[0.28em]">
              Build your rescue plan
            </p>
            <h2 className="text-lg sm:text-xl font-black text-white mt-1">
              {steps[step].title}
            </h2>
            <p className="text-xs sm:text-sm text-white/40 mt-1 leading-relaxed">
              {steps[step].subtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-2 rounded-xl hover:bg-white/5 text-white/50 hover:text-white transition-colors"
            aria-label="Close emergency plan"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.25em] text-white/25">
            <span>Step {step + 1}</span>
            <span>{steps.length} total</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="text-[10px] text-white/30 uppercase tracking-wider font-black">Timing</p>
            <p className="text-sm text-white font-bold mt-1 leading-snug">{selectedTimingLabel}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="text-[10px] text-white/30 uppercase tracking-wider font-black">Exam type</p>
            <p className="text-sm text-white font-bold mt-1 leading-snug">{examTypeMeta.label}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="text-[10px] text-white/30 uppercase tracking-wider font-black">Focus</p>
            <p className="text-sm text-white font-bold mt-1 leading-snug line-clamp-2">{selectedFocusLabel}</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="timing-step"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <p className="text-xs font-black text-white/50 uppercase tracking-wider flex items-center gap-2">
                  <Calendar size={11} /> Pick a quick timing
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {QUICK_HOURS.map(option => {
                    const selected = ctx.examDateTime === '' && ctx.hoursLeft === option.hours;
                    return (
                      <button
                        key={option.label}
                        onClick={() => timingPreset(option.hours)}
                        className={cn(
                          'rounded-2xl border px-3 py-3 text-left transition-all',
                          selected
                            ? 'bg-red-500/20 border-red-500/40 shadow-lg shadow-red-950/20'
                            : 'bg-slate-800/60 border-slate-700 hover:border-slate-500'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn('text-sm font-black', selected ? 'text-red-200' : 'text-white')}>
                            {option.label}
                          </span>
                          {selected && <CheckCircle2 size={14} className="text-red-300 shrink-0" />}
                        </div>
                        <p className={cn('text-[10px] mt-1.5 font-medium', selected ? 'text-red-200/75' : 'text-slate-400')}>
                          {option.note}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-black text-white/50 uppercase tracking-wider">
                    Prefer exact date & time?
                  </p>
                  {ctx.examDateTime && (
                    <button
                      onClick={() => setCtx({ ...ctx, examDateTime: '', hoursLeft: 12 })}
                      className="text-[10px] font-black uppercase tracking-wider text-red-300 hover:text-red-200 transition-colors"
                    >
                      Use quick timing
                    </button>
                  )}
                </div>
                <input
                  type="datetime-local"
                  min={nowLocal}
                  value={ctx.examDateTime}
                  onChange={e => handleDateTimeChange(e.target.value)}
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/60 [color-scheme:dark]"
                />
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <div className="mt-0.5">
                    <Clock size={14} className="text-red-400" />
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed">
                    {ctx.examDateTime
                      ? previewHours !== null && previewHours > 0
                        ? `Great â€” we will plan around this exact time. ${previewHours >= 24
                            ? `${Math.floor(previewHours / 24)}d ${previewHours % 24}h left.`
                            : `${previewHours}h left.`}`
                        : 'This time is in the past or very close. Pick a future time.'
                      : 'Quick timings are best for fast exam rescue. Exact time is optional.'}
                  </p>
                </div>


</div>
</motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="type-step"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.18 }}
              className="space-y-3"
            >
              <p className="text-xs font-black text-white/50 uppercase tracking-wider">
                Tap the closest match
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {EXAM_TYPES.map(t => {
                  const selected = ctx.examType === t.value;
                  return (
                    <button
                      key={t.value}
                      onClick={() => setCtx({ ...ctx, examType: t.value })}
                      className={cn(
                        'rounded-2xl border px-4 py-4 text-left transition-all',
                        selected
                          ? 'bg-red-500/20 border-red-500/40 shadow-lg shadow-red-950/20'
                          : 'bg-slate-800/60 border-slate-700 hover:border-slate-500'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{t.emoji}</span>
                            <span className={cn('text-sm font-black', selected ? 'text-red-200' : 'text-white')}>
                              {t.label}
                            </span>
                          </div>
                          <p className={cn('text-xs mt-2 leading-relaxed', selected ? 'text-red-200/70' : 'text-slate-400')}>
                            {t.hint}
                          </p>
                        </div>
                        {selected && <CheckCircle2 size={16} className="text-red-300 shrink-0 mt-0.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="focus-step"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <p className="text-xs font-black text-white/50 uppercase tracking-wider">
                  What should we focus on?
                </p>
                <textarea
  value={ctx.chapters}
  onChange={e => setCtx({ ...ctx, chapters: e.target.value })}
  rows={3}
  placeholder="Enter subjects, chapters or important topics..."
  className="w-full resize-none bg-slate-800/60 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50"
/>
                <p className="text-xs text-white/35 leading-relaxed">
                  Add one subject, one chapter, or a full set of topics. We will turn it into a clear rescue plan.
                </p>
              </div>

              {!chaptersLoading && quickChapters.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.25em]">
                      Your chapters
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {quickChapters.map(item => {
                        const isSelected = ctx.chapters.split(',').map(c => c.trim()).includes(item.name);
                        return (
                          <button
                            key={item.name}
                            onClick={() => setCtx({ ...ctx, chapters: ctx.chapters.trim() ? ctx.chapters + ', ' + item.name : item.name })}
                            className={cn(
                              'px-3 py-2 rounded-full border text-xs font-bold transition-all flex items-center gap-1.5',
                              isSelected
                                ? 'bg-red-500/20 border-red-500/40 text-red-200'
                                : item.isWeak
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:border-amber-400'
                                : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
                            )}
                          >
                            {item.isWeak && <AlertCircle size={11} className="shrink-0" />}
                            {item.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {chaptersLoading && (
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-8 w-24 rounded-full bg-white/5 animate-pulse" />
                    ))}
                  </div>
                )}

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                <p className="text-xs font-black text-white/50 uppercase tracking-wider">
                  Rescue plan preview
                </p>
                <div className="space-y-2 text-sm text-white/70">
                  <p>• Exam: <span className="text-white font-bold">{examTypeMeta.label}</span></p>
                  <p>• Timing: <span className="text-white font-bold">{selectedTimingLabel}</span></p>
                  <p>• Focus: <span className="text-white font-bold">{selectedFocusLabel}</span></p>
                </div>

<div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
  <p className="text-[10px] font-black uppercase tracking-wider text-amber-300 mb-1">
    AI Strategy
  </p>
  <p className="text-sm text-amber-100 leading-relaxed">
    {strategyTip}
  </p>
</div>

</div>
</motion.div>
          )}
        </AnimatePresence>

        {validationError && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/30">
            <div className="w-1 h-8 bg-red-500 rounded-full shrink-0" />
            <p className="text-sm text-red-300 font-medium">{validationError}</p>
          </div>
        )}
        <div className="flex gap-3 pt-1">
          <button
            onClick={step === 0 ? onClose : goBack}
            className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm font-black text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          {!isFinalStep ? (
            <button
              onClick={goNext}
              className="flex-1 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-red-900/40 hover:opacity-95 transition-opacity"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={onStart}
              className="flex-1 bg-gradient-to-r from-red-500 to-orange-500 text-white font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm shadow-lg shadow-red-900/50 transition-all active:scale-[0.98]"
            >
              <Zap size={16} className="fill-white" /> Build My Rescue Plan
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// â”€â”€â”€ CountdownHero â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function CountdownHero({ countdown }: { countdown: { days: number; hours: number; minutes: number; seconds: number } }) {
  const totalHours  = countdown.days * 24 + countdown.hours;
  const isPanic     = totalHours < 3;
  const isCritical  = totalHours < 12;
  const isToday     = countdown.days === 0;
  const isComfy     = totalHours >= 48;

  const accentColor = isPanic
    ? { text: 'text-red-400',     bar: 'bg-red-500',     bg: 'bg-red-950/40 border-red-500/20',     label: 'text-red-300/70'     }
    : isCritical
    ? { text: 'text-orange-400',  bar: 'bg-orange-500',  bg: 'bg-orange-950/30 border-orange-500/15', label: 'text-orange-300/70'  }
    : isComfy
    ? { text: 'text-emerald-400', bar: 'bg-emerald-500', bg: 'bg-emerald-950/20 border-emerald-500/10', label: 'text-emerald-300/70' }
    : { text: 'text-yellow-400',  bar: 'bg-yellow-400',  bg: 'bg-yellow-950/20 border-yellow-500/10', label: 'text-yellow-300/70'  };

  const phrase = isPanic
    ? 'Every minute counts. Stay locked in. ⚡'
    : isCritical
    ? 'This is your moment. Make it count. 🔥'
    : isComfy
    ? 'You have time. Use it wisely. 💪'
    : 'Stay focused. The plan is working. 🎯';

  const units = [
    { val: countdown.days,    label: 'days' },
    { val: countdown.hours,   label: 'hrs'  },
    { val: countdown.minutes, label: 'min'  },
    { val: countdown.seconds, label: 'sec'  },
  ];

  return (
    <div className={cn('rounded-2xl p-5 border transition-all duration-700', accentColor.bg)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={cn('w-1.5 h-1.5 rounded-full', isPanic ? 'animate-ping bg-red-400' : 'bg-white/20')} />
          <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Time to exam</span>
        </div>
        {isToday && (
          <span className={cn('text-[10px] font-black px-2.5 py-1 rounded-full border border-current/30', accentColor.text)}>
            EXAM DAY
          </span>
        )}
      </div>

      <div className="flex items-end gap-5 sm:gap-8">
        {units.map(({ val, label }, i) => (
          <div key={label} className="text-center">
            {i === 3 ? (
              <motion.p
                key={val}
                initial={{ opacity: 0.4, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={cn('text-4xl sm:text-5xl font-black tabular-nums leading-none', accentColor.text)}
              >
                {String(val).padStart(2, '0')}
              </motion.p>
            ) : (
              <p className={cn('text-4xl sm:text-5xl font-black tabular-nums leading-none',
                i === 0 && countdown.days > 0 ? 'text-white' : accentColor.text
              )}>
                {String(val).padStart(2, '00')}
              </p>
            )}
            <p className={cn('text-[10px] font-bold mt-2 uppercase tracking-widest', accentColor.label)}>{label}</p>
          </div>
        ))}
      </div>

      <p className={cn('text-xs font-bold mt-4 leading-relaxed', accentColor.text)}>{phrase}</p>
    </div>
  );
}

// â”€â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const EmergencyModePage = () => {
  const { isPro, user, updateUser } = useAuth();
  const trialUsed      = user?.emergencyTrialUsed ?? false;
  const hasFreeTrial   = !isPro && !trialUsed;
  const trialExhausted = !isPro && trialUsed;
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [loadState,    setLoadState]     = useState<LoadState>(() => {
    try {
      const saved = sessionStorage.getItem('em_loadState');
      return saved === 'success' ? 'success' : 'idle';
    } catch { return 'idle'; }
  });
  const [data,         setData]          = useState<EmergencyData | null>(() => {
    try {
      const saved = sessionStorage.getItem('em_data');
      return saved ? (JSON.parse(saved) as EmergencyData) : null;
    } catch { return null; }
  });
  const [errorMsg,     setErrorMsg]      = useState('');
  const [checked,      setChecked]       = useState<Set<number>>(new Set());
  const [focusIndex,   setFocusIndex]    = useState<number | null>(null);
  const [expandedIdx,  setExpandedIdx]   = useState<number | null>(null);
  const [showContext,  setShowContext]    = useState(false);
  const [examContext,  setExamContext]   = useState<ExamContext>(() => {
    try {
      const saved = sessionStorage.getItem('em_examContext');
      if (saved) return JSON.parse(saved) as ExamContext;
    } catch { /* ignore */ }
    return { examType: 'board', chapters: '', hoursLeft: 12, examDateTime: '' };
  });

  const countdownSource = data?.userContext?.examDate || examContext.examDateTime || null;
  const countdown = useCountdown(countdownSource);

  // Persist Emergency Mode state across navigation
  useEffect(() => {
    try { sessionStorage.setItem('em_loadState', loadState); } catch { /* ignore */ }
  }, [loadState]);
  useEffect(() => {
    try {
      if (data) sessionStorage.setItem('em_data', JSON.stringify(data));
      else sessionStorage.removeItem('em_data');
    } catch { /* ignore */ }
  }, [data]);
  useEffect(() => {
    try { sessionStorage.setItem('em_examContext', JSON.stringify(examContext)); } catch { /* ignore */ }
  }, [examContext]);

  // â”€â”€ Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleStart = async (ctx: ExamContext = examContext) => {
    setShowContext(false);
    setLoadState('loading');
    setData(null);
    setErrorMsg('');
    setChecked(new Set());
    setFocusIndex(null);
    setExpandedIdx(null);
    let effectiveHours = ctx.hoursLeft;
    if (ctx.examDateTime) {
      const diff = new Date(ctx.examDateTime).getTime() - Date.now();
      effectiveHours = Math.max(1, Math.round(diff / 3600000));
    }
    // Persist exam date to backend — either exact datetime chosen, or approximate
    // from quick-timing (e.g. "12h" → now + 12 hours). This ensures the countdown
    // and data survive navigation away and back.
    const examDateToSave = ctx.examDateTime
      ? new Date(ctx.examDateTime).toISOString()
      : new Date(Date.now() + effectiveHours * 3600000).toISOString();
    updateProfile({ examDate: examDateToSave }).catch(() => {});
    // Also update local examContext so the countdown ticks from the correct time
    if (!ctx.examDateTime) {
      setExamContext(prev => ({ ...prev, examDateTime: examDateToSave }));
    }

    try {
      const params = `?examType=${ctx.examType}&chapters=${encodeURIComponent(ctx.chapters)}&hoursLeft=${effectiveHours}`;
      const result = await api.get<EmergencyData>(`/api/emergency${params}`);
      if (!result || typeof result.mode !== 'string' || !Array.isArray(result.items)) {
        setErrorMsg('Invalid response from server. Please try again.');
        setLoadState('error');
        return;
      }
      setData({
        mode:        result.mode,
        items:       result.items.slice(0, 5).map(item => ({
          title:    (item?.title ?? '').trim() || 'Untitled',
          content:  item?.content ?? '',
          tag:      item?.tag,
          priority: item?.priority,
        })),
        aiTips:      Array.isArray(result.aiTips) ? result.aiTips : [],
        userContext: result.userContext,
      });
      setLoadState('success');
      // Mark free trial as used locally so ProGate appears next time, without a refresh
      if (!isPro && !trialUsed) {
        updateUser({ emergencyTrialUsed: true });
      }
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? (err.message || 'Request failed.') : 'Something went wrong.');
      setLoadState('error');
    }
  };

  const toggleChecked = (i: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setChecked(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const reset = () => {
    setLoadState('idle');
    setData(null);
    setChecked(new Set());
    setExamContext({ examType: 'board', chapters: '', hoursLeft: 12, examDateTime: '' });
  };

  // â”€â”€ Derived values â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const meta       = data ? (MODE_META[data.mode] ?? MODE_META.empty) : null;
  const ModeIcon   = meta?.icon ?? BookOpen;
  const totalItems = data?.items.length ?? 0;
  const doneCount  = checked.size;
  const progress   = totalItems > 0 ? Math.round((doneCount / totalItems) * 100) : 0;
  const allDone    = totalItems > 0 && doneCount === totalItems;
  const highCount  = data?.items.filter(i => i.priority === 'high').length ?? 0;
  const firstName  = data?.userContext.name.split(' ')[0] ?? 'Topper';
  const urgencyLevel = data?.userContext.urgencyLevel ?? 'unknown';
  const prioritySubjects = data?.userContext.prioritySubjects ?? [];
  const urgencyColor = urgencyLevel === 'panic' ? 'text-red-400' : urgencyLevel === 'high' ? 'text-orange-400' : urgencyLevel === 'medium' ? 'text-yellow-400' : 'text-green-400';

  // â”€â”€ Early returns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  if (trialExhausted) return (
    <>
      <ProGate onUpgradeClick={() => setShowUpgradeModal(true)} />
      {showUpgradeModal && <UpgradeModal onClose={() => setShowUpgradeModal(false)} />}
    </>
  );

  if (focusIndex !== null && data && data.items[focusIndex]) {
    const item   = data.items[focusIndex];
    const isDone = checked.has(focusIndex);
    const grad   = GRADIENT[data.mode];
    return (
      <div className="fixed inset-0 z-50 bg-[#0a0a0f] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="bg-red-500/20 p-1.5 rounded-lg"><Zap size={16} className="text-red-400 fill-red-400" /></div>
            <span className="text-xs font-black text-white/50 uppercase tracking-widest">Focused Revision</span>
            {item.priority === 'high' && (
              <span className="text-[10px] font-black text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">WEAK</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/30">{focusIndex + 1}/{data.items.length}</span>
            <button onClick={() => setFocusIndex(null)} className="p-1.5 bg-white/10 rounded-lg text-white/50 hover:bg-white/20 transition-colors"><Minimize2 size={16} /></button>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 overflow-y-auto">
          <motion.div
            key={focusIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="w-full max-w-lg space-y-5"
          >
            {item.tag && (
              <span className="text-xs font-black text-white/30 uppercase tracking-wider bg-white/5 px-3 py-1 rounded-full inline-block">{item.tag}</span>
            )}
            <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black text-white bg-gradient-to-br shadow-lg', grad)}>
              {focusIndex + 1}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">{item.title}</h2>
            {item.content && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <p className="text-base text-white/60 leading-relaxed whitespace-pre-wrap">{item.content}</p>
              </div>
            )}
            <motion.button
              onClick={e => toggleChecked(focusIndex, e)}
              whileTap={{ scale: 0.9 }}
              className={cn(
                'flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-sm transition-colors',
                isDone ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'
              )}
            >
              <CheckCheck size={16} />
              {isDone ? 'Revised!' : 'Mark as Revised'}
            </motion.button>
          </motion.div>
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-t border-white/10">
          <button
            onClick={() => setFocusIndex(Math.max(0, focusIndex - 1))}
            disabled={focusIndex === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 rounded-xl text-white/60 hover:bg-white/20 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-sm font-bold"
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <div className="flex gap-1.5">
            {data.items.map((_, i) => (
              <button key={i} onClick={() => setFocusIndex(i)}
                className={cn('h-2 rounded-full transition-all', i === focusIndex ? 'bg-red-400 w-5' : checked.has(i) ? 'bg-emerald-500 w-2' : 'bg-white/20 w-2')} />
            ))}
          </div>
          <button
            onClick={() => focusIndex < data.items.length - 1 ? setFocusIndex(focusIndex + 1) : setFocusIndex(null)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 rounded-xl text-white/60 hover:bg-white/20 transition-all text-sm font-bold"
          >
            {focusIndex < data.items.length - 1
              ? <><span>Next</span><ChevronRight size={16} /></>
              : <><span>Done</span><CheckCheck size={16} /></>}
          </button>
        </div>
      </div>
    );
  }

  // â”€â”€ Main render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <AppLayout>
      <main className="flex-1 min-w-0 overflow-y-auto h-screen bg-[#0a0a0f]">

        {/* Header */}
        <header className="sticky top-0 z-20 bg-gradient-to-r from-red-700 via-red-600 to-orange-600 px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between shadow-xl shadow-red-950/60">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm p-1.5 rounded-lg border border-white/20">
              <Zap size={18} className="text-white fill-white" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black text-white tracking-tight">Emergency Mode</h1>
              <p className="text-[9px] text-red-100/60 uppercase tracking-widest font-bold hidden sm:block">Exam Survival Â· AI Powered</p>
            </div>
          </div>
          {loadState === 'success' && data && (
            <div className="flex items-center gap-2">
              {data.items.length > 0 && (
                <button onClick={() => setFocusIndex(0)}
                  className="flex items-center gap-1.5 text-xs font-black text-white bg-white/20 px-3 py-1.5 rounded-full border border-white/20 hover:bg-white/30 transition-colors">
                  <Maximize2 size={11} /> Focus
                </button>
              )}

              <button onClick={reset} className="p-1.5 bg-white/20 rounded-lg border border-white/20 text-white hover:bg-white/30 transition-colors">
                <RefreshCw size={14} />
              </button>
              <button
                onClick={() => { updateProfile({ examDate: null }).catch(() => {}); reset(); }}
                className="flex items-center gap-1.5 text-xs font-black text-red-200 bg-black/30 px-3 py-1.5 rounded-full border border-red-400/30 hover:bg-black/50 transition-colors">
                <X size={11} /> End Session
              </button>
            </div>
          )}
        </header>

        <div className="p-4 sm:p-6 space-y-4 max-w-2xl mx-auto pb-24">

          {/* â”€â”€ Idle / Error â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {(loadState === 'idle' || loadState === 'error') && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="relative rounded-3xl overflow-hidden border border-red-500/20"
              style={{ background: 'linear-gradient(135deg, #0c0608 0%, #160a0a 50%, #0c0c0f 100%)' }}
            >
              <div className="absolute top-0 left-1/3 w-72 h-72 bg-red-600/12 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-48 h-48 bg-orange-600/8 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse inline-block" />
                  <span className="text-[10px] font-black text-red-400/70 uppercase tracking-widest">Emergency Mode Active</span>
                  {hasFreeTrial && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="inline-flex items-center gap-1.5 text-[10px] font-black text-amber-200 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/40 px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm shadow-amber-900/30"
                    >
                      <Sparkles size={10} className="text-amber-300" />
                      1 Free Trial Available
                    </motion.span>
                  )}
                </div>
                <div>
                  <h2 className="text-4xl sm:text-5xl font-black text-white leading-none tracking-tight">
                    Exam in a<br />
                    <span className="text-red-400">few hours?</span>
                  </h2>
                  <p className="text-sm text-white/35 mt-4 leading-relaxed max-w-sm">
                    Pulls your notes and doubts, prioritises weak subjects, generates AI revision tips â€” in one focused session.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['Weak-subject priority', 'AI revision tips', 'Live exam countdown', 'Focus revision mode'].map(f => (
                    <span key={f} className="text-[10px] font-bold text-white/40 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">{f}</span>
                  ))}
                </div>
                <button
                  onClick={() => setShowContext(true)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-red-500 hover:bg-red-400 text-white font-black px-8 py-4 rounded-2xl text-base shadow-2xl shadow-red-900/50 transition-all active:scale-[0.97]"
                >
                  <Zap size={18} className="fill-white" />
                  Start Emergency Session
                  <ArrowRight size={16} />
                </button>
                {loadState === 'error' && errorMsg && (
                  <div className="bg-red-950/50 border border-red-500/30 rounded-xl p-3 flex items-start gap-2.5">
                    <AlertTriangle size={15} className="text-red-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-300">{errorMsg}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* â”€â”€ Loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {loadState === 'loading' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-[#111118] border border-white/10 rounded-3xl p-12 flex flex-col items-center gap-5"
            >
              <div className="relative">
                <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center">
                  <Zap size={28} className="text-red-400 fill-red-400" />
                </div>
                <div className="absolute -inset-1 border-2 border-red-500/30 rounded-2xl animate-ping" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-black text-white">Fetching your content...</p>
                <p className="text-xs text-white/30">Filtering academic doubts Â· Generating AI tips</p>
              </div>
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </motion.div>
          )}

          {/* â”€â”€ Success â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {loadState === 'success' && data && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

              {/* Countdown */}
              {countdown && <CountdownHero countdown={countdown} />}

                            {/* Emergency Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-red-500/20 bg-red-950/30 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-300/80">Urgency</p>
                  <p className="mt-2 text-lg font-black text-white capitalize">{urgencyLevel}</p>
                  <p className="text-xs text-white/35 mt-1">Personalized by your exam date</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Time Left</p>
                  <p className="mt-2 text-lg font-black text-white">
                    {data.userContext.timeRemainingMinutes === null ? 'Set exam date' : `${data.userContext.timeRemainingMinutes} min`}
                  </p>
                  <p className="text-xs text-white/35 mt-1">Live from your saved exam date</p>
                </div>
                <div className="rounded-2xl border border-amber-500/20 bg-amber-950/30 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-300/80">Priority Subjects</p>
                  <p className="mt-2 text-lg font-black text-white">
                    {prioritySubjects.length > 0 ? prioritySubjects.slice(0, 3).join(', ') : 'No weak subjects yet'}
                  </p>
                  <p className="text-xs text-white/35 mt-1">Top subjects to revise first</p>
                </div>
              </div>

              {/* Stats */}
              {meta && (
                <div className={cn('rounded-2xl p-4 flex items-center gap-4 border border-white/10', meta.bg)}>
                  <div className={cn('p-2.5 rounded-xl border border-white/10', meta.bg)}>
                    <ModeIcon size={18} className={meta.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-xs font-black uppercase tracking-wider mb-0.5', meta.color)}>Source: {meta.label}</p>
                    <p className="text-sm text-white/40">{meta.description}</p>
                  </div>
                </div>
              )}

              {/* AI Tips */}
              {data.aiTips.length > 0 && <AiTipsSection tips={data.aiTips} />}

              {/* Empty state */}
              {(data.mode === 'empty' || data.items.length === 0) ? (
                <div className="bg-[#111118] border border-white/10 rounded-3xl p-10 flex flex-col items-center gap-4 text-center">
                  <BookOpen size={32} className="text-white/20" />
                  <div>
                    <p className="font-bold text-white/60 mb-1">Nothing to show yet</p>
                    <p className="text-sm text-white/30">Create notes or ask doubts first, then come back.</p>
                  </div>
                  <div className="flex gap-3 flex-wrap justify-center">
                    <Link to="/my-notes"><Button variant="secondary" className="gap-1.5 text-sm"><FileText size={14} /> Write Notes</Button></Link>
                    <Link to="/doubt-solver"><Button variant="secondary" className="gap-1.5 text-sm"><MessageCircle size={14} /> Ask a Doubt</Button></Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">

                  {/* Progress bar */}
                  <div className="bg-[#111118] border border-white/10 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Flame size={15} className="text-red-400" />
                        <span className="font-extrabold text-white text-sm">{doneCount}/{totalItems} revised</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {allDone && (
                          <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">All done!</span>
                        )}
                        <button onClick={() => setFocusIndex(0)}
                          className="flex items-center gap-1.5 text-xs font-black text-red-300 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl hover:bg-red-500/20 transition-colors">
                          <Maximize2 size={12} /> Focused Revision
                        </button>
                      </div>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        className={cn('h-full rounded-full', allDone ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-red-500 to-orange-500')}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                    <p className="text-xs text-white/20">Tap to expand Â· check off when revised Â· Focused Revision for deep review</p>
                  </div>

                  {/* Item list with stagger */}
                  <motion.div
                    className="space-y-3"
                    variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } }}
                    initial="hidden"
                    animate="show"
                  >
                    {data.items.map((item, i) => {
                      const isDone     = checked.has(i);
                      const isExpanded = expandedIdx === i;
                      const isHigh     = item.priority === 'high';
                      return (
                        <motion.div
                          key={i}
                          variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 340, damping: 28 } } }}
                          onClick={() => setExpandedIdx(isExpanded ? null : i)}
                          className={cn(
                            'rounded-2xl overflow-hidden border transition-all cursor-pointer',
                            isDone     ? 'border-emerald-500/20 bg-emerald-950/20' :
                            isHigh     ? 'border-amber-500/20 bg-[#111118]' :
                            isExpanded ? 'border-red-500/20 bg-[#0f0f18]' :
                            'border-white/5 bg-[#111118] hover:border-white/10'
                          )}
                        >
                          <div className="p-4 sm:p-5 flex items-start gap-3">
                            <div className={cn(
                              'shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white bg-gradient-to-br shadow-lg',
                              isDone ? 'from-emerald-500 to-emerald-600' : GRADIENT[data.mode]
                            )}>
                              {isDone ? <CheckCheck size={14} /> : i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                {isHigh && (
                                  <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Weak Subject</span>
                                )}
                                {item.tag && !isHigh && (
                                  <span className="text-[9px] font-bold text-white/20 bg-white/5 px-1.5 py-0.5 rounded-full">{item.tag}</span>
                                )}
                              </div>
                              <p className={cn('font-extrabold text-sm leading-snug break-words', isDone ? 'text-white/25 line-through' : 'text-white')}>
                                {item.title}
                              </p>
                              {item.content && !isExpanded && (
                                <p className="text-xs text-white/25 mt-1 line-clamp-1">{item.content}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <motion.button
                                onClick={e => toggleChecked(i, e)}
                                whileTap={{ scale: 0.78 }}
                                className={cn(
                                  'p-1.5 rounded-lg transition-colors',
                                  isDone ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/25 hover:bg-emerald-500/10 hover:text-emerald-400'
                                )}
                              >
                                <CheckCheck size={14} />
                              </motion.button>
                              <ChevronRight size={15} className={cn('text-white/15 transition-transform', isExpanded && 'rotate-90')} />
                            </div>
                          </div>
                          <AnimatePresence>
                            {isExpanded && item.content && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 sm:px-5 pb-4">
                                  <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                                    <p className="text-sm text-white/50 leading-relaxed whitespace-pre-wrap break-words">{item.content}</p>
                                  </div>


</div>
</motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </motion.div>

                  {/* Footer CTA */}
                  <div className="bg-[#0d0d14] border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="font-extrabold text-white mb-1 text-sm">
                        {allDone ? `All revised, ${firstName}. You are ready.` : `You have got this, ${firstName}.`}
                      </h3>
                      <p className="text-xs text-white/30">Need help? Ask a doubt or run a quick mock test.</p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Link to="/doubt-solver" className="flex-1 sm:flex-none">
                        <Button variant="secondary" fullWidth className="gap-1.5 text-xs justify-center bg-blue-600 hover:bg-blue-700 text-white border-0">
                          Ask Doubt <ArrowRight size={12} />
                        </Button>
                      </Link>
                      <Link to="/simulation" className="flex-1 sm:flex-none">
                        <Button variant="secondary" fullWidth className="gap-1.5 text-xs justify-center bg-white/5 hover:bg-white/10 text-white border border-white/10">
                          Mock Test <ChevronRight size={12} />
                        </Button>
                      </Link>
                    </div>
                  </div>

                </div>
              )}
            </motion.div>
          )}

        </div>
      </main>

      <AnimatePresence>
        {showContext && (
          <ExamContextSheet
            ctx={examContext}
            setCtx={setExamContext}
            onStart={() => handleStart(examContext)}
            userContext={data?.userContext ?? null}
            onClose={() => setShowContext(false)}
          />
        )}
      </AnimatePresence>
    </AppLayout>
  );
};

export default EmergencyModePage;






















import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { cn } from '../utils/cn';
import { useAuth } from '../context/AuthContext';
import { getChaptersBySubject } from '../services/notesService';
import { Chapter } from '../types/index';
import { submitQuizAttempt, completeChapter, getQuizStats, getRecentQuizAttempts, QuizStats, QuizAttemptRecord } from '../services/dashboardService';
import {
  Timer, FileCheck, ChevronRight, AlertCircle, Play, Trophy,
  BarChart2, Target, Zap, Lock, CheckCircle2, XCircle,
  AlertTriangle, Star, Loader2, ChevronLeft
} from 'lucide-react';

const SUBJECT_CATALOGUE = [
  {
    id: 'algebra',
    name: 'Algebra',
    emoji: '📐',
    color: 'from-blue-500 to-blue-600',
    light: 'bg-blue-50',
    text: 'text-blue-700',
    free: true,
  },
  {
    id: 'geometry',
    name: 'Geometry',
    emoji: '📏',
    color: 'from-violet-500 to-violet-600',
    light: 'bg-violet-50',
    text: 'text-violet-700',
    free: true,
  },
  {
    id: 'science1',
    name: 'Science Part 1',
    emoji: '🧪',
    color: 'from-emerald-500 to-teal-500',
    light: 'bg-emerald-50',
    text: 'text-emerald-700',
    free: true,
  },
  {
    id: 'science2',
    name: 'Science Part 2',
    emoji: '🧬',
    color: 'from-green-500 to-green-600',
    light: 'bg-green-50',
    text: 'text-green-700',
    free: false,
  },
  {
    id: 'history',
    name: 'History & Pol Sc',
    emoji: '🏛️',
    color: 'from-amber-500 to-orange-500',
    light: 'bg-amber-50',
    text: 'text-amber-700',
    free: false,
  },
  {
    id: 'geography',
    name: 'Geography',
    emoji: '🌍',
    color: 'from-cyan-500 to-sky-500',
    light: 'bg-cyan-50',
    text: 'text-cyan-700',
    free: false,
  },
  {
    id: 'english',
    name: 'English',
    emoji: '📘',
    color: 'from-rose-500 to-pink-500',
    light: 'bg-rose-50',
    text: 'text-rose-700',
    free: false,
  },
] as const;

type SubjectEntry = typeof SUBJECT_CATALOGUE[number];

interface GeneratedQuestion {
  question: string;
  options: string[];
  correct_index: number;
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
}

type QuizPhase = 'idle' | 'selectChapter' | 'loading' | 'active' | 'result' | 'error';

export const ExamSimulation = () => {
  const { isPro } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats]               = useState<QuizStats>({ averageScore: null, bestScore: null, totalAttempts: 0, subjectBreakdown: [], weakestSubject: null });
  const [statsLoading, setStatsLoading] = useState(true);
  const [recentAttempts, setRecentAttempts] = useState<QuizAttemptRecord[]>([]);
  const [phase,           setPhase]           = useState<QuizPhase>('idle');
  const [selectedSubject, setSelectedSubject] = useState<SubjectEntry | null>(null);
  const [questions,       setQuestions]       = useState<GeneratedQuestion[]>([]);
  const [currentQ,        setCurrentQ]        = useState(0);
  const [answers,         setAnswers]         = useState<(number | null)[]>([]);
  const [timeLeft,        setTimeLeft]        = useState(0);
  const [generateError,   setGenerateError]   = useState<string | null>(null);
  const [isSubmitting,    setIsSubmitting]     = useState(false);
  const [chapters,        setChapters]         = useState<Chapter[]>([]);
  const [chaptersLoading, setChaptersLoading]  = useState(false);
  const [selectedChapterId, setSelectedChapterId] = useState<string | undefined>(undefined);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    const [statsRes, attemptsRes] = await Promise.all([
      getQuizStats(),
      getRecentQuizAttempts(10),
    ]);
    setStats(statsRes.data);
    setRecentAttempts([...attemptsRes.data].reverse()); // oldest ? newest for chart
    setStatsLoading(false);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const handleSubmit = useCallback(async () => {
    if (phase !== 'active') return;
    setIsSubmitting(true);
    const correct = answers.filter((a, i) => a === questions[i]?.correct_index).length;
    const score = Math.round((correct / questions.length) * 100);
    try {
      if (selectedSubject) {
        await submitQuizAttempt({ subjectId: selectedSubject.id, score, totalQ: questions.length });
        if (selectedChapterId) {
          await completeChapter({ subjectId: selectedSubject.id, chapterId: selectedChapterId, score });
        }
      }
    } catch {
      // Non-fatal
    } finally {
      setIsSubmitting(false);
      setPhase('result');
      loadStats();
    }
  }, [phase, answers, questions, selectedSubject, selectedChapterId, loadStats]);

  useEffect(() => {
    if (phase !== 'active' || timeLeft <= 0) return;
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, timeLeft, handleSubmit]);
  const handleSelectSubject = async (subject: SubjectEntry) => {
    setSelectedSubject(subject);
    setChapters([]);
    setChaptersLoading(true);
    const result = await getChaptersBySubject(subject.id);
    setChaptersLoading(false);
    if (result.error || result.data.length === 0) {
      handleStartQuiz(subject);
      return;
    }
    setChapters(result.data);
    setPhase('selectChapter');
  };


  const handleStartQuiz = async (subject: SubjectEntry, chapterId?: string) => {
    setSelectedSubject(subject);
    setSelectedChapterId(chapterId);
    setPhase('loading');
    setGenerateError(null);
    try {
      const token    = localStorage.getItem('bt_token');
      const BASE_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:5000';
      const res = await fetch(
        `${BASE_URL}/api/quiz/generate?subjectId=${subject.id}&count=10${chapterId ? ("&chapterId=" + chapterId) : ""}`, 
        { headers: { Authorization: `Bearer ${token ?? ''}` } }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? 'Failed to generate quiz');
      }
      const data = await res.json() as { data: { questions: GeneratedQuestion[] } };
      const qs = data.data?.questions ?? [];
      if (qs.length === 0) throw new Error('No questions returned. Try again.');
      setQuestions(qs);
      setAnswers(new Array(qs.length).fill(null));
      setCurrentQ(0);
      setTimeLeft(Math.min(qs.length * 90, 1200));
      setPhase('active');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Quiz generation failed';
      setGenerateError(msg);
      setPhase('error');
    }
  };

  const handleAnswer = (optionIndex: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentQ] = optionIndex;
      return next;
    });
  };

  const handleNext = () => {
    if (currentQ < questions.length - 1) setCurrentQ((q) => q + 1);
  };

  const handlePrev = () => {
    if (currentQ > 0) setCurrentQ((q) => q - 1);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (phase === 'selectChapter') {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto px-4 py-10">
          <button onClick={() => setPhase('idle')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6">
            <ChevronLeft size={16} /> Back to Subjects
          </button>
          <h2 className="text-xl font-bold mb-1">{selectedSubject?.name}</h2>
          <p className="text-gray-500 text-sm mb-6">Choose a chapter or take a mixed test</p>
          {chaptersLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin" size={28} /></div>
          ) : (
            <div className="flex flex-col gap-3">
              <button onClick={() => selectedSubject && handleStartQuiz(selectedSubject)} className="w-full text-left px-5 py-4 rounded-xl border-2 border-indigo-500 bg-indigo-50 hover:bg-indigo-100 font-semibold text-indigo-700">
                Full Subject - Mixed Chapters
              </button>
              {chapters.map(ch => (
                <button key={ch.id} onClick={() => selectedSubject && handleStartQuiz(selectedSubject, ch.id)} className="w-full text-left px-5 py-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-gray-50 transition">
                  {ch.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </AppLayout>
    );
  }

  if (phase === 'loading') {
    return (
      <AppLayout>
        <main className="flex-1 min-w-0 overflow-y-auto h-screen page-enter flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="animate-spin text-blue-500 mx-auto" size={32} />
            <p className="text-base font-bold text-slate-800">Generating your {selectedSubject?.name} quiz?</p>
            <p className="text-xs text-slate-400">Tailored to Maharashtra SSC board pattern</p>
          </div>
        </main>
      </AppLayout>
    );
  }

  if (phase === 'error') {
    return (
      <AppLayout>
        <main className="flex-1 min-w-0 overflow-y-auto h-screen page-enter flex items-center justify-center">
          <div className="text-center space-y-4 max-w-sm mx-auto px-4">
            <div className="inline-flex p-4 bg-red-50 rounded-2xl">
              <AlertCircle size={32} className="text-red-500" />
            </div>
            <p className="text-sm font-bold text-slate-800">{generateError}</p>
            <Button variant="secondary" className="justify-center" onClick={() => setPhase('idle')}>
              Try Again
            </Button>
          </div>
        </main>
      </AppLayout>
    );
  }

  if (phase === 'active') {
    const q        = questions[currentQ];
    const selected = answers[currentQ];
    const progress = ((currentQ + 1) / questions.length) * 100;
    const isLast   = currentQ === questions.length - 1;

    return (
      <AppLayout>
        <main className="flex-1 min-w-0 overflow-y-auto h-screen page-enter">
          <header className="sticky top-0 z-20 bg-white border-b border-slate-100 px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900">{selectedSubject?.name} Quiz</h1>
              <p className="text-xs text-slate-500">Q{currentQ + 1} of {questions.length}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold',
                timeLeft < 60 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'
              )}>
                <Timer size={12} />
                {formatTime(timeLeft)}
              </div>
              <button onClick={() => setPhase('idle')} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                Exit
              </button>
            </div>
          </header>

          <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>

            <div className="flex items-center gap-1.5 justify-center flex-wrap">
              {questions.map((_, idx) => (
                <div
                  key={idx}
                  onClick={() => setCurrentQ(idx)}
                  className={cn(
                    'w-2 h-2 rounded-full cursor-pointer transition-all',
                    idx === currentQ ? 'bg-blue-600 w-4' : answers[idx] !== null ? 'bg-emerald-400' : 'bg-slate-200'
                  )}
                />
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <p className="text-base font-bold text-slate-900 leading-relaxed mb-6">{q.question}</p>
              <div className="space-y-3">
                {q.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    className={cn(
                      'w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all',
                      selected === idx
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                    )}
                  >
                    <span className="font-black mr-2">{String.fromCharCode(65 + idx)}.</span> {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" className="justify-center gap-2" onClick={handlePrev} disabled={currentQ === 0}>
                <ChevronLeft size={15} /> Prev
              </Button>
              {isLast ? (
                <Button
                  variant="secondary"
                  fullWidth
                  className="bg-blue-600 hover:bg-blue-500 justify-center gap-2"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  Submit Test
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  fullWidth
                  className="bg-blue-600 hover:bg-blue-500 justify-center gap-2"
                  onClick={handleNext}
                >
                  Next Question <ChevronRight size={15} />
                </Button>
              )}
            </div>
          </div>
        </main>
      </AppLayout>
    );
  }

  if (phase === 'result') {
    const total        = questions.length;
    const correct      = answers.filter((a, i) => a === questions[i]?.correct_index).length;
    const scorePercent = Math.round((correct / total) * 100);
    const passed       = scorePercent >= 35;
    const scoreColor   = scorePercent >= 80 ? 'text-emerald-600' : scorePercent >= 60 ? 'text-amber-500' : 'text-red-500';

    return (
      <AppLayout>
        <main className="flex-1 min-w-0 overflow-y-auto h-screen page-enter">
          <div className="p-4 sm:p-6 max-w-xl mx-auto space-y-5 pt-10">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-lg p-8 text-center space-y-4">
              <div className={cn('inline-flex p-4 rounded-2xl', passed ? 'bg-emerald-50' : 'bg-red-50')}>
                {passed ? <Trophy size={32} className="text-amber-500" /> : <AlertTriangle size={32} className="text-red-500" />}
              </div>
              <div>
                <p className={cn('text-5xl font-black', scoreColor)}>{scorePercent}%</p>
                <p className="text-sm text-slate-500 mt-1">{correct} / {total} correct</p>
              </div>
              <div className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black',
                passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              )}>
                {passed ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                {passed ? 'Passed' : 'Needs Improvement'}
              </div>
              {isSubmitting && <p className="text-xs text-slate-400">Saving your scoreâ€¦</p>}
            </div>

            <div className="space-y-2">
              <h3 className="font-extrabold text-slate-900 text-sm px-1">Answer Review</h3>
              {questions.map((qItem, idx) => {
                const userAns   = answers[idx];
                const isCorrect = userAns === qItem.correct_index;
                return (
                  <div key={idx} className={cn('bg-white rounded-xl border p-4 text-sm', isCorrect ? 'border-emerald-200' : 'border-red-200')}>
                    <p className="font-semibold text-slate-800 mb-2">{idx + 1}. {qItem.question}</p>
                    <div className="flex flex-col gap-1">
                      {userAns !== null && !isCorrect && (
                        <p className="text-red-600 flex items-center gap-1">
                          <XCircle size={12} /> Your answer: {qItem.options[userAns]}
                        </p>
                      )}
                      <p className="text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 size={12} /> Correct: {qItem.options[qItem.correct_index]}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-3">
              <Button
                variant="secondary"
                fullWidth
                className="bg-blue-600 hover:bg-blue-500 justify-center gap-2"
                onClick={() => navigate('/doubt-solver')}
              >
                Ask AI about wrong answers <ChevronRight size={14} />
              </Button>
              <div className="flex gap-3">
                <Button variant="secondary" fullWidth className="justify-center" onClick={() => selectedSubject && handleStartQuiz(selectedSubject)}>
                  Retake
                </Button>
                <Button variant="secondary" fullWidth className="justify-center" onClick={() => setPhase('idle')}>
                  Choose Different Subject
                </Button>
              </div>
            </div>
          </div>
        </main>
      </AppLayout>
    );
  }

  // idle
  return (
    <AppLayout>
      <main className="flex-1 min-w-0 overflow-y-auto h-screen page-enter">
        <header className="sticky top-0 z-20 bg-white border-b border-slate-100 px-4 sm:px-6 h-14 sm:h-16 flex items-center gap-3">
          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900">Exam Simulator</h1>
            <p className="text-xs text-slate-500 hidden sm:block">Board-pattern AI-generated mock tests</p>
          </div>
        </header>

        <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-5xl">

          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 text-white rounded-2xl p-4 sm:p-5 shadow-lg shadow-indigo-200">
              <Trophy size={22} className="text-amber-300 mb-3" />
              <p className="text-3xl sm:text-4xl font-black">
                {statsLoading ? 'â€¦' : stats.averageScore !== null ? `${stats.averageScore}%` : 'â€”'}
              </p>
              <p className="text-xs sm:text-sm font-semibold text-indigo-200 mt-1">
                {stats.averageScore !== null ? 'Mock Score Avg' : 'No tests yet'}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tests Done</p>
                <FileCheck size={16} className="text-emerald-500" />
              </div>
              <p className="text-3xl sm:text-4xl font-black text-slate-900">
                {statsLoading ? 'â€¦' : stats.totalAttempts}
              </p>
              <p className="text-xs text-slate-500 mt-1.5 font-medium">All time</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Best Score</p>
                <Star size={16} className="text-amber-400" />
              </div>
              <p className="text-3xl sm:text-4xl font-black text-slate-900">
                {statsLoading ? 'â€¦' : stats.bestScore !== null ? `${stats.bestScore}%` : 'â€”'}
              </p>
              <p className="text-xs text-slate-500 mt-1.5 font-medium">
                {stats.bestScore !== null ? 'Personal best' : 'Take a test'}
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-slate-900">Choose a Subject</h3>
              <Badge variant="outline" className="text-[9px]">AI-generated questions</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {SUBJECT_CATALOGUE.map((subject) => {
                const canAccess = subject.free || isPro;
                return (
                  <div
                    key={subject.id}
                    className={cn(
                      'bg-white rounded-2xl border transition-all group',
                      canAccess ? 'border-slate-100 hover:border-blue-200 shadow-sm cursor-pointer' : 'border-dashed border-slate-200'
                    )}
                    onClick={() => canAccess && handleSelectSubject(subject)}
                  >
                    <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0', subject.light)}>
                          {subject.emoji}
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-900">{subject.name}</h4>
                          <p className={cn('text-[10px] font-bold mt-0.5', subject.text)}>
                            {subject.free ? 'Free' : 'Pro'}
                          </p>
                        </div>
                      </div>
                      {canAccess ? (
                        <div className="p-2 bg-slate-100 group-hover:bg-blue-600 rounded-xl transition-all shrink-0">
                          <Play size={16} className="text-slate-500 group-hover:text-white transition-colors" />
                        </div>
                      ) : (
                        <Link to="/pricing" onClick={(e) => e.stopPropagation()}>
                          <div className="p-2 bg-slate-100 rounded-xl shrink-0">
                            <Lock size={16} className="text-slate-400" />
                          </div>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* -- Score History Chart (Day 35) -------------------------- */}
          {recentAttempts.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-extrabold text-slate-900">Score History</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Last {recentAttempts.length} quiz attempts</p>
                </div>
                {stats.weakestSubject && (
                  <div className="flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1.5 rounded-full text-xs font-bold border border-red-100">
                    <AlertCircle size={12} />
                    Weakest: {stats.weakestSubject}
                  </div>
                )}
              </div>
              {/* Pure SVG bar chart â€” no external library */}
              <div className="w-full overflow-x-auto">
                <svg
                  viewBox={`0 0 ${Math.max(recentAttempts.length * 44, 300)} 160`}
                  className="w-full"
                  style={{ minWidth: `${recentAttempts.length * 44}px`, height: '160px' }}
                  aria-label="Score history bar chart"
                >
                  {/* Grid lines at 25%, 50%, 75%, 100% */}
                  {[25, 50, 75, 100].map((pct) => {
                    const y = 120 - (pct / 100) * 110;
                    return (
                      <g key={pct}>
                        <line x1="28" y1={y} x2={recentAttempts.length * 44} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                        <text x="0" y={y + 4} fontSize="9" fill="#94a3b8" textAnchor="start">{pct}</text>
                      </g>
                    );
                  })}
                  {/* Bars */}
                  {recentAttempts.map((attempt, i) => {
                    const barH    = Math.max((attempt.score / 100) * 110, 3);
                    const x       = 32 + i * 44;
                    const y       = 120 - barH;
                    const passed  = attempt.score >= 35;
                    const great   = attempt.score >= 80;
                    const fill    = great ? '#10b981' : passed ? '#3b82f6' : '#ef4444';
                    const dateStr = new Date(attempt.attemptedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                    return (
                      <g key={attempt.id}>
                        {/* Bar */}
                        <rect x={x} y={y} width="28" height={barH} rx="4" fill={fill} fillOpacity="0.85" />
                        {/* Score label above bar */}
                        <text x={x + 14} y={y - 4} fontSize="9" fill="#475569" textAnchor="middle" fontWeight="700">
                          {attempt.score}%
                        </text>
                        {/* Date label below */}
                        <text x={x + 14} y="138" fontSize="8" fill="#94a3b8" textAnchor="middle">
                          {dateStr}
                        </text>
                        {/* Subject label */}
                        <text x={x + 14} y="150" fontSize="8" fill="#cbd5e1" textAnchor="middle">
                          {attempt.subjectId.slice(0, 4)}
                        </text>
                      </g>
                    );
                  })}
                  {/* Baseline */}
                  <line x1="28" y1="120" x2={recentAttempts.length * 44 + 32} y2="120" stroke="#e2e8f0" strokeWidth="1.5" />
                </svg>
              </div>
              {/* Legend */}
              <div className="flex items-center gap-4 mt-3 justify-center">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <div className="w-3 h-3 rounded-sm bg-emerald-500 opacity-85" /> =80% (Great)
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <div className="w-3 h-3 rounded-sm bg-blue-500 opacity-85" /> 35â€“79% (Pass)
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <div className="w-3 h-3 rounded-sm bg-red-500 opacity-85" /> &lt;35% (Fail)
                </div>
              </div>
            </div>
          )}

          <div className="bg-slate-950 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-56 h-56 bg-blue-600/10 blur-[60px] rounded-full pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="flex-1 space-y-3">
                <div className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-500/30">
                  <Zap size={10} /> Topper Mode
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-white">Unlock All Subject Simulations</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  AI-generated questions for all 7 subjects. Detailed answer keys and score tracking that shows exactly where you lose marks.
                </p>
                <div className="flex flex-wrap gap-3 pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400"><BarChart2 size={12} className="text-blue-400" /> AI Score Analysis</div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400"><Target size={12} className="text-emerald-400" /> Weakness Report</div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400"><Trophy size={12} className="text-amber-400" /> Board-Pattern Papers</div>
                </div>
              </div>
              <Link to="/pricing">
                <Button variant="secondary" size="md" className="bg-blue-600 hover:bg-blue-500 whitespace-nowrap gap-2 justify-center">
                  Upgrade to Topper Mode <ChevronRight size={15} />
                </Button>
              </Link>
            </div>
          </div>

        </div>
      </main>
    </AppLayout>
  );
};

export default ExamSimulation;







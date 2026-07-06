import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { cn } from '../utils/cn';
import {
  GraduationCap, ChevronRight, CheckCircle2,
  Target, ArrowLeft, Sparkles, Globe2, AlertCircle
} from 'lucide-react';

const TOTAL_STEPS = 4;

// DAY 2: Only Maharashtra State Board (Class 10) is supported.
// Do NOT add CBSE or any other board here until officially scoped.
const BOARDS = [
  { id: 'maharashtra', name: 'Maharashtra State Board', sub: 'SSC Class 10 · 2024-25 Syllabus', emoji: '🏛️' },
] as const;

const LANGUAGES = [
  { id: 'english', label: 'English',     flag: '🇬🇧' },
  { id: 'marathi', label: 'Marathi',      flag: '🇮🇳' },
  { id: 'hindi',   label: 'Hindi',        flag: '🇮🇳' },
  { id: 'semi',    label: 'Semi-English', flag: '🔤' },
];

const SUBJECTS = ['Mathematics', 'Science', 'Social Science', 'English', 'Sanskrit', 'Marathi', 'Hindi'];

const TARGETS = [
  { pct: 75, label: 'Pass with ease',    color: 'text-slate-600'  },
  { pct: 85, label: 'First Class',       color: 'text-blue-600'   },
  { pct: 90, label: 'Distinction',       color: 'text-emerald-600'},
  { pct: 95, label: 'Topper Territory',  color: 'text-amber-600'  },
];

interface FormData {
  board: 'maharashtra' | '';
  language: string;
  target: number;
  weakSubjects: string[];
}

export const Onboarding = () => {
  const [step, setStep]       = useState(1);
  // DAY 2: board pre-set to 'maharashtra' — only supported board.
  const [formData, setFormData] = useState<FormData>({ board: 'maharashtra', language: '', target: 90, weakSubjects: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const navigate = useNavigate();
  const { updateUser } = useAuth();

  const goNext = () => { setError(null); setStep(s => s + 1); };
  const goPrev = () => { setError(null); setStep(s => s - 1); };

  const toggleSubject = (s: string) => {
    setFormData(prev => ({
      ...prev,
      weakSubjects: prev.weakSubjects.includes(s)
        ? prev.weakSubjects.filter(x => x !== s)
        : [...prev.weakSubjects, s],
    }));
  };

  const handleComplete = async () => {
    setLoading(true);
    setError(null);
    try {
      // Persist to backend — board is always 'maharashtra' (Day 2 scope)
      const result = await api.patch<{ user: Parameters<typeof updateUser>[0] }>('/api/auth/me', {
        board: 'maharashtra',
        language: formData.language,
        targetPercent: formData.target,
        weakSubjects: formData.weakSubjects,
      });

      // Update local auth state only after confirmed server save
      updateUser(result.user);

      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save your profile. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const progress = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-100 px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="bg-blue-600 p-1.5 rounded-xl"><GraduationCap className="w-4 h-4 text-white" /></div>
          <span className="text-base font-black text-slate-900">BoardTopper<span className="text-blue-600">AI</span></span>
        </Link>
        <span className="text-xs font-bold text-slate-400">Step {step} of {TOTAL_STEPS}</span>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-slate-100">
        <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg space-y-6">

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Your board & class</h2>
                <p className="text-slate-500 text-sm mt-1">BoardTopper AI is built exclusively for Maharashtra State Board Class 10 students.</p>
              </div>
              <div className="space-y-3">
                {BOARDS.map(b => (
                  <div key={b.id}
                    className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-blue-600 bg-blue-50 text-left">
                    <span className="text-3xl">{b.emoji}</span>
                    <div>
                      <p className="font-extrabold text-slate-900">{b.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{b.sub}</p>
                    </div>
                    <CheckCircle2 size={20} className="text-blue-600 ml-auto shrink-0" />
                  </div>
                ))}
              </div>
              <Button variant="secondary" size="lg" fullWidth
                className="bg-blue-600 hover:bg-blue-700 gap-2" onClick={goNext}>
                Continue <ChevronRight size={16} />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Preferred medium of study?</h2>
                <p className="text-slate-500 text-sm mt-1">AI answers and notes will be generated in your preferred language.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {LANGUAGES.map(l => (
                  <button key={l.id} onClick={() => setFormData(p => ({ ...p, language: l.id }))}
                    className={cn('flex items-center gap-3 p-4 rounded-2xl border-2 transition-all', formData.language === l.id ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300')}>
                    <span className="text-xl">{l.flag}</span>
                    <span className="font-bold text-slate-900">{l.label}</span>
                    {formData.language === l.id && <CheckCircle2 size={16} className="text-blue-600 ml-auto" />}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="lg" onClick={goPrev} className="gap-1.5 w-32">
                  <ArrowLeft size={15} /> Back
                </Button>
                <Button variant="secondary" size="lg" fullWidth disabled={!formData.language}
                  className="bg-blue-600 hover:bg-blue-700 gap-2" onClick={goNext}>
                  Continue <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-black text-slate-900">What's your target score?</h2>
                <p className="text-slate-500 text-sm mt-1">Be ambitious — our AI will calibrate your study plan accordingly.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {TARGETS.map(t => (
                  <button key={t.pct} onClick={() => setFormData(p => ({ ...p, target: t.pct }))}
                    className={cn('flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all', formData.target === t.pct ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300')}>
                    <Target size={22} className={t.color} />
                    <span className={cn('text-2xl font-black', t.color)}>{t.pct}%</span>
                    <span className="text-xs font-semibold text-slate-500 text-center">{t.label}</span>
                    {formData.target === t.pct && <CheckCircle2 size={16} className="text-blue-600" />}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="lg" onClick={goPrev} className="gap-1.5 w-32">
                  <ArrowLeft size={15} /> Back
                </Button>
                <Button variant="secondary" size="lg" fullWidth
                  className="bg-blue-600 hover:bg-blue-700 gap-2" onClick={goNext}>
                  Continue <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Which subjects need most work?</h2>
                <p className="text-slate-500 text-sm mt-1">Select all that apply — your AI tutor will focus extra attention here.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {SUBJECTS.map(s => {
                  const sel = formData.weakSubjects.includes(s);
                  return (
                    <button key={s} onClick={() => toggleSubject(s)}
                      className={cn('px-4 py-2.5 rounded-xl font-bold text-sm border-2 transition-all', sel ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300')}>
                      {sel && <CheckCircle2 size={13} className="inline mr-1.5" />}{s}
                    </button>
                  );
                })}
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                <Globe2 size={16} className="text-blue-600 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-800 font-medium">
                  Your plan: <strong>Maharashtra State Board · Class 10</strong> · Target <strong>{formData.target}%</strong> · {formData.weakSubjects.length} weak subject{formData.weakSubjects.length !== 1 ? 's' : ''} flagged.
                </p>
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-800 font-medium">{error}</p>
                </div>
              )}
              <div className="flex gap-3">
                <Button variant="outline" size="lg" onClick={goPrev} className="gap-1.5 w-32">
                  <ArrowLeft size={15} /> Back
                </Button>
                <Button variant="secondary" size="lg" fullWidth isLoading={loading}
                  className="bg-blue-600 hover:bg-blue-700 gap-2" onClick={handleComplete}>
                  {!loading && <><Sparkles size={15} className="text-amber-300 fill-amber-200" />Build My Study Plan</>}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;

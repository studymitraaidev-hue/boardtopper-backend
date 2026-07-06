import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../utils/api";
import { cn } from "../utils/cn";
import {
  ChevronDown, ChevronUp, Crown, Zap, BookOpen,
  Sparkles, AlertCircle, Clock, TrendingUp
} from "lucide-react";

type Likelihood   = "very_high" | "high" | "medium";
type QuestionType = "definition"|"short_answer"|"long_answer"|"diagram"|"numerical"|"mcq";
type Source       = "pyq" | "ai";

interface LikelyQuestion {
  question: string; marks: number; type: QuestionType;
  subject: string; chapter: string; likelihood: Likelihood;
  answerHint: string; appearedYears: number[]; source: Source;
}
interface ApiResponse {
  questions: LikelyQuestion[]; weakSubjects: string[]; generatedAt: string;
}

const LIKELIHOOD: Record<Likelihood,{label:string;dot:string;badge:string}> = {
  very_high: { label:"Very Likely", dot:"bg-red-500",    badge:"bg-red-500/15 text-red-400 border-red-500/30" },
  high:      { label:"Likely",      dot:"bg-amber-400",  badge:"bg-amber-400/15 text-amber-300 border-amber-400/30" },
  medium:    { label:"Possible",    dot:"bg-slate-500",  badge:"bg-slate-700 text-slate-300 border-slate-600" },
};
const SOURCE: Record<Source,{label:string;badge:string}> = {
  pyq: { label:"Past Paper",   badge:"bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  ai:  { label:"AI Predicted", badge:"bg-indigo-500/15 text-indigo-400 border-indigo-500/30"   },
};
const TYPE_LABEL: Record<QuestionType,string> = {
  definition:"Definition", short_answer:"Short Ans", long_answer:"Long Ans",
  diagram:"Diagram", numerical:"Numerical", mcq:"MCQ",
};
const PRIORITY = ["Mathematics","Science"];

function SkeletonCard() {
  return (
    <div className="animate-pulse bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 space-y-3">
      <div className="flex gap-2">
        <div className="h-5 w-20 rounded-full bg-slate-700" />
        <div className="h-5 w-16 rounded-full bg-slate-700" />
        <div className="h-5 w-14 rounded-full bg-slate-700 ml-auto" />
      </div>
      <div className="h-4 w-full rounded bg-slate-700" />
      <div className="h-4 w-4/5 rounded bg-slate-700" />
      <div className="h-3 w-1/3 rounded bg-slate-700 mt-2" />
    </div>
  );
}

function QuestionCard({ q, index }: { q: LikelyQuestion; index: number }) {
  const [open, setOpen] = useState(false);
  const lh = LIKELIHOOD[q.likelihood];
  const src = SOURCE[q.source];

  return (
    <div className={cn(
      "bg-slate-800/50 border rounded-2xl overflow-hidden transition-all duration-200",
      q.likelihood === "very_high" ? "border-red-500/40 shadow-red-900/20 shadow-lg" :
      q.likelihood === "high"      ? "border-amber-500/30" : "border-slate-700/60"
    )}>
      {/* left accent bar */}
      <div className="flex">
        <div className={cn("w-1 shrink-0 rounded-l-2xl", q.likelihood === "very_high" ? "bg-red-500" : q.likelihood === "high" ? "bg-amber-400" : "bg-slate-600")} />
        <div className="flex-1 p-4 sm:p-5 space-y-3">

          {/* badges row */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className={cn("text-[10px] font-black uppercase tracking-wide px-2.5 py-0.5 rounded-full border flex items-center gap-1", lh.badge)}>
              <span className={cn("w-1.5 h-1.5 rounded-full", lh.dot)} />
              {lh.label}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full bg-slate-700 text-slate-300 border border-slate-600">
              {TYPE_LABEL[q.type]}
            </span>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
              {q.marks} marks
            </span>
            <span className={cn("text-[10px] font-black uppercase tracking-wide px-2.5 py-0.5 rounded-full border ml-auto", src.badge)}>
              {src.label}
            </span>
          </div>

          {/* question */}
          <p className="text-sm font-semibold text-slate-100 leading-snug">{q.question}</p>

          {/* chapter */}
          <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
            <BookOpen size={11} className="text-slate-600" />
            {q.chapter}
          </p>

          {/* appeared years */}
          {q.appearedYears.length > 0 && (
            <div className="flex flex-wrap gap-1 items-center">
              <Clock size={10} className="text-slate-600" />
              {q.appearedYears.map(yr => (
                <span key={yr} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/30">
                  {yr}
                </span>
              ))}
            </div>
          )}

          {/* hint toggle */}
          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-1.5 text-[11px] font-black text-blue-400 uppercase tracking-wide hover:text-blue-300 transition-colors"
          >
            {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {open ? "Hide Hint" : "Show Answer Hint"}
          </button>

          {open && (
            <div className="rounded-xl bg-slate-900/80 border border-slate-700 px-4 py-3 text-xs text-slate-300 leading-relaxed">
              {q.answerHint}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LikelyQuestions() {
  const { isPro, user } = useAuth();
  const [data, setData]       = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!isPro) { setLoading(false); return; }
    api.get<ApiResponse>("/api/emergency/likely-questions")
      .then(setData)
      .catch(() => setError("Could not load questions. Check your connection and try again."))
      .finally(() => setLoading(false));
  }, [isPro]);

  // ── Pro gate ───────────────────────────────────────────────────────────────
  if (!isPro) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-slate-900 border border-slate-700 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto shadow-lg shadow-amber-900/50">
            <Crown size={28} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Pro Only Feature</h2>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Likely Questions uses AI to predict what will come in your SSC board exam based on your weak subjects and past papers.
            </p>
          </div>
          <div className="text-left bg-slate-800/60 rounded-2xl p-4 space-y-2">
            {["AI-predicted questions for YOUR weak subjects","Past paper frequency analysis","Answer hints per question","Grouped by subject — Maths & Science first"].map(f => (
              <div key={f} className="flex items-center gap-2 text-xs text-slate-300">
                <Zap size={11} className="text-amber-400 shrink-0" />{f}
              </div>
            ))}
          </div>
          <Link to="/pricing" className="block w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black text-sm py-3.5 rounded-2xl transition-all shadow-lg shadow-amber-900/40">
            Upgrade to Pro — ₹99/mo
          </Link>
          <Link to="/dashboard" className="block text-xs text-slate-500 hover:text-slate-400">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const firstName    = user?.name?.split(" ")[0] ?? "Topper";
  const weakSubjects = user?.weakSubjects ?? [];
  const hasWeak      = weakSubjects.length > 0;

  const grouped: Record<string, LikelyQuestion[]> = {};
  (data?.questions ?? []).forEach(q => { (grouped[q.subject] ??= []).push(q); });
  const subjects = Object.keys(grouped).sort((a,b) => {
    const ai = PRIORITY.indexOf(a), bi = PRIORITY.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1; if (bi !== -1) return 1;
    return a.localeCompare(b);
  });
  const total = data?.questions.length ?? 0;

  return (
    <div className="min-h-screen bg-slate-950 pb-24 md:pb-8">
      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-5">

        {/* ── Header ── */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/60 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-500/20 p-1.5 rounded-lg">
              <Sparkles size={15} className="text-indigo-400" />
            </div>
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">AI Predicted</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Likely Questions, {firstName}</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {hasWeak
                ? `Based on your ${weakSubjects.length} weak subject${weakSubjects.length > 1 ? "s" : ""} — past papers + AI analysis.`
                : "Set your weak subjects to get personalised predictions."}
            </p>
          </div>
          {hasWeak && (
            <div className="flex flex-wrap gap-1.5">
              {weakSubjects.map(s => (
                <span key={s} className="text-[10px] font-black text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                  {s}
                </span>
              ))}
            </div>
          )}
          {total > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <TrendingUp size={12} className="text-emerald-400" />
              <span className="font-bold text-emerald-400">{total} questions</span> predicted for your exam
            </div>
          )}
        </div>

        {/* ── No weak subjects warning ── */}
        {!hasWeak && (
          <div className="flex items-start gap-3 bg-amber-400/10 border border-amber-400/20 rounded-2xl px-4 py-4">
            <AlertCircle size={16} className="text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-black text-amber-300">No weak subjects set</p>
              <p className="text-xs text-amber-400/70 mt-0.5">
                Go to{" "}
                <Link to="/settings" className="underline font-black text-amber-300">Settings → Profile</Link>
                {" "}and add your weak subjects to get AI-predicted questions tailored for you.
              </p>
            </div>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="space-y-3">
            {[...Array(4)].map((_,i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="rounded-2xl bg-red-500/10 border border-red-500/30 px-4 py-4 text-sm text-red-400 font-medium">
            {error}
          </div>
        )}

        {/* ── Empty after load ── */}
        {!loading && !error && subjects.length === 0 && (
          <div className="text-center py-20 space-y-3">
            <BookOpen size={36} className="text-slate-700 mx-auto" />
            <p className="text-slate-400 font-bold text-sm">No questions generated yet.</p>
            <Link to="/settings" className="text-indigo-400 text-xs font-black underline">
              Add weak subjects in Settings →
            </Link>
          </div>
        )}

        {/* ── Question groups ── */}
        {subjects.map(subject => (
          <section key={subject} className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">{subject}</h2>
              <span className="text-[10px] font-bold text-slate-600 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full">
                {grouped[subject].length} qs
              </span>
            </div>
            {grouped[subject].map((q,i) => <QuestionCard key={i} q={q} index={i} />)}
          </section>
        ))}

        {/* ── Footer ── */}
        {data?.generatedAt && (
          <p className="text-center text-[10px] text-slate-600 pb-4">
            Generated {new Date(data.generatedAt).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}

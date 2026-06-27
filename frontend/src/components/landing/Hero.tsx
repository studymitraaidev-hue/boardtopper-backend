import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import {
  ArrowRight, Sparkles, CheckCircle, Trophy, Target, Shield, Star, Zap
} from 'lucide-react';

// AUDIT FIX: framer-motion is imported in the original file but is NOT listed
// in package.json. This causes a fatal build error on `npm install && npm run dev`.
// Replaced all <motion.*> usage with plain divs using CSS animation classes
// already defined in index.css (page-enter, animate-float, animate-float-delayed,
// animate-fade-in). No new npm library added.

// TASK 4: Removed fabricated statistics ('45K+', '92%') — replaced with honest values.
const STATS = [
  { value: '₹99',  label: 'Per Month',  color: 'text-blue-600' },
  { value: '4.9★', label: 'App Rating', color: 'text-amber-600' },
  { value: '24/7', label: 'AI Support', color: 'text-emerald-600' },
];

const BOARDS = ['Maharashtra Board'];

const SOCIAL_PROOF = [
  { name: 'A Student from Pune',    score: '94.2%', board: 'MH Board' },
  { name: 'A Student from Nashik',  score: '91.8%', board: 'MH Board' },
  { name: 'A Student from Mumbai',  score: '96.4%', board: 'MH Board' },
  { name: 'A Student from Nagpur',  score: '89.6%', board: 'MH Board' },
];

export const Hero = () => {
  const [boardIdx, setBoardIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setBoardIdx(i => (i + 1) % BOARDS.length), 2500);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative pt-24 sm:pt-32 lg:pt-40 pb-12 sm:pb-20 overflow-hidden bg-white">
      {/* ── Background blobs ── */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[700px] h-[700px] bg-blue-50 rounded-full blur-[100px] opacity-60" />
        <div className="absolute -bottom-20 -left-40 w-[500px] h-[500px] bg-indigo-50 rounded-full blur-[100px] opacity-50" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%232563eb' fill-rule='evenodd'%3E%3Ccircle cx='20' cy='20' r='1'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col items-center text-center page-enter">

          {/* ── Trust badge ── */}
          {/* TASK 4: "India's #1 AI Board Prep Platform" → "Maharashtra Board's Most Trusted AI Study Partner" */}
          <div className="mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-xs font-black uppercase tracking-[0.15em] border border-blue-100 shadow-sm">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              Maharashtra Board's Most Trusted AI Study Partner
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>

          {/* ── Headline ── */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-slate-900 leading-[0.9] max-w-5xl mb-5 sm:mb-6 text-balance">
            Stop Guessing.{' '}
            <span className="relative inline-block">
              <span className="gradient-text">Start Scoring.</span>
              <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 8" fill="none" aria-hidden="true">
                <path d="M0 6 Q50 0 100 5 Q150 10 200 4" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.4" />
              </svg>
            </span>
          </h1>

          {/* ── Sub-heading ── */}
          <p className="text-base sm:text-lg md:text-xl text-slate-500 max-w-2xl leading-relaxed font-medium mb-8 sm:mb-10 text-balance">
            AI-powered preparation for{' '}
            <span className="relative font-black text-slate-900">
              <span key={boardIdx} className="animate-fade-in inline-block">
                {BOARDS[boardIdx]}
              </span>
            </span>{' '}
            students — personalized study plans, instant doubt solving, and board-pattern mock tests.
          </p>

          {/* ── CTAs ── */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto mb-8 sm:mb-12">
            <Link to="/signup" className="w-full sm:w-auto">
              <Button
                variant="secondary"
                size="xl"
                fullWidth
                className="group sm:w-auto shadow-xl shadow-blue-200/60 hover:shadow-blue-200 bg-blue-600 hover:bg-blue-700 h-14 sm:h-16 px-8 sm:px-10 text-base"
              >
                <Sparkles className="w-4 h-4 text-amber-300 fill-amber-200" />
                Start for Free — No Card Needed
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/dashboard" className="w-full sm:w-auto">
              <Button
                variant="white"
                size="xl"
                fullWidth
                className="sm:w-auto h-14 sm:h-16 px-8 text-base"
              >
                View Live Dashboard →
              </Button>
            </Link>
          </div>

          {/* ── Trust signals ── */}
          {/* TASK 4: "Board-Verified PYQs" → "Syllabus-Aligned PYQs" */}
          <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-8 text-sm font-bold text-slate-600 mb-12 sm:mb-16">
            {[
              { icon: <Target className="w-4 h-4 text-blue-600" />, text: '95% Target-Focused Plans' },
              { icon: <Shield className="w-4 h-4 text-emerald-600" />, text: 'Student Data Safe — No Selling' },
              { icon: <CheckCircle className="w-4 h-4 text-emerald-600" />, text: 'Syllabus-Aligned PYQs' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                {item.icon}
                <span className="text-xs sm:text-sm">{item.text}</span>
              </div>
            ))}
          </div>

          {/* ── Social proof avatars ── */}
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mb-16 sm:mb-24">
            <div className="flex -space-x-3">
              {SOCIAL_PROOF.map((s, i) => (
                <div
                  key={i}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-white shadow-md flex items-center justify-center font-black text-white text-sm"
                  style={{
                    background: ['#3b82f6','#10b981','#8b5cf6','#f59e0b'][i],
                    zIndex: 4 - i,
                  }}
                  title={`${s.name} — ${s.score}`}
                >
                  {s.name[0]}
                </div>
              ))}
            </div>
            <div className="text-center sm:text-left">
              <div className="flex items-center gap-1 justify-center sm:justify-start mb-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} className="text-amber-400 fill-amber-400" />
                ))}
                <span className="text-sm font-black text-slate-900 ml-1">4.9</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Trusted by <span className="font-black text-slate-900">students</span> across Maharashtra & beyond
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Results are illustrative. Actual results may vary.</p>
            </div>
          </div>

          {/* ── Stats bar ── */}
          <div className="w-full max-w-3xl">
            <div className="grid grid-cols-3 gap-3 sm:gap-6 bg-slate-50 rounded-2xl sm:rounded-3xl border border-slate-200 px-4 sm:px-8 py-5 sm:py-6">
              {STATS.map((stat, i) => (
                <div key={i} className="text-center">
                  <p className={`text-2xl sm:text-3xl font-black ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Dashboard Preview ── */}
        <div className="mt-16 sm:mt-24 relative mx-auto max-w-6xl">
          {/* Glow */}
          <div className="absolute -inset-4 bg-blue-600/5 rounded-[3.5rem] blur-2xl" />

          {/* Browser chrome */}
          <div className="relative bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] p-2 sm:p-3 shadow-[0_40px_100px_rgba(0,0,0,0.15)] border border-slate-800/50">
            {/* Window bar */}
            <div className="bg-slate-800/80 rounded-t-[1.5rem] sm:rounded-t-[2rem] px-4 sm:px-5 py-2.5 flex items-center gap-3 mb-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-400" />
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-400" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-slate-700/70 rounded-lg px-4 py-1 flex items-center gap-2">
                  <Shield size={10} className="text-emerald-400" />
                  <span className="text-[10px] text-slate-400 font-medium">app.boardtopper.ai/dashboard</span>
                </div>
              </div>
            </div>

            {/* App mockup */}
            <div className="bg-slate-50 rounded-[1.2rem] sm:rounded-[1.8rem] overflow-hidden aspect-[16/10] sm:aspect-[16/9]">
              <div className="flex h-full">
                {/* Sidebar */}
                <div className="hidden sm:flex w-44 bg-slate-950 flex-col p-3 gap-2">
                  <div className="flex items-center gap-2 p-2 mb-2">
                    <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center"><Zap size={12} className="text-white" /></div>
                    <span className="text-xs font-black text-white">BoardTopper</span>
                  </div>
                  {['Dashboard','Doubt Solver','Smart Notes','Exams','Emergency'].map((item, i) => (
                    <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded-xl ${i === 0 ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
                      <div className={`w-1 h-1 rounded-full ${i === 0 ? 'bg-white' : 'bg-slate-600'}`} />
                      <span className={`text-[10px] font-semibold ${i === 0 ? 'text-white' : 'text-slate-500'}`}>{item}</span>
                    </div>
                  ))}
                </div>
                {/* Main content */}
                <div className="flex-1 p-3 sm:p-4 space-y-3 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="h-3 bg-slate-900 rounded-full w-32 mb-1" />
                      <div className="h-2 bg-slate-300 rounded-full w-44" />
                    </div>
                    <div className="bg-blue-600 px-3 py-1 rounded-xl"><div className="h-2 w-10 bg-blue-400 rounded" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {['bg-blue-600','bg-emerald-50 border border-emerald-100','bg-amber-50 border border-amber-100'].map((cls, i) => (
                      <div key={i} className={`${cls} rounded-xl sm:rounded-2xl p-2 sm:p-3 space-y-1`}>
                        <div className={`h-1.5 rounded ${i === 0 ? 'bg-blue-400 w-1/2' : 'bg-slate-200 w-2/3'}`} />
                        <div className={`text-sm sm:text-xl font-black ${i === 0 ? 'text-white' : 'text-slate-800'}`}>{['78%','94%','12🔥'][i]}</div>
                        <div className={`h-1 rounded ${i === 0 ? 'bg-blue-400/50 w-4/5' : 'bg-slate-200 w-1/2'}`} />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 flex-1">
                    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 p-2 sm:p-3 space-y-1.5">
                      <div className="h-1.5 bg-slate-200 rounded w-2/3" />
                      {[85,72,91,64].map((w, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{width:`${w}%`}} />
                          </div>
                          <span className="text-[8px] text-slate-400">{w}%</span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-slate-900 rounded-xl sm:rounded-2xl p-2 sm:p-3 space-y-1.5">
                      <div className="h-1.5 bg-slate-700 rounded w-1/2" />
                      {[1,2,3].map(i => (
                        <div key={i} className="flex gap-2 items-start">
                          <div className="w-4 h-4 bg-blue-600/30 rounded-lg shrink-0" />
                          <div className="space-y-1 flex-1">
                            <div className="h-1.5 bg-slate-700 rounded w-full" />
                            <div className="h-1 bg-slate-800 rounded w-2/3" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating badges */}
          <div className="absolute -left-4 sm:-left-12 top-1/4 hidden xl:block animate-float">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-4 max-w-[180px]">
              <div className="flex items-center gap-2 mb-2">
                <Trophy size={16} className="text-emerald-600" />
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Result</span>
              </div>
              <p className="font-black text-slate-900 text-sm leading-snug">Board-aligned practice for every chapter</p>
            </div>
          </div>
          <div className="absolute -right-4 sm:-right-12 bottom-1/4 hidden xl:block animate-float-delayed">
            <div className="bg-slate-950 rounded-2xl shadow-xl p-4 max-w-[180px]">
              <div className="flex -space-x-2 mb-2">
                {['#3b82f6','#10b981','#8b5cf6'].map((c, i) => (
                  <div key={i} className="w-7 h-7 rounded-full border-2 border-slate-950 flex items-center justify-center text-white text-[10px] font-black" style={{background: c}}>
                    {['R','P','A'][i]}
                  </div>
                ))}
              </div>
              <p className="font-bold text-white text-xs leading-snug">
                <span className="text-emerald-400 font-black">Active:</span> Students studying now
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

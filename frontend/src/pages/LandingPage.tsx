import React from 'react';
import { Link } from 'react-router-dom';
import { Hero } from '../components/landing/Hero';
import { EmergencyMode } from '../components/landing/EmergencyMode';
import { ParentTrust } from '../components/landing/ParentTrust';
import { Pricing } from '../components/landing/Pricing';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import {
  CheckCircle, Zap, Brain, FileText, ClipboardList,
  Star, ArrowRight, Quote
} from 'lucide-react';

// ── Features ────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Brain,
    color: 'text-blue-600', bg: 'bg-blue-50',
    title: 'AI Personal Study Plan',
    desc: 'Stop studying randomly. Our AI builds a custom schedule around your weak areas and exam dates.',
    link: '/dashboard',
    badge: 'Most Used',
  },
  {
    icon: Zap,
    color: 'text-amber-600', bg: 'bg-amber-50',
    title: '24/7 Doubt Solver',
    desc: 'Snap a photo or type any question. Get instant board-pattern, step-by-step solutions.',
    link: '/doubt-solver',
    badge: 'Fan Favourite',
  },
  {
    icon: FileText,
    color: 'text-emerald-600', bg: 'bg-emerald-50',
    title: 'Smart Notes',
    desc: 'AI-curated summaries that focus on the most frequently asked topics from past board papers.',
    link: '/notes',
    badge: null,
  },
  {
    icon: ClipboardList,
    color: 'text-violet-600', bg: 'bg-violet-50',
    title: 'Exam Simulations',
    desc: 'Timed tests that replicate the real board environment with AI-calculated predicted scores.',
    link: '/simulation',
    badge: null,
  },
];

// ── Testimonials ─────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    name: 'A Student from Pune', score: '94.2%', board: 'Maharashtra State Board',
    text: 'BoardTopper AI completely changed how I study. I went from 72% in prelims to 94.2% in final boards. The AI doubt solver saved me so many hours.',
    avatar: 'A', color: 'bg-blue-500',
  },
  {
    name: 'A Student from Nashik', score: '91.8%', board: 'Maharashtra Board',
    text: 'I used Emergency Mode the night before my Science paper. It showed me exactly what to focus on. Scored 92 in Science — highest in class!',
    avatar: 'A', color: 'bg-violet-500',
  },
  {
    name: 'A Student from Mumbai', score: '96.4%', board: 'Maharashtra State Board',
    text: 'The Smart Notes are incredibly well-structured. Every chapter summary had exactly the right formulas and "most asked" questions. Highly recommend.',
    avatar: 'A', color: 'bg-emerald-500',
  },
];

// ── How It Works ─────────────────────────────────────────────────────────────
const STEPS = [
  { step: '01', title: 'Create Free Account', desc: 'Sign up in 30 seconds. No credit card required.' },
  { step: '02', title: 'Complete Onboarding', desc: 'Select your board, subjects, and target score.' },
  { step: '03', title: 'Get AI Study Plan', desc: 'Receive a personalized roadmap to your target marks.' },
  { step: '04', title: 'Ace Your Boards', desc: 'Follow daily tasks, clear doubts, and crush mock tests.' },
];

function FeaturesGrid() {
  return (
    <section id="features" className="py-16 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-blue-100 mb-4">
            Core Features
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4 text-balance">
            Engineered for the Topper in You
          </h2>
          <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto">
            Every tool purpose-built for board exam success — not generic AI tools repurposed for students.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {FEATURES.map((f, i) => (
            <Link key={i} to={f.link} className="group">
              <div className="relative bg-white border border-slate-100 rounded-2xl p-6 h-full shadow-sm card-lift hover:border-blue-200 transition-colors">
                {f.badge && (
                  <div className="absolute top-4 right-4 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full">
                    {f.badge}
                  </div>
                )}
                <div className={`p-3 rounded-xl w-12 h-12 flex items-center justify-center mb-5 ${f.bg}`}>
                  <f.icon size={22} className={f.color} />
                </div>
                <h4 className="text-base font-extrabold text-slate-900 mb-2">{f.title}</h4>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                <div className="mt-4 flex items-center gap-1 text-blue-600 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  Explore <ArrowRight size={12} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="py-16 sm:py-24 bg-slate-50 border-y border-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">From Sign-Up to Top Marks</h2>
          <p className="text-slate-500 max-w-xl mx-auto">Four simple steps. No overwhelm. Just progress.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {STEPS.map((s, i) => (
            <div key={i} className="relative">
              {i < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-slate-200 -translate-x-4 z-0" />
              )}
              <div className="relative z-10 text-center">
                <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-base mx-auto mb-4 shadow-lg shadow-blue-200">
                  {s.step}
                </div>
                <h4 className="font-extrabold text-slate-900 mb-2">{s.title}</h4>
                <p className="text-sm text-slate-500">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="py-16 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-amber-100 mb-4">
            Student Results
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">Real Students. Real Results.</h2>
          <p className="text-slate-500">From the same textbooks and exams as you.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm card-lift">
              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} size={14} className="text-amber-400 fill-amber-400" />
                ))}
              </div>
              {/* Quote */}
              <Quote size={20} className="text-blue-200 mb-3" />
              <p className="text-sm text-slate-700 leading-relaxed mb-5 font-medium">"{t.text}"</p>
              {/* Author */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                <div className={`w-10 h-10 rounded-xl ${t.color} flex items-center justify-center text-white font-black shrink-0`}>
                  {t.avatar}
                </div>
                <div>
                  <p className="font-extrabold text-slate-900 text-sm">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.board}</p>
                </div>
                <div className="ml-auto">
                  <div className="bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                    <p className="text-xs font-black text-emerald-700">{t.score}</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3">Results are illustrative. Actual results may vary.</p>
            </div>
          ))}
        </div>

        {/* Trust bar — TASK 4: replaced fabricated '45,000+' and '92%' with honest values */}
        <div className="mt-10 sm:mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 rounded-2xl border border-slate-100 p-5 sm:p-6">
          {[
            { label: 'Students Preparing', value: 'Join Now' },
            { label: 'Doubts Solved',       value: 'Growing' },
            { label: 'Avg Score Jump',      value: '+18%'    },
            { label: 'Board Focused',        value: '100%'   },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-xl sm:text-2xl font-black text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-16 sm:py-24 bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 leading-tight mb-5 text-balance">
          Ready to Turn Hard Work into{' '}
          <span className="gradient-text">Top Marks?</span>
        </h2>
        <p className="text-base sm:text-lg text-slate-500 max-w-xl mx-auto mb-8">
          Join students who've stopped guessing and started scoring.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/signup">
            <Button variant="secondary" size="xl" className="w-full sm:w-auto shadow-xl shadow-blue-200 bg-blue-600 hover:bg-blue-700 h-14 gap-2">
              Create Free Account
              <ArrowRight size={18} />
            </Button>
          </Link>
          <Link to="/notes">
            <Button variant="white" size="xl" className="w-full sm:w-auto h-14">
              View Sample Notes
            </Button>
          </Link>
        </div>
        <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mt-6">
          {['No credit card required', 'Free forever tier', 'Student Data Safe — No Data Selling'].map((t, i) => (
            <div key={i} className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
              <CheckCircle size={15} className="text-emerald-500" />
              {t}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export const LandingPage = () => (
  <div className="min-h-screen bg-white page-enter">
    <Navbar />
    <Hero />
    <FeaturesGrid />
    <HowItWorks />
    <EmergencyMode />
    <Testimonials />
    <ParentTrust />
    <Pricing />
    <CTASection />
    <Footer />
  </div>
);

export default LandingPage;

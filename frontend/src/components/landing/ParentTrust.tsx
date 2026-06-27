import React from 'react';
import { ShieldCheck, TrendingUp, BookOpenCheck, Lock, CheckCircle, Users, Award, Star } from 'lucide-react';

// TASK 4: "Board-Verified Curriculum" → "Syllabus-Aligned Curriculum"
// TASK 4: "AI trained on Maharashtra State Board..." → "Designed for Maharashtra State Board & CBSE past papers and marking schemes."
// TASK 4: "45,000+" removed — fabricated statistic
// TASK 4: "92%" Distinction Rate removed — fabricated statistic
const TRUST_POINTS = [
  { icon: ShieldCheck,   color: 'text-blue-600',   bg: 'bg-blue-50',   title: 'Safe Learning Environment',   desc: 'Zero ads, zero distractions. A focused space built only for board exam success.' },
  { icon: TrendingUp,    color: 'text-emerald-600', bg: 'bg-emerald-50', title: 'Measurable Progress',         desc: "Track your child's scores, weak topics, and preparation levels with real-time analytics." },
  { icon: BookOpenCheck, color: 'text-amber-600',   bg: 'bg-amber-50',  title: 'Syllabus-Aligned Curriculum',   desc: 'Designed for Maharashtra State Board (SSC) past papers and marking schemes.' },
  { icon: Lock,          color: 'text-violet-600',  bg: 'bg-violet-50', title: 'No Hidden Costs',             desc: 'One transparent price. Complete syllabus coverage for ₹99/month — less than one tuition class.' },
];

export const ParentTrust = () => (
  <section id="parents" className="py-16 sm:py-24 bg-white border-y border-slate-100">
    <div className="max-w-7xl mx-auto px-4 sm:px-6">

      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-10 sm:gap-16 items-center mb-14 sm:mb-16">
        <div className="lg:w-1/2 space-y-5 sm:space-y-6">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-blue-100">
            <ShieldCheck size={12} /> Verified Academic Safety
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 leading-tight text-balance">
            Empowering Parents to<br />
            <span className="text-blue-600">Track Real Growth.</span>
          </h2>
          <p className="text-slate-500 text-base sm:text-lg leading-relaxed">
            Traditional tuitions are expensive and opaque. BoardTopper AI gives you 100% visibility into your child's preparation — in real time.
          </p>
          <div className="space-y-3 sm:space-y-4">
            {[
              'Weekly progress reports via WhatsApp & email',
              'AI-identified weak topics with targeted practice',
              'Board-standard marking for every mock test',
              '100% ad-free and distraction-free learning',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircle size={12} className="text-emerald-600" />
                </div>
                <span className="text-slate-700 font-semibold text-sm sm:text-base">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats card — fabricated numbers replaced with honest messaging */}
        <div className="lg:w-1/2 w-full">
          <div className="bg-slate-50 rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm">
            <div className="grid grid-cols-2 gap-4 sm:gap-5 mb-5">
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <Users size={28} className="text-blue-600 mb-3" />
                <p className="text-3xl font-black text-slate-900">Growing</p>
                <p className="text-sm text-slate-500 font-medium mt-0.5">Student Community</p>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <Award size={28} className="text-amber-500 mb-3" />
                <p className="text-3xl font-black text-slate-900">100%</p>
                <p className="text-sm text-slate-500 font-medium mt-0.5">Board Focused</p>
              </div>
            </div>

            {/* Parent testimonial */}
            <div className="bg-slate-900 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center font-black text-white text-base shrink-0">A</div>
                <div>
                  <p className="font-extrabold text-white text-sm">A Parent from Pune</p>
                  <p className="text-xs text-slate-400">Parent · SSC Student</p>
                </div>
                <div className="ml-auto flex gap-0.5">
                  {[...Array(5)].map((_, i) => <Star key={i} size={12} className="text-amber-400 fill-amber-400" />)}
                </div>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed italic">
                &quot;My son struggled with Geometry for months. The AI doubt solver helped him clear all concepts at 10 PM — the night before his prelims. He scored 38/40 in Maths!&quot;
              </p>
              <p className="text-xs text-slate-500">Results are illustrative. Actual results may vary.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Trust points grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {TRUST_POINTS.map((p, i) => (
          <div key={i} className="bg-slate-50 p-5 sm:p-6 rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all group">
            <div className={`p-3 rounded-xl w-12 h-12 flex items-center justify-center mb-4 ${p.bg} group-hover:scale-110 transition-transform`}>
              <p.icon size={22} className={p.color} />
            </div>
            <h4 className="font-extrabold text-slate-900 mb-2 text-sm sm:text-base">{p.title}</h4>
            <p className="text-slate-500 text-sm leading-relaxed">{p.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default ParentTrust;

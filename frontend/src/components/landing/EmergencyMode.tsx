import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { Clock, Zap, BookOpen, Target, CheckCircle2, Flame, AlertCircle, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

// AUDIT FIX: framer-motion is imported but NOT in package.json — fatal build error.
// Replaced <motion.div> with plain div using CSS animation class from index.css.

export const EmergencyMode = () => {
  const features = [
    { icon: <Clock className="w-5 h-5 text-red-400" />, title: '5-Min Chapter Summaries', desc: 'No fluff. Just the concepts that actually come in boards.' },
    // TASK 4: "AI-predicted questions based on last 10 years of MH/CBSE papers."
    // → "Questions curated from last 10 years of MH Board papers and marking schemes."
    { icon: <Target className="w-5 h-5 text-blue-400" />, title: 'High-Probability Questions', desc: 'Questions curated from last 10 years of MH Board papers and marking schemes.' },
    { icon: <Flame className="w-5 h-5 text-orange-400" />, title: '2/5/8 Marks Strategy', desc: 'Learn exactly how to write answers that examiners love.' },
    { icon: <BookOpen className="w-5 h-5 text-emerald-400" />, title: 'Instant Cheat Sheets', desc: 'Formulas, diagrams, and dates - all in one place.' },
  ];

  return (
    <section id="emergency" className="py-32 bg-[#020617] text-white relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-red-600/5 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/4" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-10">
            <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-red-500/20 border-2 border-red-500/30 text-red-400 font-black text-[10px] tracking-[0.2em] uppercase shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              <AlertCircle className="w-4 h-4" />
              Most Popular Feature
            </div>

            <div className="space-y-4">
               <h2 className="text-5xl md:text-7xl font-black leading-[0.9] tracking-tight">
                  Exam Tomorrow? <br />
                  <span className="text-blue-500 underline decoration-blue-500/20 underline-offset-8">Panic Ends Now.</span>
               </h2>
               <p className="text-slate-400 text-xl font-medium leading-relaxed max-w-xl">
                  Stop scrolling YouTube and reading massive textbooks. Unlock &quot;Emergency Mode&quot; and prepare the most important 20% that carries 80% marks.
               </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {features.map((f, i) => (
                <div key={i} className="flex gap-4 items-start group">
                  <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 text-blue-400 shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    {f.icon}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-100 text-base">{f.title}</h4>
                    <p className="text-sm text-slate-500 font-medium">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
               <Link to="/emergency">
                 <Button size="xl" className="bg-blue-600 hover:bg-blue-700 px-10 py-8 text-lg font-black rounded-2xl shadow-2xl shadow-blue-500/20 group">
                   Try Emergency Mode
                   <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                 </Button>
               </Link>
               <div className="flex items-center gap-4 px-6 py-4 rounded-2xl border border-slate-800 bg-slate-900/50">
                  <div className="flex -space-x-2">
                     {[1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-700" />)}
                  </div>
                  <p className="text-xs font-bold text-slate-400">Used by students before every exam</p>
               </div>
            </div>
          </div>

          {/* Emergency UI Mockup — plain div, CSS slide-right animation from index.css */}
          <div className="relative" style={{ animation: 'slideRight 0.8s ease both' }}>
            <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full" />
            <Card className="bg-slate-900/80 border-slate-800 shadow-[0_40px_100px_rgba(0,0,0,0.5)] relative overflow-hidden rounded-[3rem] backdrop-blur-xl">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-600 via-blue-600 to-indigo-600" />
              <CardContent className="p-10 space-y-10">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-red-600 rounded-full animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.5)]" />
                    <span className="text-xs font-black text-red-500 uppercase tracking-[0.2em]">Panic Mode Active</span>
                  </div>
                  <div className="px-3 py-1 bg-slate-800 rounded-lg text-[10px] font-black text-slate-500 tracking-widest uppercase border border-slate-700">
                    Maths P-1 • MAR 2025
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="p-6 bg-white/5 rounded-[2rem] border border-white/10 space-y-2">
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Next Topic to Master</p>
                    <p className="text-2xl font-black text-white">Quadratic Equations</p>
                    <div className="flex gap-2 pt-2">
                       <span className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-[10px] font-black border border-blue-600/20">Weightage: 12M</span>
                       <span className="px-3 py-1 bg-emerald-600/20 text-emerald-400 rounded-full text-[10px] font-black border border-emerald-600/20">Difficulty: Medium</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                       <p className="text-xs font-black text-slate-500 uppercase tracking-widest">High Yield Questions</p>
                       <p className="text-[10px] font-bold text-blue-500">View All 15</p>
                    </div>
                    {[
                      // TASK 4: "Guaranteed" → "High Priority"
                      { name: 'Nature of roots of quadratic eq.', status: 'High Chance',   color: 'text-red-400'     },
                      { name: 'Formula method problems',           status: 'High Priority', color: 'text-emerald-400' },
                      { name: 'Application of word problems',      status: 'Frequent',      color: 'text-blue-400'    },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-5 bg-slate-950/50 rounded-2xl border border-white/5 group hover:border-blue-500/30 transition-all cursor-pointer">
                        <div className="flex items-center gap-4">
                           <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-xs font-black text-slate-500 group-hover:text-blue-400">
                              0{i+1}
                           </div>
                           <span className="text-sm font-bold text-slate-300 group-hover:text-white">{item.name}</span>
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${item.color}`}>{item.status}</span>
                      </div>
                    ))}
                  </div>

                  <Link to="/notes">
                    <Button className="w-full h-20 bg-white text-slate-900 hover:bg-slate-100 font-black text-lg uppercase tracking-tight rounded-2xl group">
                      <Zap className="mr-2 w-5 h-5 fill-slate-900" />
                      Generate Crash Notes
                      <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EmergencyMode;

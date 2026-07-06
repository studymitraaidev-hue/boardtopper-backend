import React from 'react';
import { Link } from 'react-router-dom';
import { Check, Sparkles, Zap, Crown, Star, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

const PLANS = [
  {
    name: 'Free Explorer', price: '₹0', period: 'Forever', popular: false,
    desc: 'Test our AI with no commitment.',
    icon: Zap, iconColor: 'text-slate-500', iconBg: 'bg-slate-100',
    features: ['3 AI Doubt Solves / day', 'Basic Chapter Notes', 'Daily Revision Plan', '2 Mock Tests / month'],
    cta: 'Start for Free', path: '/signup',
  },
  {
    name: 'Topper Mode', price: '₹99', period: '/month', popular: true,
    desc: 'The complete board exam system.',
    icon: Crown, iconColor: 'text-amber-600', iconBg: 'bg-amber-50',
    features: ['Unlimited AI Doubt Solves', 'Emergency Crash Mode', 'PDF Notes Export', 'PYQ Bank (10 Years)', 'Weak Topic Analysis', 'Priority AI Processing'],
    cta: 'Unlock Topper Mode', path: '/signup',
  },
  {
    name: 'Yearly Excellence', price: '₹799', period: '/year', popular: false,
    desc: 'Full prep. Best value. Save 33%.',
    icon: Star, iconColor: 'text-blue-600', iconBg: 'bg-blue-50',
    features: ['Everything in Topper Mode', '10-Month Course Roadmap', '50+ Board Simulation Papers', 'Parent Progress Reports', 'Expert Chat (2/month)'],
    cta: 'Go Annual — Save 33%', path: '/signup',
  },
];

export const Pricing = () => (
  <section id="pricing" className="py-16 sm:py-24 bg-slate-50 relative overflow-hidden">
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute -top-40 right-0 w-[600px] h-[600px] bg-blue-100 rounded-full blur-[120px] opacity-40" />
      <div className="absolute -bottom-40 left-0 w-[500px] h-[500px] bg-indigo-100 rounded-full blur-[120px] opacity-40" />
    </div>

    <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
      <div className="text-center mb-12 sm:mb-16">
        <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-blue-200 mb-4">
          Smart Pricing
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 leading-tight mb-3 text-balance">
          Results of a Topper.<br />
          <span className="gradient-text">Pocket Money Price.</span>
        </h2>
        <p className="text-slate-500 max-w-xl mx-auto">
          Join students who use BoardTopper AI to prepare smarter — starting completely free, no card required.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch max-w-5xl mx-auto">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={cn(
              'relative flex flex-col bg-white rounded-3xl border',
              plan.popular
                ? 'border-blue-600 ring-4 ring-blue-100 shadow-2xl md:scale-105 md:z-10'
                : 'border-slate-100 shadow-sm'
            )}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                <div className="flex items-center gap-1.5 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border-4 border-white shadow-lg whitespace-nowrap">
                  <Sparkles size={10} className="fill-amber-300 text-amber-300" /> Recommended
                </div>
              </div>
            )}

            <div className="p-6 sm:p-7 flex flex-col flex-1">
              <div className="flex items-center gap-3 mb-5">
                <div className={cn('p-2 rounded-xl', plan.iconBg)}>
                  <plan.icon size={18} className={plan.iconColor} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">{plan.name}</h3>
                  <p className="text-xs text-slate-500">{plan.desc}</p>
                </div>
              </div>

              <div className="mb-5 pb-5 border-b border-slate-100">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">{plan.price}</span>
                  <span className="text-slate-500 font-medium text-sm">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <div className={cn('p-0.5 rounded-full mt-0.5 shrink-0', plan.popular ? 'bg-blue-600' : 'bg-slate-200')}>
                      <Check size={10} className={plan.popular ? 'text-white' : 'text-slate-500'} strokeWidth={3} />
                    </div>
                    <span className="text-sm text-slate-700 font-medium">{f}</span>
                  </li>
                ))}
              </ul>

              <Link to={plan.path}>
                <Button
                  variant={plan.popular ? 'secondary' : 'outline'}
                  size="md"
                  fullWidth
                  className={cn('gap-1.5', plan.popular && 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100')}
                >
                  {plan.cta} <ArrowRight size={15} />
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link to="/pricing" className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">
          View full pricing comparison →
        </Link>
      </div>
    </div>
  </section>
);

export default Pricing;

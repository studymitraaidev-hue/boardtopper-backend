import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Button } from '../components/ui/Button';
import { cn } from '../utils/cn';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { createPaymentOrder, verifyPayment, fetchSubscriptionStatus } from '../services/paymentService';
import {
  Check, Sparkles, Star, Zap, Shield, Crown,
  ArrowRight, ChevronDown, CheckCircle, Users
} from 'lucide-react';

const PLANS = [
  {
    id: 'free',
    name: 'Free Explorer',
    price: { monthly: '₹0', yearly: '₹0' },
    period: 'Forever',
    desc: 'Perfect for getting started and testing our AI.',
    features: [
      '3 AI Doubt Solves / hour',
      'Basic Chapter Notes (view only)',
      'Daily revision plan',
      'Limited mock test access (2/month)',
    ],
    notIncluded: ['PDF export', 'Emergency Mode', 'Unlimited doubts'],
    cta: 'Start for Free',
    ctaPath: '/signup',
    icon: Zap,
    iconColor: 'text-slate-500',
    iconBg: 'bg-slate-100',
    popular: false,
    isPaid: false,
    planId: null as null,
  },
  {
    id: 'monthly',
    name: 'Topper Mode',
    price: { monthly: '₹99', yearly: '₹799/year' },
    period: '/month',
    desc: 'The complete marks-booster system for serious students.',
    features: [
      'Unlimited AI Doubt Solves',
      'Emergency Mode — Exam Crash Prep',
      'Printable Smart PDF Notes',
      'Previous Year Papers (Solved)',
      'Weak Topic AI Analysis',
      'Priority AI Processing',
      'All Subjects Covered',
    ],
    notIncluded: [],
    cta: 'Unlock Topper Mode',
    ctaPath: '/signup',
    icon: Crown,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-50',
    popular: true,
    isPaid: true,
    planId: 'monthly' as 'monthly' | 'yearly',
  },
  {
    id: 'yearly',
    name: 'Yearly Excellence',
    price: { monthly: '₹799', yearly: '₹799' },
    period: '/year',
    desc: 'Full board preparation — save 33% vs monthly.',
    features: [
      'Everything in Topper Mode',
      'Full Course Roadmap (10 months)',
      'Expert Chat Access (2/month)',
      'Board Exam Simulation Pack (50+)',
      'Parent Weekly Progress Report',
      'Priority Support',
    ],
    notIncluded: [],
    cta: 'Go Annual — Save 33%',
    ctaPath: '/signup',
    icon: Star,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50',
    popular: false,
    isPaid: true,
    planId: 'yearly' as 'monthly' | 'yearly',
  },
];

const FAQS = [
  { q: 'Can I cancel my subscription anytime?',        a: 'Yes. Email us at billing@boardtopper.ai and we will process your cancellation within 24 hours — no questions asked and no lock-in period.' },
  { q: 'Is there a free trial for Topper Mode?',       a: 'The Free Explorer plan is available forever. It gives you a real taste of the AI features with hourly limits.' },
  { q: 'Which boards are supported?',                   a: 'We support Maharashtra State Board (SSC) Class 10. More boards coming in 2025.' },
  { q: 'Are payments safe and secure?',                 a: 'Yes. All payments are processed through Razorpay with 256-bit SSL encryption. We never store your card data.' },
  { q: 'What happens to my data?',                      a: 'Your data is yours. We are Student Data Safe — we never sell or share student data with third parties.' },
  { q: 'What is the Yearly Excellence plan?',          a: 'The Yearly Excellence plan gives you full Pro access for the entire academic year at ₹799 — saving ₹389 compared to monthly billing. Perfect for students who want uninterrupted AI study support from June to March.' },
];

export const PricingPage = () => {
  const { user, updateUser, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [payLoading, setPayLoading] = useState<string | null>(null); // tracks which plan is loading
  const [payError, setPayError] = useState<string | null>(null);

  // DAY 6: Payment flow uses paymentService helpers.
  // Pro access is only unlocked after backend confirms subscription is active.
  const handleUpgrade = async (planId: 'monthly' | 'yearly') => {
    if (!user) {
      navigate('/login');
      return;
    }

    setPayLoading(planId);
    setPayError(null);

    try {
      // Step 1: Backend creates order — amount is server-determined
      const order = await createPaymentOrder(planId);

      const rzp = new (window as { Razorpay: new (opts: Record<string, unknown>) => { open(): void } }).Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'BoardTopper AI',
        description: planId === 'yearly'
          ? 'Yearly Excellence — Full Year Pro Access'
          : 'Topper Mode — Unlimited AI Doubts',
        order_id: order.orderId,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          // Step 2: Backend verifies HMAC signature — never trust callback alone
          try {
            const result = await verifyPayment({
              razorpayOrderId:   response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            // Step 3: Update JWT with new Pro token
            api.setToken(result.token);

            // Step 4: Re-fetch authoritative user + subscription state from backend.
            // refreshUser() calls /api/auth/me which returns the DB-truth plan.
            // This also updates localStorage so the plan persists across reloads.
            try {
              await refreshUser();
            } catch {
              // Fallback: trust the verified token's plan claim
              updateUser({ plan: 'pro' });
            }

            // Step 5: Confirm subscription status from backend (webhook-safe).
            // The /verify endpoint already activated the subscription.
            // This call confirms the backend state is 'active' before navigating.
            // If the webhook hasn't arrived yet, verify endpoint has already set it.
            try {
              await fetchSubscriptionStatus();
            } catch {
              // Non-fatal — subscription was already activated by verify endpoint
            }

            navigate('/dashboard');
          } catch {
            setPayError('Payment verification failed. Please contact support@boardtopper.ai');
            setPayLoading(null);
          }
        },
        modal: {
          ondismiss: () => {
            // User closed Razorpay modal without completing payment
            setPayLoading(null);
          },
        },
        prefill: { name: user?.name ?? '', email: user?.email ?? '' },
        theme: { color: '#2563eb' },
      });

      rzp.open();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Could not initiate payment. Please try again.');
      setPayLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 sm:pt-36 pb-12 sm:pb-16 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 right-0 w-[500px] h-[500px] bg-blue-50 rounded-full blur-[100px] opacity-60" />
          <div className="absolute -bottom-20 left-0 w-[400px] h-[400px] bg-indigo-50 rounded-full blur-[100px] opacity-50" />
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-blue-100 mb-5">
            Simple, Honest Pricing
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.05] mb-4 text-balance">
            Results of a Topper.<br />
            <span className="gradient-text">Pocket Money Price.</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-500 max-w-xl mx-auto mb-8">
            Join students who use BoardTopper AI to prepare smarter for their board exams.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {(['monthly', 'yearly'] as const).map(b => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-bold transition-all',
                  billing === b ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                )}
              >
                {b === 'monthly' ? 'Monthly' : 'Yearly'}
                {b === 'yearly' && <span className="ml-1.5 text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">-33%</span>}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="pb-16 sm:pb-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  'relative flex flex-col bg-white rounded-3xl border transition-shadow',
                  plan.popular
                    ? 'border-blue-600 ring-4 ring-blue-100 shadow-2xl md:scale-105 md:z-10'
                    : 'border-slate-100 shadow-sm hover:shadow-md'
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                    <div className="flex items-center gap-1.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border-4 border-white shadow-lg whitespace-nowrap">
                      <Sparkles size={10} className="fill-amber-300 text-amber-300" /> Most Popular
                    </div>
                  </div>
                )}

                <div className="p-6 sm:p-8 flex flex-col flex-1">
                  {/* Icon + name */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className={cn('p-2.5 rounded-xl', plan.iconBg)}>
                      <plan.icon size={20} className={plan.iconColor} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900">{plan.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{plan.desc}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-6 pb-6 border-b border-slate-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl sm:text-5xl font-black text-slate-900">
                        {plan.price[billing]}
                      </span>
                      {!(billing === 'yearly' && plan.id === 'monthly') && (
                        <span className="text-slate-500 font-semibold">{plan.period}</span>
                      )}
                      {billing === 'yearly' && plan.id === 'monthly' && (
                        <span className="text-slate-500 font-semibold text-sm">billed annually</span>
                      )}
                    </div>
                    {billing === 'yearly' && plan.id === 'monthly' && (
                      <p className="text-xs text-emerald-600 font-bold mt-1">Billed as ₹799/year · Save ₹389</p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 flex-1 mb-7">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <div className={cn('p-0.5 rounded-full mt-0.5 shrink-0', plan.popular ? 'bg-blue-600' : 'bg-slate-200')}>
                          <Check size={11} className={plan.popular ? 'text-white' : 'text-slate-500'} strokeWidth={3} />
                        </div>
                        <span className="text-sm text-slate-700 font-medium">{f}</span>
                      </li>
                    ))}
                    {plan.notIncluded.map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5 opacity-40">
                        <div className="p-0.5 rounded-full mt-0.5 shrink-0 bg-slate-100">
                          <Check size={11} className="text-slate-400" strokeWidth={3} />
                        </div>
                        <span className="text-sm text-slate-500 font-medium line-through">{f}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  {plan.isPaid && plan.planId ? (
                    <div>
                      <Button
                        variant={plan.popular ? 'secondary' : 'outline'}
                        size="lg"
                        fullWidth
                        isLoading={payLoading === plan.planId}
                        onClick={() => handleUpgrade(plan.planId!)}
                        className={cn(
                          'gap-2',
                          plan.popular ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100' : ''
                        )}
                      >
                        {payLoading !== plan.planId && <>{plan.cta}<ArrowRight size={16} /></>}
                      </Button>
                      {payError && (
                        <p className="mt-2 text-xs text-red-600 font-medium text-center">{payError}</p>
                      )}
                    </div>
                  ) : (
                    <Link to={user ? "/dashboard" : plan.ctaPath}>
                      <Button
                        variant="outline"
                        size="lg"
                        fullWidth
                        className="gap-2"
                      >
                        {plan.cta}
                        <ArrowRight size={16} />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Trust row */}
          <div className="mt-10 sm:mt-14 flex flex-wrap justify-center gap-6 sm:gap-10 text-slate-500">
            {[
              { icon: Shield, text: 'SSL Secure Payments via Razorpay' },
              { icon: CheckCircle, text: 'No Hidden Fees — No Lock-In Period' },
              { icon: Users, text: 'Growing Student Community' },
            ].map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-center gap-2 text-sm font-bold">
                <Icon size={16} className="text-slate-400" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison CTA */}
      <section className="py-12 sm:py-16 bg-blue-600 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-white rounded-full" />
          <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-white rounded-full" />
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">₹99 vs ₹3,000+ Private Tuition</h2>
          <p className="text-blue-100 mb-6 text-sm sm:text-base">
            BoardTopper AI costs less than a single tuition session — and is available 24/7, personalized just for you.
          </p>
          <Link to="/signup">
            <Button variant="white" size="lg" className="gap-2 shadow-xl text-blue-700 font-extrabold">
              Start for Free — No Card Needed <ArrowRight size={17} />
            </Button>
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">Common Questions</h2>
            <p className="text-slate-500">Everything you need to know before getting started.</p>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className={cn(
                  'border rounded-2xl overflow-hidden transition-all',
                  openFaq === i ? 'border-blue-200 shadow-sm' : 'border-slate-100'
                )}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between text-left px-5 py-4 hover:bg-slate-50 transition-colors"
                  aria-expanded={openFaq === i}
                >
                  <span className="font-bold text-slate-900 text-sm pr-4">{faq.q}</span>
                  <ChevronDown
                    size={17}
                    className={cn('text-slate-400 shrink-0 transition-transform duration-200', openFaq === i && 'rotate-180')}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-sm text-slate-600 font-medium leading-relaxed border-t border-slate-100 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PricingPage;

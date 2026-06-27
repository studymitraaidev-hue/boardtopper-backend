import React, { useState } from 'react';
import {
  Mail, CreditCard, Settings, MapPin, ChevronDown, ChevronUp,
  HelpCircle, ShieldCheck, Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';

const CONTACT_CARDS = [
  {
    icon: Mail,
    title: 'General Support',
    email: 'support@boardtopper.ai',
    response: 'Within 24 hours',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
  },
  {
    icon: CreditCard,
    title: 'Payment & Billing',
    email: 'billing@boardtopper.ai',
    response: 'Within 4 hours',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
  },
  {
    icon: Settings,
    title: 'Technical Issues',
    email: 'tech@boardtopper.ai',
    response: 'Within 12 hours',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
  },
] as const;

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: 'How do I upgrade to Pro?',
    a: (
      <>
        Go to the{' '}
        <Link to="/pricing" className="text-blue-600 font-semibold hover:underline">
          Pricing page
        </Link>{' '}
        and tap <strong>Upgrade to Pro</strong>. Payment can be made via UPI, debit/credit card,
        or net banking through Razorpay.
      </>
    ),
  },
  {
    q: 'Is my payment information safe?',
    a: (
      <>
        Yes. All payments are processed by <strong>Razorpay</strong>, a PCI-DSS compliant payment
        gateway. BoardTopper AI never stores your card number, CVV, or UPI PIN on our servers.
      </>
    ),
  },
  {
    q: 'Can I get a refund?',
    a: (
      <>
        Refunds are available in limited cases (technical errors, duplicate charges, or extended
        outages). See our{' '}
        <Link to="/refund" className="text-blue-600 font-semibold hover:underline">
          Refund &amp; Cancellation Policy
        </Link>{' '}
        for full details.
      </>
    ),
  },
  {
    q: 'The AI gave a wrong answer. What should I do?',
    a: 'AI can occasionally make errors, especially on complex numerical problems. Always verify AI answers against your official MSBSHSE textbook. If you find an incorrect answer, email us at support@boardtopper.ai with the question — we review and improve our system based on your feedback.',
  },
  {
    q: 'How do I cancel my Pro subscription?',
    a: (
      <>
        You can cancel anytime from <strong>Settings → Subscription</strong> in your account. Your
        Pro access continues until the end of the current billing period. You can also email{' '}
        <strong>billing@boardtopper.ai</strong> with subject "Cancel Subscription".
      </>
    ),
  },
];

function FAQItem({ q, a }: { q: string; a: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-100 rounded-2xl overflow-hidden mb-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-5 text-left bg-white hover:bg-slate-50 transition-colors"
      >
        <span className="font-semibold text-slate-800 text-sm pr-4">{q}</span>
        {open
          ? <ChevronUp size={16} className="text-blue-600 shrink-0" />
          : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-5 bg-white text-sm text-slate-600 leading-relaxed border-t border-slate-50">
          <div className="pt-4">{a}</div>
        </div>
      )}
    </div>
  );
}

export default function ContactUs() {
  return (
    <div className="min-h-screen bg-slate-50 page-enter">
      <Navbar />

      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-16 px-4 pt-28">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
            <Mail size={14} />
            We're here to help
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mb-3">Contact Us</h1>
          <p className="text-blue-100 text-base sm:text-lg max-w-xl mx-auto">
            Get support for your studies, account, or payment — our team responds fast.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Contact Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {CONTACT_CARDS.map(({ icon: Icon, title, email, response, color, bg, border }) => (
            <div
              key={title}
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:border-slate-200 transition-all card-lift"
            >
              <div className={`w-10 h-10 ${bg} border ${border} rounded-xl flex items-center justify-center mb-3`}>
                <Icon size={18} className={color} />
              </div>
              <p className="font-bold text-slate-800 text-sm mb-1">{title}</p>
              <a
                href={`mailto:${email}`}
                className={`text-xs font-semibold ${color} hover:underline break-all`}
              >
                {email}
              </a>
              <div className="flex items-center gap-1.5 mt-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <p className="text-xs text-slate-500">{response}</p>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
              <HelpCircle size={18} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Frequently Asked Questions</h2>
          </div>
          {FAQS.map((faq, i) => (
            <FAQItem key={i} q={faq.q} a={faq.a} />
          ))}
        </div>

        {/* Registered Address */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
              <MapPin size={18} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Company Information</h2>
          </div>
          <div className="text-sm text-slate-600 leading-relaxed space-y-1.5 mb-4">
            <p className="font-bold text-slate-800">BoardTopper Education Technologies</p>
            <p className="text-slate-600">
              House No. 4333, Lalchand Nagar, Near Morya Aqua,<br />
              Varul Road, Tal. Shindkheda,<br />
              Dist. Dhule, Maharashtra – 425406, India
            </p>
          </div>
          <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
            <strong>Support Hours:</strong> Monday to Friday, 10 AM – 6 PM IST. All student
            support is provided via email.
          </div>
        </div>

        {/* Grievance Officer — Mandatory under IT Act 2000 & Consumer Protection E-Commerce Rules 2020 */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-violet-50 rounded-xl text-violet-600">
              <ShieldCheck size={18} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Grievance Redressal Officer</h2>
          </div>
          <p className="text-xs text-slate-500 mb-5 leading-relaxed">
            As per the Information Technology Act, 2000 and Consumer Protection (E-Commerce)
            Rules, 2020
          </p>

          <div className="space-y-3 text-sm">
            <div className="flex gap-3 items-start">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide w-24 shrink-0 mt-0.5">Name</span>
              <span className="text-slate-700 font-semibold">Sarthak Jaywant Borse</span>
            </div>
            <div className="flex gap-3 items-start">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide w-24 shrink-0 mt-0.5">Designation</span>
              <span className="text-slate-700">Grievance Officer</span>
            </div>
            <div className="flex gap-3 items-start">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide w-24 shrink-0 mt-0.5">Email</span>
              <a href="mailto:grievance@boardtopper.ai" className="text-violet-600 font-semibold hover:underline">
                grievance@boardtopper.ai
              </a>
            </div>
            <div className="flex gap-3 items-start">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide w-24 shrink-0 mt-0.5">Phone</span>
              <a href="tel:+918830269361" className="text-slate-700 font-semibold hover:underline">
                +91 88302 69361
              </a>
            </div>
            <div className="flex gap-3 items-start">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide w-24 shrink-0 mt-0.5">Hours</span>
              <div className="flex items-center gap-1.5 text-slate-700">
                <Clock size={13} className="text-violet-500 shrink-0" />
                Monday – Sunday, 9 AM – 9 PM IST
              </div>
            </div>
          </div>

          <div className="mt-5 bg-violet-50 border border-violet-100 rounded-xl px-4 py-3 text-xs text-violet-800">
            All complaints submitted to the Grievance Officer will be addressed within{' '}
            <strong>30 days</strong> as mandated by the IT Act, 2000.
          </div>
        </div>

      </div>

      <Footer />
    </div>
  );
}

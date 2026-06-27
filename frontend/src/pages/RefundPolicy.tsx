import React from 'react';
import {
  RefreshCw, CheckCircle, Mail, CreditCard,
  Clock, AlertCircle, BookOpen, Zap,
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';

interface SectionCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

function SectionCard({ icon, title, children }: SectionCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-50 rounded-xl text-blue-600">{icon}</div>
        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
      </div>
      <div className="text-sm text-slate-600 leading-relaxed">{children}</div>
    </div>
  );
}

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 page-enter">
      <Navbar />

      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-16 px-4 pt-28">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
            <RefreshCw size={14} />
            Refund &amp; Cancellation Policy
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mb-3">
            Refund &amp; Cancellation Policy
          </h1>
          <p className="text-blue-100 text-base sm:text-lg max-w-xl mx-auto">
            Please read this policy carefully before subscribing to BoardTopper AI Pro.
          </p>
          <p className="text-blue-200 text-xs mt-4">Last updated: May 2026</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">

        <SectionCard icon={<RefreshCw size={18} />} title="1. Subscription Cancellation Policy">
          <p className="mb-3">
            You may cancel your BoardTopper AI Pro subscription at any time from{' '}
            <strong className="text-slate-700">Settings → Subscription</strong> in your account dashboard.
          </p>
          <ul className="space-y-2 mb-4">
            <li className="flex gap-2">
              <span className="text-blue-500 font-bold mt-0.5">•</span>
              <span>
                Upon cancellation, your Pro access continues until the{' '}
                <strong className="text-slate-700">end of your current billing period</strong>.
                No pro-rata refunds are issued for unused days.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-500 font-bold mt-0.5">•</span>
              <span>
                After your billing period ends, your account automatically downgrades to the Free plan.
              </span>
            </li>
          </ul>
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-800 font-medium">
            We do not offer refunds for partially used subscription periods.
          </div>
        </SectionCard>

        <SectionCard icon={<CheckCircle size={18} />} title="2. Refund Eligibility">
          <p className="mb-4">Refunds are issued only in the following limited circumstances:</p>
          <div className="space-y-3 mb-4">
            {[
              {
                label: 'a) Technical error — payment charged but access never granted',
                detail: 'If our system failed to activate your Pro plan despite a successful payment.',
              },
              {
                label: 'b) Duplicate payment for the same billing period',
                detail: 'If you were charged more than once for the same subscription cycle.',
              },
              {
                label: 'c) Service outage exceeding 72 continuous hours in a billing month',
                detail: 'If BoardTopper AI was completely unavailable for more than 72 uninterrupted hours.',
              },
            ].map((item, i) => (
              <div key={i} className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                <p className="font-semibold text-emerald-800 text-sm mb-1">{item.label}</p>
                <p className="text-emerald-700 text-xs">{item.detail}</p>
              </div>
            ))}
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-xs text-red-800 font-medium">
            In all other cases, subscriptions are non-refundable.
          </div>
        </SectionCard>

        <SectionCard icon={<Mail size={18} />} title="3. How to Request a Refund">
          <p className="mb-4">To request a refund, email us with the following details:</p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 font-mono text-xs space-y-1.5">
            <p><strong>To:</strong> <span className="text-blue-600">billing@boardtopper.ai</span></p>
            <p><strong>Subject:</strong> Refund Request — [your registered email]</p>
            <p><strong>Include:</strong></p>
            <ul className="ml-4 space-y-1">
              <li>• Order ID from Razorpay (found in your payment confirmation)</li>
              <li>• Date of payment</li>
              <li>• Reason for refund request</li>
            </ul>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <Clock size={13} className="text-blue-500 shrink-0" />
            All refund requests are reviewed within{' '}
            <strong className="text-slate-700 ml-1">2 business days</strong>.
          </div>
        </SectionCard>

        <SectionCard icon={<CreditCard size={18} />} title="4. Refund Processing Timeline">
          <p className="mb-4">
            Approved refunds are processed back to your original payment method as per RBI guidelines:
          </p>
          <div className="space-y-3 mb-4">
            {[
              { method: 'Debit / Credit Card', time: '5–7 business days', color: 'bg-blue-50 border-blue-100 text-blue-700' },
              { method: 'UPI',                 time: '2–3 business days', color: 'bg-green-50 border-green-100 text-green-700' },
              { method: 'Net Banking',         time: '2–3 business days', color: 'bg-violet-50 border-violet-100 text-violet-700' },
            ].map((row) => (
              <div key={row.method} className={`rounded-xl p-3.5 border flex items-center justify-between ${row.color}`}>
                <span className="font-semibold text-sm">{row.method}</span>
                <span className="text-xs font-medium">{row.time}</span>
              </div>
            ))}
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-800">
            Razorpay's transaction fee at the time of the original payment is not reversed as part of any refund.
          </div>
        </SectionCard>

        <SectionCard icon={<AlertCircle size={18} />} title="5. Failed Transaction Refunds">
          <p className="mb-3">
            If your payment failed but your account was debited, the amount is automatically
            reversed by your bank within{' '}
            <strong className="text-slate-700">1 business day (T+1)</strong>.
          </p>
          <p className="mb-4">
            If not received within <strong className="text-slate-700">5 business days</strong>, contact us:
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-xs space-y-1">
            <p><strong>Email:</strong> <span className="text-blue-600">billing@boardtopper.ai</span></p>
            <p><strong>Include:</strong> Your transaction reference number from your bank or UPI app.</p>
          </div>
        </SectionCard>

        <SectionCard icon={<BookOpen size={18} />} title="6. No Refund on Digital Content">
          <p className="mb-3">
            Notes, AI-generated content, and quiz attempts accessed during a subscription period
            are considered <strong className="text-slate-700">delivered digital goods</strong> and
            are not eligible for refund.
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-500">
            This applies regardless of the volume of content consumed during the subscription period.
          </div>
        </SectionCard>

        <div className="bg-blue-600 text-white rounded-2xl p-6 text-center">
          <Zap size={20} className="mx-auto mb-2 text-yellow-300" />
          <p className="font-bold mb-1">Have a billing question?</p>
          <p className="text-blue-100 text-sm mb-3">
            Email us at{' '}
            <a href="mailto:billing@boardtopper.ai" className="text-white font-bold underline">
              billing@boardtopper.ai
            </a>{' '}
            — we respond within 2 business days.
          </p>
          <p className="text-blue-200 text-xs">For general support: support@boardtopper.ai</p>
        </div>

      </div>

      <Footer />
    </div>
  );
}

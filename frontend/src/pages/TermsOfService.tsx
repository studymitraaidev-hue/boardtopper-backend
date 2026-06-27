import React from 'react';
import { FileText, BookOpen, User, Bot, CreditCard, Copyright, AlertTriangle, Gavel, RefreshCw } from 'lucide-react';
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

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-50 page-enter">
      <Navbar />

      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-16 px-4 pt-28">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
            <FileText size={14} />
            Clear and fair terms
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mb-3">Terms of Service</h1>
          <p className="text-blue-100 text-base sm:text-lg max-w-xl mx-auto">
            Please read these terms carefully before using BoardTopper AI. By creating an account, you agree to these terms.
          </p>
          <p className="text-blue-200 text-xs mt-4">Last updated: April 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-10">

        <SectionCard icon={<FileText size={18} />} title="1. Acceptance of Terms">
          <p className="mb-3">By creating an account or using BoardTopper AI in any way, you confirm that you have read, understood, and agreed to these Terms of Service.</p>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mt-3">
            <p className="font-semibold text-amber-800 mb-1">Age Requirement</p>
            <p className="text-amber-700 text-xs">You must be at least <strong>13 years old</strong> to use this service. Students under 18 should have the consent of a parent or legal guardian before creating an account.</p>
          </div>
        </SectionCard>

        <SectionCard icon={<BookOpen size={18} />} title="2. Description of Service">
          <p className="mb-4">BoardTopper AI provides AI-powered study assistance for Maharashtra State Board (SSC) Class 10 students, including:</p>
          <ul className="space-y-2 mb-4">
            {[
              'AI Doubt Solver — step-by-step solutions to textbook questions',
              'Smart Notes — chapter summaries aligned to the Board syllabus',
              'Exam Simulation — timed mock tests with AI-assisted marking',
              'Emergency Mode — rapid revision for upcoming exams',
            ].map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-blue-500 font-bold mt-0.5">·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="font-bold text-slate-800 text-sm mb-1">Free Plan</p>
              <p className="text-xs text-slate-500">3 AI doubts per day · Basic features</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="font-bold text-blue-800 text-sm mb-1">Pro Plan — ₹99/month</p>
              <p className="text-xs text-blue-600">Unlimited AI doubts · All features</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={<User size={18} />} title="3. User Responsibilities">
          <ul className="space-y-2.5">
            {[
              'Provide accurate and truthful information when registering.',
              'Keep your password confidential and not share login credentials.',
              'Not share your account with other students or individuals.',
              'Use the platform only for genuine study and educational purposes.',
              'Not attempt to reverse-engineer, hack, or misuse any part of this platform.',
            ].map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-emerald-500 font-bold mt-0.5">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard icon={<Bot size={18} />} title="4. AI Content Disclaimer">
          <p className="mb-3">Our AI Doubt Solver provides study assistance based on the Maharashtra State Board (SSC) Class 10 syllabus.</p>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <p className="font-semibold text-amber-800 mb-1.5">Important Notice</p>
            <p className="text-amber-700 text-xs leading-relaxed">While we strive for the highest accuracy, AI-generated answers should always be verified against your official textbooks and confirmed with your teachers. <strong>BoardTopper AI is not responsible for any exam results or marks based solely on AI-generated content.</strong></p>
          </div>
        </SectionCard>

        <SectionCard icon={<CreditCard size={18} />} title="5. Payment Terms">
          <ul className="space-y-2.5">
            <li className="flex gap-2"><span className="text-blue-500 font-bold mt-0.5">·</span><span>Monthly Pro plan is billed at <strong className="text-slate-700">₹99 per month</strong>, charged on the date of your first purchase.</span></li>
            <li className="flex gap-2"><span className="text-blue-500 font-bold mt-0.5">·</span><span>Yearly Pro plan is billed at <strong className="text-slate-700">₹799 per year</strong> (saving ₹389 vs monthly). Billed as a single annual charge.</span></li>
            <li className="flex gap-2"><span className="text-blue-500 font-bold mt-0.5">·</span><span>All Pro plans include <strong className="text-slate-700">unlimited AI doubts</strong> and access to all platform features.</span></li>
            <li className="flex gap-2"><span className="text-blue-500 font-bold mt-0.5">·</span><span>All payments are processed securely through <strong className="text-slate-700">Razorpay</strong>. We do not store your card or UPI details.</span></li>
            <li className="flex gap-2"><span className="text-blue-500 font-bold mt-0.5">·</span><span>Monthly subscriptions renew automatically each month. Yearly subscriptions renew annually. Both renew unless cancelled before the renewal date.</span></li>
            <li className="flex gap-2"><span className="text-blue-500 font-bold mt-0.5">·</span><span>Cancellation takes effect at the <strong className="text-slate-700">end of the current billing period</strong>. You retain Pro access until then.</span></li>
          </ul>
        </SectionCard>

        {/*
          TASK 4 FIX — Section 6 Intellectual Property:
          Original: "BoardTopper AI / TopperLabs EdTech Pvt. Ltd."
          Fixed:    "BoardTopper AI"
          Reason:   Company is not yet incorporated. Using "Pvt. Ltd." in legal
                    documents before registration violates Companies Act, 2013 (India)
                    and creates false legal identity — a serious compliance risk.
        */}
        <SectionCard icon={<Copyright size={18} />} title="6. Intellectual Property">
          <p>All content on BoardTopper AI — including AI prompts, chapter notes, exam questions, platform design, and branding — is the exclusive intellectual property of <strong className="text-slate-700">BoardTopper AI</strong>.</p>
          <p className="mt-3">Students may not reproduce, distribute, sell, or publish any platform content without written permission. Personal study use is permitted.</p>
        </SectionCard>

        <SectionCard icon={<AlertTriangle size={18} />} title="7. Limitation of Liability">
          <p className="mb-3">BoardTopper AI is a study assistance tool designed to support — not replace — classroom learning and teacher guidance.</p>
          <p className="mb-3">We are not liable for exam results, academic marks, board exam outcomes, or any academic decisions made based on content provided by the platform.</p>
          <p>Our maximum liability to any user is limited to the <strong className="text-slate-700">total amount paid in the most recent billing month</strong>.</p>
        </SectionCard>

        <SectionCard icon={<Gavel size={18} />} title="8. Governing Law">
          <p>These Terms of Service are governed by the laws of the <strong className="text-slate-700">Republic of India</strong>. Any disputes arising from the use of this platform shall be subject to the exclusive jurisdiction of the courts in <strong className="text-slate-700">Mumbai, Maharashtra</strong>.</p>
        </SectionCard>

        <SectionCard icon={<RefreshCw size={18} />} title="9. Changes to These Terms">
          <p>We may update these Terms of Service from time to time. When we do, we will notify all registered users via email at least <strong className="text-slate-700">7 days before the changes take effect</strong>. Continued use of the platform after that date constitutes acceptance of the updated terms.</p>
        </SectionCard>

      </div>

      <Footer />
    </div>
  );
}

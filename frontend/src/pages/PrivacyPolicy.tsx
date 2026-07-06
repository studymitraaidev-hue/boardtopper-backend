import React from 'react';
import { Shield, Database, Eye, Users, Mail, Lock } from 'lucide-react';
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

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 page-enter">
      <Navbar />

      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-16 px-4 pt-28">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
            <Shield size={14} />
            Your data is safe with us
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mb-3">Privacy Policy</h1>
          <p className="text-blue-100 text-base sm:text-lg max-w-xl mx-auto">
            BoardTopper AI is committed to protecting the privacy of every student on our platform.
          </p>
          <p className="text-blue-200 text-xs mt-4">Last updated: April 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-10">

        <SectionCard icon={<Eye size={18} />} title="1. Information We Collect">
          <p className="mb-3">When you create an account, we collect:</p>
          <ul className="space-y-2 mb-3">
            <li className="flex gap-2"><span className="text-blue-500 font-bold mt-0.5">·</span><span><strong className="text-slate-700">Account details:</strong> Your name, email address, and encrypted password.</span></li>
            <li className="flex gap-2"><span className="text-blue-500 font-bold mt-0.5">·</span><span><strong className="text-slate-700">Study activity:</strong> Doubts asked, subjects accessed, notes generated, and exam simulation results — used to personalise your experience.</span></li>
            <li className="flex gap-2"><span className="text-blue-500 font-bold mt-0.5">·</span><span><strong className="text-slate-700">Device &amp; security data:</strong> Device type, browser, and IP address to detect fraudulent access and keep your account secure.</span></li>
            <li className="flex gap-2"><span className="text-blue-500 font-bold mt-0.5">·</span><span><strong className="text-slate-700">Payment information:</strong> All payments are processed by Razorpay. We never store your card number, CVV, or UPI PIN on our servers.</span></li>
          </ul>
        </SectionCard>

        <SectionCard icon={<Database size={18} />} title="2. How We Use Your Information">
          <ul className="space-y-2">
            {[
              'Deliver personalised study recommendations based on your performance patterns.',
              'Power the AI Doubt Solver feature using Google Gemini AI.',
              'Process subscription payments securely through Razorpay.',
              'Send important account, payment, and study reminder emails.',
              'Continuously improve the accuracy of our AI model and study content.',
            ].map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-emerald-500 font-bold mt-0.5">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard icon={<Lock size={18} />} title="3. Data Storage and Security">
          <ul className="space-y-2.5">
            <li className="flex gap-2"><span className="text-blue-500 font-bold mt-0.5">·</span><span>All data is stored on <strong className="text-slate-700">Supabase (PostgreSQL)</strong> servers located in <strong className="text-slate-700">Mumbai, India</strong>.</span></li>
            <li className="flex gap-2"><span className="text-blue-500 font-bold mt-0.5">·</span><span>Your login session and basic profile information is also stored in your <strong className="text-slate-700">browser's local storage</strong> to keep you signed in across page visits. This data is automatically cleared when you log out or clear your browser data.</span></li>
            <li className="flex gap-2"><span className="text-blue-500 font-bold mt-0.5">·</span><span>All data in transit and at rest is protected with <strong className="text-slate-700">256-bit AES encryption</strong>.</span></li>
            <li className="flex gap-2"><span className="text-blue-500 font-bold mt-0.5">·</span><span>Passwords are <strong className="text-slate-700">hashed using bcrypt</strong> — we never store plain-text passwords.</span></li>
            <li className="flex gap-2"><span className="text-blue-500 font-bold mt-0.5">·</span><span className="text-emerald-700 font-semibold">We never sell your personal data to any third party.</span></li>
          </ul>
        </SectionCard>

        <SectionCard icon={<Users size={18} />} title="4. Third-Party Services We Use">
          <p className="mb-3">We use the following trusted service providers to operate our platform:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { name: 'Supabase', role: 'Database & authentication', color: 'bg-emerald-50 border-emerald-100' },
              { name: 'Google Gemini AI', role: 'AI-powered doubt solving', color: 'bg-blue-50 border-blue-100' },
              { name: 'Razorpay', role: 'Secure payment processing', color: 'bg-indigo-50 border-indigo-100' },
              { name: 'Resend', role: 'Transactional email delivery', color: 'bg-violet-50 border-violet-100' },
            ].map((s) => (
              <div key={s.name} className={`rounded-xl p-3 border ${s.color}`}>
                <p className="font-bold text-slate-800 text-sm">{s.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.role}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">Each provider has its own privacy policy and data processing agreement. We share only the minimum data required for each service to function.</p>
          <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700">
            <strong>Note on Google Gemini AI:</strong> When you submit questions to our AI Doubt Solver, your inputs may be used by Google to improve their AI models as per Google's privacy policy. We recommend not sharing personal information in your study questions.
          </div>
        </SectionCard>

        <SectionCard icon={<Shield size={18} />} title="5. Your Rights">
          <p className="mb-3">As a user of BoardTopper AI, you have the following rights under Indian law:</p>
          <ul className="space-y-2">
            {[
              'Request complete deletion of your account and all associated data.',
              'Download a copy of your personal data at any time.',
              'Opt out of non-essential marketing and promotional emails.',
              'Raise a privacy concern or dispute and receive a response within 48 hours.',
            ].map((right, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-blue-500 font-bold mt-0.5">·</span>
                <span>{right}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard icon={<Shield size={18} />} title="6. Grievance Officer — IT Act 2000">
          <p className="mb-4">As required under the Information Technology Act 2000 and the IT (Reasonable Security Practices and Procedures) Rules 2011, BoardTopper AI has appointed a Grievance Officer to address privacy complaints and data concerns:</p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5 text-sm">
            <p><strong className="text-slate-700">Name:</strong> Founder, BoardTopper AI</p>
            <p><strong className="text-slate-700">Organisation:</strong> BoardTopper AI</p>
            <p><strong className="text-slate-700">Address:</strong> Maharashtra, India</p>
            <p><strong className="text-slate-700">Email:</strong> <span className="text-blue-700 font-semibold">privacy@boardtopper.ai</span></p>
          </div>
          <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
            All complaints will be <strong>acknowledged within 48 hours</strong> and resolved within <strong>30 days</strong> as mandated under the IT Act 2000.
          </div>
        </SectionCard>

        <SectionCard icon={<Mail size={18} />} title="7. Contact for Privacy Concerns">
          <p className="mb-4">For any privacy-related questions, data requests, or concerns:</p>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="font-bold text-slate-800 mb-1">Privacy Officer — BoardTopper AI</p>
            <p className="text-blue-700 font-semibold">privacy@boardtopper.ai</p>
            <p className="text-xs text-slate-500 mt-2">We respond to all privacy requests within <strong>48 hours</strong> on business days.</p>
          </div>
        </SectionCard>

      </div>

      <Footer />
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap, Mail, MapPin, ShieldCheck, Heart,
  Twitter, Instagram, Youtube
} from 'lucide-react';

const YEAR = new Date().getFullYear();

const LINKS = {
  Learning: [
    { label: 'Study Dashboard',  path: '/dashboard'    },
    { label: 'AI Doubt Solver',  path: '/doubt-solver' },
    { label: 'Smart Notes',      path: '/notes'        },
    { label: 'Exam Simulator',   path: '/simulation'   },
    { label: 'Emergency Mode',   path: '/emergency'    },
  ],
  Resources: [
    { label: 'Pricing Plans',    path: '/pricing'      },
    { label: 'PYQ Archive',      path: '/notes'        },
    { label: 'For Parents',      path: '/#parents'     },
    { label: 'Topper Tips',      path: '/notes'        },
  ],
  Company: [
    { label: 'About Us',         path: '/'             },
    { label: 'Privacy Policy',   path: '/privacy'      },
    { label: 'Terms of Service', path: '/terms'        },
    { label: 'Refund Policy',    path: '/refund'       },
    { label: 'Contact Us',       path: '/contact'      },
  ],
};

export const Footer = () => (
  <footer className="bg-slate-950 border-t border-slate-800/60" role="contentinfo">
    <div className="max-w-7xl mx-auto px-4 sm:px-6">

      {/* Top */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 sm:gap-12 py-14 sm:py-16">

        {/* Brand */}
        <div className="lg:col-span-4 space-y-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="bg-blue-600 p-2 rounded-xl group-hover:bg-blue-500 transition-colors">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black text-white tracking-tight">
              BoardTopper<span className="text-blue-400">AI</span>
            </span>
          </Link>
          {/* TASK 4: "India's #1 AI-powered platform..." → accurate description */}
          <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
            AI-powered study platform for Class 10 Maharashtra State Board (SSC) students.
          </p>

          {/* Social */}
          <div className="flex items-center gap-3">
            {[
              { Icon: Twitter,   label: 'Twitter'   },
              { Icon: Instagram, label: 'Instagram' },
              { Icon: Youtube,   label: 'YouTube'   },
            ].map(({ Icon, label }) => (
              <a
                key={label}
                href="#"
                aria-label={label}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-blue-600 flex items-center justify-center text-slate-400 hover:text-white transition-all border border-slate-700/50 hover:border-blue-600"
              >
                <Icon size={15} />
              </a>
            ))}
          </div>

          {/* Security badge */}
          <div className="flex items-center gap-2.5 bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-3 max-w-xs">
            <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
            <p className="text-xs text-slate-400 font-medium">
              SSL Secure · Student Data Safe · No Data Selling
            </p>
          </div>
        </div>

        {/* Nav columns */}
        {Object.entries(LINKS).map(([section, links]) => (
          <div key={section} className="lg:col-span-2 space-y-5">
            <h4 className="text-xs font-black text-white uppercase tracking-widest">{section}</h4>
            <ul className="space-y-3">
              {links.map(({ label, path }) => (
                <li key={label}>
                  <Link
                    to={path}
                    className="text-sm text-slate-400 hover:text-white transition-colors font-medium inline-flex items-center gap-1 group"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Contact */}
        <div className="lg:col-span-2 space-y-5">
          <h4 className="text-xs font-black text-white uppercase tracking-widest">Contact</h4>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <Mail size={15} className="text-blue-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">Support</p>
                <a href="mailto:hello@boardtopper.ai" className="text-xs text-slate-400 hover:text-white transition-colors">hello@boardtopper.ai</a>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <MapPin size={15} className="text-blue-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">Office</p>
                <p className="text-xs text-slate-400">Powai, Mumbai, Maharashtra</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom */}
      {/* AUDIT: Removed "TopperLabs EdTech Pvt. Ltd." from copyright — company not yet registered */}
      <div className="border-t border-slate-800/60 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-slate-500 font-medium">
          © {YEAR} BoardTopper AI · Built with{' '}
          <Heart size={11} className="inline text-red-500 fill-red-500 mx-0.5" />{' '}
          in India
        </p>
        <div className="flex flex-wrap justify-center gap-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
          <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
          <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
          <Link to="/refund" className="hover:text-white transition-colors">Refunds</Link>
          <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;

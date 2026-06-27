import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 text-center">
      <Link to="/" className="flex items-center gap-2 mb-10">
        <div className="bg-blue-600 p-1.5 rounded-xl">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-black text-slate-900">BoardTopper<span className="text-blue-600">AI</span></span>
      </Link>
      <p className="text-8xl font-black text-slate-200 mb-4">404</p>
      <h1 className="text-2xl font-black text-slate-900 mb-2">Page not found</h1>
      <p className="text-slate-500 text-sm mb-8">The page you're looking for doesn't exist or was moved.</p>
      <div className="flex gap-3">
        <Link to="/dashboard" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors">
          Go to Dashboard
        </Link>
        <Link to="/" className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold px-6 py-2.5 rounded-xl text-sm transition-colors">
          Home
        </Link>
      </div>
    </div>
  );
}

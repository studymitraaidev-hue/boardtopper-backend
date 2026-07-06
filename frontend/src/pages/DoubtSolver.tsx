import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link, useSearchParams } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { cn } from '../utils/cn';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../utils/api';
import {
  Send, Sparkles, MessageCircle,
  History, Lightbulb, CheckCircle2, ChevronRight,
  BookOpen, X, Zap, Clock, Crown, Loader2,
  Camera, ImageIcon
} from 'lucide-react';

interface Message { role: 'ai' | 'user'; text: string; time: string; }

const QUICK_PROMPTS = [
  { label: 'Solve Math Problem',    color: 'bg-blue-50 text-blue-700 border-blue-100    hover:bg-blue-100'    },
  { label: 'Explain Science Concept', color: 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100' },
  { label: 'English Grammar Help',  color: 'bg-violet-50 text-violet-700 border-violet-100 hover:bg-violet-100'  },
  { label: 'History Dates / Facts', color: 'bg-amber-50 text-amber-700 border-amber-100  hover:bg-amber-100'  },
];

export const DoubtSolver = () => {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] ?? 'Student';
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      text: `Hi ${firstName}! I'm your BoardTopper AI tutor. Ask me any question from your textbook — I'll give you a step-by-step, board-style answer.`,
      time: 'Just now',
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef                          = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage]     = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // Real conversation history from backend — replaces fake RECENT
  const [recentHistory, setRecentHistory]     = useState<Array<{
    id: string;
    role: 'user' | 'model';
    text: string;
    subject: string | null;
    timestamp: string;
  }>>([]);
  const [historyLoading, setHistoryLoading]   = useState(false);

  // Read pre-filled question from URL param (set by PYQ "Solve with AI" button)
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const prefilledQ = searchParams.get('q');
    if (prefilledQ && prefilledQ.trim().length > 0) {
      setQuery(decodeURIComponent(prefilledQ));
      // Focus the textarea so student can immediately send
      setTimeout(() => textareaRef.current?.focus(), 300);
    }
  }, []);

  // Load last 5 user questions from conversation history on mount
  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    api.get<Array<{
      id: string;
      role: 'user' | 'model';
      text: string;
      subject: string | null;
      timestamp: string;
    }>>('/api/ai/history')
      .then((data) => {
        if (cancelled) return;
        // Keep only user messages for the "recent" panel, max 5
        const userMsgs = data
          .filter((m) => m.role === 'user')
          .slice(0, 5);
        setRecentHistory(userMsgs);
      })
      .catch(() => {
        // Silent fail — history panel just stays empty
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED.includes(file.type)) {
      alert('Only JPG, PNG, and WebP images are supported.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB.');
      return;
    }

    setSelectedImage(file);
    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
  };

  const handleSend = async () => {
    if ((!query.trim() && !selectedImage) || isTyping) return;

    // Image path: send to /api/ai/doubt-image using FormData
    if (selectedImage) {
      setIsTyping(true);
      const formData = new FormData();
      formData.append('image', selectedImage);
      if (query.trim()) formData.append('question', query.trim());
      formData.append('subject', 'general');

      const userMsg: Message = {
        role: 'user',
        text: query.trim() || '📷 Image question',
        time: 'Just now',
      };
      setMessages(prev => [...prev, userMsg]);
      setQuery('');
      clearImage();

      try {
        const token    = localStorage.getItem('bt_token') ?? '';
        const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';
        const res = await fetch(`${BASE_URL}/api/ai/doubt-image`, {
          method:  'POST',
          headers: { Authorization: `Bearer ${token}` },
          body:    formData,
        });
        const body = await res.json() as { data?: { answer?: string }; error?: string };
        const answerText = body.data?.answer ?? body.error ?? 'Could not process image. Please try again.';
        setMessages(prev => [...prev, {
          role: 'ai',
          text: answerText,
          time: 'Just now',
        }]);
      } catch {
        setMessages(prev => [...prev, {
          role: 'ai',
          text: 'Failed to process image. Please check your connection.',
          time: 'Just now',
        }]);
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Text-only path
    if (!query.trim()) return;
    const questionText = query.trim();
    const userMsg: Message = { role: 'user', text: questionText, time: 'Just now' };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setIsTyping(true);

    try {
      const data = await api.post<{
        answer: string;
        questionType: string;
        estimatedMarks: number;
      }>('/api/ai/ask', {
        question: questionText,
        subject: 'general',
        chapterId: undefined,
      });
      setMessages(prev => [...prev, {
        role: 'ai',
        text: data.answer,
        time: 'Just now',
      }]);
    } catch (err: unknown) {
      // DAY 9: Detect rate-limit (429) — free plan limit reached
      // Show a specific upgrade message instead of a generic error
      const isRateLimit = err instanceof ApiError && err.status === 429;
      setMessages(prev => [...prev, {
        role: 'ai',
        text: isRateLimit
          ? '⚠️ You\'ve reached the free plan limit of 3 doubts/hour. Upgrade to Pro for unlimited AI doubts at boardtopper.ai/pricing'
          : 'AI service is temporarily unavailable. Please try again in a moment.',
        time: 'Just now',
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <AppLayout>
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden page-enter">

        {/* Header */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-100 px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900">AI Doubt Solver</h1>
              <p className="text-xs text-slate-500 hidden sm:block">Step-by-step board-style solutions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1.5 rounded-full border border-emerald-100">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider hidden sm:block">AI Online</span>
              <span className="text-[10px] font-black text-emerald-700 sm:hidden">Live</span>
            </div>
            <Badge variant="primary" className="hidden sm:flex text-[9px]">MH Board</Badge>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">

          {/* Chat Area */}
          <div className="flex-1 flex flex-col min-w-0">

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                  {msg.role === 'ai' && (
                    <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-md shadow-blue-200 mt-1">
                      <Sparkles size={14} className="text-white" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[80%] sm:max-w-[72%] px-4 py-3 rounded-2xl text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-md'
                        : 'bg-white border border-slate-100 text-slate-800 rounded-tl-md shadow-sm'
                    )}
                  >
                    {msg.role === 'ai' ? (
                      <div className="prose prose-sm max-w-none"><ReactMarkdown>{msg.text}</ReactMarkdown></div>
                    ) : (
                      <p>{msg.text}</p>
                    )}
                    <p className={cn('text-[9px] mt-2', msg.role === 'user' ? 'text-blue-200' : 'text-slate-400')}>{msg.time}</p>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                    <Sparkles size={14} className="text-white" />
                  </div>
                  <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-tl-md shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Quick prompts — show only at start */}
              {messages.length === 1 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {QUICK_PROMPTS.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => setQuery(p.label)}
                      className={cn('px-3 py-1.5 text-xs font-bold rounded-full border transition-all', p.color)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-slate-100 bg-white/90 backdrop-blur-sm p-3 sm:p-4">
              <div className="max-w-3xl mx-auto">
                {/* Image preview strip */}
                {selectedImage && imagePreviewUrl && (
                  <div className="flex items-center gap-2 px-4 py-2 mb-2 bg-blue-50 border border-blue-100 rounded-xl">
                    <img
                      src={imagePreviewUrl}
                      alt="Selected question"
                      className="w-12 h-12 rounded-lg object-cover border border-blue-200"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-blue-700 truncate">{selectedImage.name}</p>
                      <p className="text-xs text-blue-500">{(selectedImage.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button
                      onClick={clearImage}
                      className="p-1 rounded-lg hover:bg-blue-100 text-blue-500"
                      aria-label="Remove image"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                <div className="relative">
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <textarea
                    ref={textareaRef}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask any board exam question… (e.g., Explain the derivation of Pythagoras theorem)"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-400 focus:bg-white rounded-2xl px-4 py-3.5 pr-36 text-sm outline-none transition-all min-h-[52px] max-h-32 resize-none shadow-sm placeholder:text-slate-400"
                    rows={1}
                    aria-label="Type your doubt"
                  />
                  <div className="absolute right-3 bottom-2.5 flex items-center gap-1.5">
                    {/* Camera upload button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2.5 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 hover:text-blue-600 shrink-0"
                      aria-label="Upload image"
                      title="Upload a photo of your question"
                    >
                      <Camera size={18} />
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={(!query.trim() && !selectedImage) || isTyping}
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white px-3 py-1.5 rounded-xl text-sm font-bold transition-all"
                    >
                      {isTyping ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <><Send size={14} /> Ask</>
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 text-center">
                  Press Enter to send · Shift+Enter for new line · 📷 Upload image of your question
                </p>
              </div>
            </div>
          </div>

          {/* Right Panel — desktop only */}
          <div className="hidden lg:flex flex-col w-72 xl:w-80 border-l border-slate-100 bg-white overflow-y-auto">
            <div className="p-5 space-y-6">

              {/* Recent Doubts */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <History size={15} className="text-slate-400" />
                  <h3 className="font-extrabold text-slate-900 text-sm">Recent Doubts</h3>
                </div>
                <div className="space-y-2">
                  {historyLoading ? (
                    <div className="flex items-center gap-2 py-4 px-3">
                      <Loader2 size={14} className="animate-spin text-slate-400" />
                      <span className="text-xs text-slate-400">Loading history…</span>
                    </div>
                  ) : recentHistory.length === 0 ? (
                    <div className="py-4 px-3 text-center">
                      <p className="text-xs text-slate-400">
                        Your solved doubts will appear here.
                      </p>
                    </div>
                  ) : (
                    recentHistory.map((item) => {
                      const dateLabel = new Date(item.timestamp).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short',
                      });
                      const preview = item.text.length > 60
                        ? item.text.slice(0, 60) + '…'
                        : item.text;
                      return (
                        <div
                          key={item.id}
                          onClick={() => setQuery(item.text)}
                          className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer
                                     border border-transparent hover:border-slate-100 transition-all group"
                        >
                          <div className="p-1.5 bg-slate-100 rounded-lg shrink-0 mt-0.5">
                            <History size={12} className="text-slate-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-slate-700 leading-snug
                                          group-hover:text-blue-600 transition-colors truncate">
                              {preview}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              {item.subject && item.subject !== 'general' && (
                                <span className="text-[10px] text-slate-400 font-medium capitalize">
                                  {item.subject}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-300">{dateLabel}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="h-px bg-slate-100" />

              {/* AI Tip */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb size={15} className="text-amber-500" />
                  <h3 className="font-extrabold text-slate-900 text-sm">Board Expert Tip</h3>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <p className="text-xs text-amber-900 font-medium leading-relaxed">
                    For Math word problems, always start with{' '}
                    <span className="font-black">Given / To Find / Solution / Verification</span> structure. Examiners give marks for each step.
                  </p>
                </div>
              </div>

              <div className="h-px bg-slate-100" />

              {/* Usage */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-600">Daily Doubts Used</span>
                  <span className="text-xs font-black text-slate-900">2 / 3</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: '66%' }} />
                </div>
                <p className="text-[10px] text-slate-500 mt-2">Free plan: 3 doubts/day</p>
                <Link to="/pricing" className="block mt-3">
                  <Button variant="gold" size="sm" fullWidth className="text-xs font-bold gap-1.5">
                    <Crown size={12} className="shrink-0" />
                    Upgrade for Unlimited Doubts
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </AppLayout>
  );
};

export default DoubtSolver;

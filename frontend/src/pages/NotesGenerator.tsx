import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { SkeletonCard } from '../components/ui/Skeleton';
import { cn } from '../utils/cn';
import { useAuth } from '../context/AuthContext';
import {
  FileText, Download, Printer, Search, ChevronRight,
  BookOpen, Sparkles, Zap, Lock, Crown,
  AlertCircle, Star, Clock, CheckCircle2, BookMarked
} from 'lucide-react';
import type { Subject, Chapter } from '../types/index';
import { getSubjectList, getChaptersBySubject } from '../services/notesService';
import { createUserNote } from '../services/userNotesService';

const typeColor: Record<string, string> = {
  'High Weightage': 'text-amber-700 bg-amber-50 border-amber-200',
  'Important':      'text-blue-700 bg-blue-50 border-blue-200',
  'Core':           'text-violet-700 bg-violet-50 border-violet-200',
  'Coming Soon':    'text-slate-500 bg-slate-50 border-slate-200',
};

export const NotesGenerator = () => {
  // subjects and chapters come from the real API via notesService
  const [subjects, setSubjects]     = useState<Subject[]>([]);
  const [chapters, setChapters]     = useState<Chapter[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Chapter content from chapter_content table (seeded in Days 12-13)
  const [chapterContent, setChapterContent] = useState<{
    keyConcepts:     Array<{ term: string; definition: string }>;
    formulas:        Array<{ name: string; formula: string; when_to_use: string }>;
    boardTips:       string;
    importantPoints: string[];
    pyqPatterns:     string;
    marksBreakdown:  string;
  } | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError,   setContentError]   = useState(false);

  // DAY 37: AI-generated note state
  const [aiNote, setAiNote] = useState<{
    title: string;
    sections: Array<{ heading: string; content: string }>;
    boardTip: string;
    pyqs: Array<{ q: string; marks: number }>;
  } | null>(null);
  const [aiNoteLoading, setAiNoteLoading] = useState(false);
  const [aiNoteError,   setAiNoteError]   = useState(false);

  // PYQ state — Past Year Questions for selected chapter
  const [pyqs, setPyqs]             = useState<Array<{
    id: string;
    year: number;
    marks: number;
    question: string;
    answerHint: string;
    appearedCount: number;
  }>>([]);
  const [pyqsLoading, setPyqsLoading] = useState(false);
  const [activeTab, setActiveTab]     = useState<'content' | 'ai' | 'pyqs'>('content');

  // Save to My Notes state
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveDone,    setSaveDone]    = useState(false);

  // selectedSubjectId tracks which subject pill is active; we track by id
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [search, setSearch]                       = useState('');
  const [selected, setSelected]                   = useState<Chapter | null>(null);

  const { user, isPro } = useAuth();

  // Export the active note as PDF — Pro users only (backend enforces too)
  const [pdfError, setPdfError] = useState<string | null>(null);

  const exportPdf = async (noteId: string) => {
    // DAY 9: Use server-verified isPro — not just JWT user.plan
    if (!isPro) return;
    try {
      setPdfLoading(true);
      setPdfError(null);
      const token    = localStorage.getItem('bt_token');
      const BASE_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:5000';
      const pdfUrl   = `${BASE_URL}/api/pdf/note/${noteId}`;
      const response = await fetch(pdfUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('PDF generation failed');
      const blob      = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor    = document.createElement('a');
      anchor.href     = objectUrl;
      anchor.download = 'boardtopper-notes.pdf';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
    } catch {
      setPdfError('Failed to export PDF. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  };

  // On mount: load the subject list from the API
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getSubjectList().then(({ data }) => {
      if (cancelled) return;
      setSubjects(data);
      // Auto-select the first subject if any come back
      if (data.length > 0) {
        setSelectedSubjectId(data[0].id);
      } else {
        setIsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Whenever the selected subject changes, reload chapters from the API
  useEffect(() => {
    if (!selectedSubjectId) return;
    let cancelled = false;
    setIsLoading(true);
    setSearch('');
    setSelected(null);
    getChaptersBySubject(selectedSubjectId).then(({ data }) => {
      if (cancelled) return;
      setChapters(data);
      // Auto-select the first free chapter so the note viewer shows content
      const firstFree = data.find(c => c.free) ?? null;
      setSelected(firstFree);
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [selectedSubjectId]);

  // Fetch board-specific chapter content when a chapter is selected
  useEffect(() => {
    if (!selected) {
      setChapterContent(null);
      setAiNote(null);
      setAiNoteError(false);
      return;
    }
    let cancelled = false;
    setContentLoading(true);
    setContentError(false);
    setChapterContent(null);
    setSaveDone(false);
    // Also reset AI note when chapter changes
    setAiNote(null);
    setAiNoteError(false);

    const token    = localStorage.getItem('bt_token');
    const BASE_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:5000';

    fetch(`${BASE_URL}/api/chapters/${selected.id}/content`, {
      headers: { Authorization: `Bearer ${token ?? ''}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('No content');
        return res.json();
      })
      .then((data: { data: { content: typeof chapterContent } }) => {
        if (cancelled) return;
        setChapterContent(data.data?.content ?? null);
      })
      .catch(() => {
        if (!cancelled) setContentError(true);
      })
      .finally(() => {
        if (!cancelled) setContentLoading(false);
      });

    return () => { cancelled = true; };
  }, [selected]);

  // Fetch PYQs when chapter is selected
  useEffect(() => {
    if (!selected) {
      setPyqs([]);
      return;
    }
    let cancelled = false;
    setPyqsLoading(true);

    const token    = localStorage.getItem('bt_token');
    const BASE_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:5000';

    fetch(`${BASE_URL}/api/chapters/${selected.id}/pyqs`, {
      headers: { Authorization: `Bearer ${token ?? ''}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('No PYQs');
        return res.json();
      })
      .then((data: { data: { pyqs: typeof pyqs } }) => {
        if (cancelled) return;
        setPyqs(data.data?.pyqs ?? []);
      })
      .catch(() => {
        if (!cancelled) setPyqs([]);
      })
      .finally(() => {
        if (!cancelled) setPyqsLoading(false);
      });

    return () => { cancelled = true; };
  }, [selected]);

  // DAY 37: Fetch (or trigger generation of) AI notes for the selected chapter
  useEffect(() => {
    if (!selected) {
      setAiNote(null);
      return;
    }
    let cancelled = false;
    setAiNoteLoading(true);
    setAiNoteError(false);
    setAiNote(null);

    const token    = localStorage.getItem('bt_token');
    const BASE_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:5000';

    fetch(`${BASE_URL}/api/notes/chapter/${selected.id}`, {
      headers: { Authorization: `Bearer ${token ?? ''}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('AI notes unavailable');
        return res.json();
      })
      .then((data: { data: typeof aiNote }) => {
        if (cancelled) return;
        setAiNote(data.data ?? null);
      })
      .catch(() => {
        if (!cancelled) setAiNoteError(true);
      })
      .finally(() => {
        if (!cancelled) setAiNoteLoading(false);
      });

    return () => { cancelled = true; };
  }, [selected]);

  /*
   * Builds a plain-text note body from key concepts, formulas, and board tips.
   * Uses the existing createUserNote service which calls POST /api/user-notes.
   */
  const handleSaveToMyNotes = async () => {
    if (!selected || !chapterContent || saveLoading) return;
    setSaveLoading(true);
    setSaveDone(false);

    // Build note title
    const title = `${selected.name} — Board Notes`;

    // Build note content from structured board data
    const lines: string[] = [];

    if (chapterContent.keyConcepts.length > 0) {
      lines.push('KEY CONCEPTS');
      lines.push('─────────────');
      chapterContent.keyConcepts.forEach(kc => {
        lines.push(`• ${kc.term}: ${kc.definition}`);
      });
      lines.push('');
    }

    if (chapterContent.formulas.length > 0) {
      lines.push('FORMULAS');
      lines.push('─────────');
      chapterContent.formulas.forEach(f => {
        lines.push(`• ${f.name}: ${f.formula}`);
        lines.push(`  When to use: ${f.when_to_use}`);
      });
      lines.push('');
    }

    if (chapterContent.importantPoints.length > 0) {
      lines.push('IMPORTANT POINTS');
      lines.push('─────────────────');
      chapterContent.importantPoints.forEach(pt => {
        lines.push(`• ${pt}`);
      });
      lines.push('');
    }

    if (chapterContent.boardTips) {
      lines.push('EXAMINER TIPS');
      lines.push('──────────────');
      lines.push(chapterContent.boardTips);
      lines.push('');
    }

    if (chapterContent.pyqPatterns) {
      lines.push('PAST YEAR PATTERN');
      lines.push('──────────────────');
      lines.push(chapterContent.pyqPatterns);
    }

    const content = lines.join('\n').trim();

    const { error } = await createUserNote(title, content);
    setSaveLoading(false);

    if (!error) {
      setSaveDone(true);
      // Reset the done indicator after 3 seconds
      setTimeout(() => setSaveDone(false), 3000);
    }
  };

  const handleSubjectChange = (id: string) => {
    setSelectedSubjectId(id);
  };

  // Filter chapters client-side based on the search box
  const visibleChapters = chapters.filter(
    c => c.name.toLowerCase().includes(search.toLowerCase())
  );

  // Find the current subject object for display (chapter count, etc.)
  const currentSubject = subjects.find(s => s.id === selectedSubjectId);

  return (
    <AppLayout>
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden page-enter">

        {/* Header */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-100 px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">Smart Notes Generator</h1>
                <Badge variant="gold" className="shrink-0 text-[9px] py-0.5 hidden sm:inline-flex">PREMIUM</Badge>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">AI-curated board-pattern revision notes</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" className="gap-1.5 hidden sm:flex">
              <Download size={14} /> Export
            </Button>
            <Button variant="secondary" size="sm" className="gap-1.5">
              <Sparkles size={14} className="text-amber-300 fill-amber-200" />
              <span className="hidden sm:inline">Generate</span>
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 max-w-6xl">

            {/* Subject pills — rendered from real API data */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {subjects.map(s => (
                <button
                  key={s.id}
                  onClick={() => handleSubjectChange(s.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all shrink-0 border',
                    selectedSubjectId === s.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  )}
                >
                  {s.emoji && <span>{s.emoji}</span>}
                  {s.name}
                  {s.chapters !== undefined && (
                    <span className={cn('text-[10px] font-black ml-0.5', selectedSubjectId === s.id ? 'text-slate-400' : 'text-slate-400')}>
                      {s.chapters}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Cross-navigation: link to My Notes */}
            <div className="flex items-center justify-between bg-white border border-slate-100
                            rounded-2xl px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-violet-50 rounded-lg shrink-0">
                  <BookMarked size={14} className="text-violet-600" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800">
                    Your personal notes are in My Notes
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Board notes here · Personal notes there
                  </p>
                </div>
              </div>
              <Link
                to="/my-notes"
                className="shrink-0 flex items-center gap-1 text-[10px] font-black
                           text-violet-600 hover:text-violet-800 transition-colors"
              >
                Go to My Notes <ChevronRight size={11} />
              </Link>
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">

              {/* Chapter List */}
              <div className="lg:col-span-2 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search chapters…"
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 focus:border-blue-400 focus:bg-white rounded-xl text-sm outline-none transition-all shadow-sm placeholder:text-slate-400"
                    aria-label="Search chapters"
                  />
                </div>

                <div className="space-y-2">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <SkeletonCard key={i} />
                    ))
                  ) : (
                  <>
                  {visibleChapters.map((ch, i) => (
                    <button
                      key={ch.id ?? i}
                      onClick={() => {
                        if ((ch.free || isPro)) {
                          setActiveTab('content');
                          setSelected(ch);
                        }
                      }}
                      className={cn(
                        'w-full text-left flex items-center gap-3 p-3.5 rounded-xl border transition-all group',
                        selected?.name === ch.name && (ch.free || isPro)
                          ? 'bg-blue-50 border-blue-300 shadow-sm'
                          : (ch.free || isPro)
                          ? 'bg-white border-slate-100 hover:border-blue-200 hover:bg-blue-50/40 shadow-sm'
                          : 'bg-white border-dashed border-slate-200 opacity-70 cursor-default'
                      )}
                    >
                      <div className={cn(
                        'p-2 rounded-lg shrink-0 transition-colors',
                        selected?.name === ch.name && (ch.free || isPro)
                          ? 'bg-blue-600'
                          : 'bg-slate-100 group-hover:bg-blue-600'
                      )}>
                        {(ch.free || isPro)
                          ? <BookOpen size={15} className={cn('transition-colors', selected?.name === ch.name ? 'text-white' : 'text-slate-500 group-hover:text-white')} />
                          : <Lock size={15} className="text-slate-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{ch.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className={cn('text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border', typeColor[ch.type])}>
                            {ch.type}
                          </span>
                          {ch.status === 'Generating' && (
                            <span className="text-[9px] text-slate-400 flex items-center gap-0.5"><Clock size={9} /> Generating…</span>
                          )}
                        </div>
                      </div>
                      {!(ch.free || isPro) && <Lock size={13} className="text-slate-300 shrink-0" />}
                      {(ch.free || isPro) && <ChevronRight size={15} className="text-slate-300 group-hover:text-blue-500 shrink-0 transition-colors" />}
                    </button>
                  ))}

                  {visibleChapters.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                      <Search size={24} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm font-medium">No chapters found</p>
                    </div>
                  )}
                  </>
                  )}
                </div>

                {/* Usage notice */}
                {!isPro && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                {/* Usage notice */}
                  <div className="flex items-start gap-2.5">
                    <AlertCircle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-amber-800 mb-1">Free Plan: 2 chapters visible</p>
                      <p className="text-[11px] text-amber-700">
                        Upgrade to access all {currentSubject?.chapters ?? chapters.length} chapters, PDF export, and offline mode.
                      </p>
                      <Link
                        to="/pricing"
                        className="mt-2 text-[11px] font-black text-amber-700 hover:text-amber-900 underline underline-offset-2 flex items-center gap-1"
                      >
                        Upgrade — ₹99/mo <ChevronRight size={10} />
                      </Link>
                    </div>
                  </div>
                </div>
                )}
              </div>

              {/* Note Viewer */}
              <div className="lg:col-span-3">
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col overflow-hidden min-h-[500px] lg:min-h-[600px]">

                  {selected ? (
                    <>
                      {/* Note header — chapter selected */}
                      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 bg-blue-100 rounded-lg">
                            <FileText size={15} className="text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-extrabold text-slate-900">{selected.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {chapterContent
                                ? 'Maharashtra SSC board content · Loaded'
                                : contentLoading
                                ? 'Loading content…'
                                : 'AI-generated · Board-aligned'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-all" title="Print">
                            <Printer size={14} />
                          </button>
                          <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-all" title="Download PDF">
                            <Download size={14} />
                          </button>

                          {/* Save to My Notes — only show when board content is loaded */}
                          {chapterContent && (
                            <button
                              onClick={handleSaveToMyNotes}
                              disabled={saveLoading || saveDone}
                              title={saveDone ? 'Saved to My Notes!' : 'Save to My Notes'}
                              className={cn(
                                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black',
                                'border transition-all',
                                saveDone
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                  : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-700'
                              )}
                            >
                              {saveLoading ? (
                                <>
                                  <div className="w-3 h-3 border border-slate-400 border-t-transparent
                                                  rounded-full animate-spin" />
                                  Saving…
                                </>
                              ) : saveDone ? (
                                <>
                                  <CheckCircle2 size={11} className="text-emerald-600" />
                                  Saved!
                                </>
                              ) : (
                                <>
                                  <BookMarked size={11} />
                                  Save
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Tab switcher: Notes Content vs AI Notes vs PYQs */}
                      <div className="flex border-b border-slate-100 bg-white">
                        <button
                          onClick={() => setActiveTab('content')}
                          className={cn(
                            'flex-1 py-2.5 text-xs font-black tracking-wide transition-all',
                            activeTab === 'content'
                              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/40'
                              : 'text-slate-400 hover:text-slate-600'
                          )}
                        >
                          📚 Board Notes
                        </button>
                        <button
                          onClick={() => setActiveTab('ai')}
                          className={cn(
                            'flex-1 py-2.5 text-xs font-black tracking-wide transition-all flex items-center justify-center gap-1',
                            activeTab === 'ai'
                              ? 'text-violet-600 border-b-2 border-violet-600 bg-violet-50/40'
                              : 'text-slate-400 hover:text-slate-600'
                          )}
                        >
                          🤖 AI Notes
                          {aiNoteLoading && (
                            <div className="w-2.5 h-2.5 border border-violet-400 border-t-transparent rounded-full animate-spin" />
                          )}
                        </button>
                        <button
                          onClick={() => setActiveTab('pyqs')}
                          className={cn(
                            'flex-1 py-2.5 text-xs font-black tracking-wide transition-all flex items-center justify-center gap-1.5',
                            activeTab === 'pyqs'
                              ? 'text-rose-600 border-b-2 border-rose-600 bg-rose-50/40'
                              : 'text-slate-400 hover:text-slate-600'
                          )}
                        >
                          📝 Past Year Questions
                          {pyqs.length > 0 && (
                            <span className={cn(
                              'text-[9px] font-black px-1.5 py-0.5 rounded-full',
                              activeTab === 'pyqs'
                                ? 'bg-rose-600 text-white'
                                : 'bg-slate-200 text-slate-500'
                            )}>
                              {pyqs.length}
                            </span>
                          )}
                        </button>
                      </div>

                      {activeTab === 'content' ? (
                        <>
                          {contentLoading ? (
                            <div className="flex items-center justify-center py-16">
                              <div className="text-center space-y-3">
                                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent
                                                rounded-full animate-spin mx-auto" />
                                <p className="text-xs text-slate-400 font-medium">
                                  Loading board content…
                                </p>
                              </div>
                            </div>

                          ) : contentError || !chapterContent ? (
                            <div className="p-6 text-center space-y-3">
                              <div className="inline-flex p-3 bg-amber-50 rounded-2xl">
                                <Clock size={20} className="text-amber-500" />
                              </div>
                              <p className="text-sm font-bold text-slate-800">
                                Content coming soon
                              </p>
                              <p className="text-xs text-slate-500 leading-relaxed">
                                Board-specific notes for {selected?.name} are being prepared.
                                Meanwhile, use the AI Doubt Solver to ask questions about this chapter.
                              </p>
                            </div>

                          ) : (
                            <div className="divide-y divide-slate-100 overflow-y-auto">

                              {chapterContent.keyConcepts.length > 0 && (
                                <div className="p-5 space-y-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Key Concepts</h4>
                                  </div>
                                  <div className="space-y-3">
                                    {chapterContent.keyConcepts.map((kc, i) => (
                                      <div key={i} className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                                        <p className="text-xs font-black text-blue-800 mb-1">{kc.term}</p>
                                        <p className="text-xs text-blue-700 leading-relaxed">{kc.definition}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {chapterContent.formulas.length > 0 && (
                                <div className="p-5 space-y-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-violet-500" />
                                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Formulas</h4>
                                  </div>
                                  <div className="space-y-3">
                                    {chapterContent.formulas.map((f, i) => (
                                      <div key={i} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                                        <p className="text-xs font-black text-slate-800 mb-1">{f.name}</p>
                                        <p className="text-xs font-mono text-violet-700 bg-violet-50
                                                      px-2 py-1 rounded-lg mb-2 break-all">{f.formula}</p>
                                        <p className="text-[10px] text-slate-500 leading-relaxed">
                                          <span className="font-bold">When to use: </span>{f.when_to_use}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {chapterContent.importantPoints.length > 0 && (
                                <div className="p-5 space-y-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Must-Know Points</h4>
                                  </div>
                                  <ul className="space-y-2">
                                    {chapterContent.importantPoints.map((pt, i) => (
                                      <li key={i} className="flex items-start gap-2">
                                        <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                                        <p className="text-xs text-slate-700 leading-relaxed">{pt}</p>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {chapterContent.boardTips && (
                                <div className="p-5 space-y-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Examiner Tips</h4>
                                  </div>
                                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                                    <p className="text-xs text-amber-900 leading-relaxed">{chapterContent.boardTips}</p>
                                  </div>
                                </div>
                              )}

                              {chapterContent.pyqPatterns && (
                                <div className="p-5 space-y-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-rose-500" />
                                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Past Year Pattern</h4>
                                  </div>
                                  <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
                                    <p className="text-xs text-rose-900 leading-relaxed">{chapterContent.pyqPatterns}</p>
                                  </div>
                                </div>
                              )}

                              {chapterContent.marksBreakdown && (
                                <div className="p-5">
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="w-2 h-2 rounded-full bg-slate-500" />
                                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Marks Breakdown</h4>
                                  </div>
                                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                                    <p className="text-xs text-slate-700 leading-relaxed">{chapterContent.marksBreakdown}</p>
                                  </div>
                                </div>
                              )}

                            </div>
                          )}
                        </>

                      ) : activeTab === 'ai' ? (
                        /* ── AI NOTES TAB (DAY 37) ──────────────────────────────────── */
                        <div className="flex-1 overflow-y-auto">
                          {aiNoteLoading ? (
                            <div className="flex items-center justify-center py-16">
                              <div className="text-center space-y-3">
                                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent
                                                rounded-full animate-spin mx-auto" />
                                <p className="text-xs font-bold text-violet-600">Generating AI Notes…</p>
                                <p className="text-[10px] text-slate-400 max-w-[200px] leading-relaxed">
                                  This may take up to 15 seconds for new chapters
                                </p>
                              </div>
                            </div>
                          ) : aiNoteError ? (
                            <div className="p-6 text-center space-y-3">
                              <div className="inline-flex p-3 bg-violet-50 rounded-2xl">
                                <Sparkles size={20} className="text-violet-400" />
                              </div>
                              <p className="text-sm font-bold text-slate-800">AI Notes unavailable</p>
                              <p className="text-xs text-slate-500 leading-relaxed">
                                Could not generate notes right now. Please try again.
                              </p>
                              <button
                                onClick={() => {
                                  setAiNoteError(false);
                                  setAiNoteLoading(true);
                                  const token    = localStorage.getItem('bt_token');
                                  const BASE_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:5000';
                                  fetch(`${BASE_URL}/api/notes/chapter/${selected!.id}`, {
                                    headers: { Authorization: `Bearer ${token ?? ''}` },
                                  })
                                    .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
                                    .then((d: { data: typeof aiNote }) => setAiNote(d.data ?? null))
                                    .catch(() => setAiNoteError(true))
                                    .finally(() => setAiNoteLoading(false));
                                }}
                                className="inline-flex items-center gap-1.5 text-xs font-black text-violet-600 hover:text-violet-800 bg-violet-50 border border-violet-200 px-3 py-2 rounded-lg transition-colors"
                              >
                                <Zap size={11} /> Retry
                              </button>
                            </div>
                          ) : !aiNote ? (
                            <div className="p-6 text-center space-y-3">
                              <div className="inline-flex p-3 bg-violet-50 rounded-2xl">
                                <Sparkles size={20} className="text-violet-400" />
                              </div>
                              <p className="text-sm font-bold text-slate-800">No AI notes yet</p>
                              <p className="text-xs text-slate-500">Select a chapter to generate AI notes.</p>
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-100">
                              {/* AI Note title */}
                              <div className="p-5">
                                <h3 className="text-sm font-extrabold text-violet-900">{aiNote.title}</h3>
                              </div>
                              {/* Sections */}
                              {aiNote.sections.map((section, i) => (
                                <div key={i} className="p-5 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
                                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">
                                      {section.heading}
                                    </h4>
                                  </div>
                                  <div className="bg-violet-50 rounded-xl p-3 border border-violet-100">
                                    <p className="text-xs text-violet-900 leading-relaxed whitespace-pre-wrap">
                                      {section.content}
                                    </p>
                                  </div>
                                </div>
                              ))}
                              {/* Board tip */}
                              {aiNote.boardTip && (
                                <div className="p-5 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Examiner Tip</h4>
                                  </div>
                                  <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                                    <p className="text-xs text-amber-900 leading-relaxed">{aiNote.boardTip}</p>
                                  </div>
                                </div>
                              )}
                              {/* AI PYQs */}
                              {aiNote.pyqs.length > 0 && (
                                <div className="p-5 space-y-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Likely Exam Questions</h4>
                                  </div>
                                  <div className="space-y-2">
                                    {aiNote.pyqs.map((pyq, i) => (
                                      <div key={i} className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                          <span className="text-[9px] font-black text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full shrink-0">
                                            {pyq.marks} mark{pyq.marks > 1 ? 's' : ''}
                                          </span>
                                        </div>
                                        <p className="text-xs text-slate-800 font-medium leading-relaxed">{pyq.q}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                      ) : (
                        /* ── PYQ TAB ─────────────────────────────────────────────────── */
                        <div className="flex-1 overflow-y-auto">
                          {pyqsLoading ? (
                            <div className="flex items-center justify-center py-16">
                              <div className="text-center space-y-3">
                                <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent
                                                rounded-full animate-spin mx-auto" />
                                <p className="text-xs text-slate-400 font-medium">Loading past year questions…</p>
                              </div>
                            </div>

                          ) : pyqs.length === 0 ? (
                            <div className="p-6 text-center space-y-3">
                              <div className="inline-flex p-3 bg-rose-50 rounded-2xl text-2xl">📝</div>
                              <p className="text-sm font-bold text-slate-800">PYQs coming soon</p>
                              <p className="text-xs text-slate-500 leading-relaxed">
                                Past year questions for {selected?.name} are being added.
                              </p>
                            </div>

                          ) : (
                            <div className="divide-y divide-slate-100">

                              {/* Group PYQs by year */}
                              {Array.from(new Set(pyqs.map(p => p.year))).sort((a, b) => b - a).map(year => (
                                <div key={year} className="p-4 space-y-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-white bg-rose-500
                                                     px-2 py-0.5 rounded-full">{year}</span>
                                    <span className="text-[10px] text-slate-400">
                                      {pyqs.filter(p => p.year === year).length} question{pyqs.filter(p => p.year === year).length > 1 ? 's' : ''}
                                    </span>
                                  </div>

                                  <div className="space-y-3">
                                    {pyqs.filter(p => p.year === year).map((pyq) => (
                                      <div
                                        key={pyq.id}
                                        className="bg-white border border-slate-100 rounded-xl p-4
                                                   shadow-sm hover:border-rose-200 transition-all"
                                      >
                                        {/* Marks badge */}
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                          <span className="text-[9px] font-black text-rose-700
                                                           bg-rose-50 border border-rose-100
                                                           px-2 py-0.5 rounded-full shrink-0">
                                            {pyq.marks} mark{pyq.marks > 1 ? 's' : ''}
                                          </span>
                                          {pyq.appearedCount > 1 && (
                                            <span className="text-[9px] text-amber-600 font-bold
                                                             bg-amber-50 border border-amber-100
                                                             px-2 py-0.5 rounded-full shrink-0">
                                              ⭐ Appeared {pyq.appearedCount}×
                                            </span>
                                          )}
                                        </div>

                                        {/* Question text */}
                                        <p className="text-xs text-slate-800 font-medium leading-relaxed mb-3">
                                          {pyq.question}
                                        </p>

                                        {/* Answer hint */}
                                        {pyq.answerHint && (
                                          <details className="group">
                                            <summary className="text-[10px] font-black text-emerald-600
                                                                cursor-pointer select-none
                                                                hover:text-emerald-700 list-none
                                                                flex items-center gap-1">
                                              <span className="group-open:hidden">▶ Show answer hint</span>
                                              <span className="hidden group-open:inline">▼ Hide hint</span>
                                            </summary>
                                            <div className="mt-2 bg-emerald-50 border border-emerald-100
                                                            rounded-lg p-3">
                                              <p className="text-[10px] text-emerald-800 leading-relaxed">
                                                {pyq.answerHint}
                                              </p>
                                            </div>
                                          </details>
                                        )}

                                        {/* Solve with AI button */}
                                        <button
                                          onClick={() => {
                                            const q = encodeURIComponent(
                                              `${selected?.name ?? ''}: ${pyq.question} (${pyq.marks} marks, ${pyq.year} board exam)`
                                            );
                                            window.location.href = `/doubt-solver?q=${q}`;
                                          }}
                                          className="mt-3 w-full flex items-center justify-center gap-1.5
                                                     py-2 rounded-lg text-[10px] font-black
                                                     bg-slate-900 hover:bg-blue-700
                                                     text-white transition-colors"
                                        >
                                          <Sparkles size={10} className="text-amber-300" />
                                          Solve with AI
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* PDF Export footer */}
                      <div className="border-t border-slate-100 bg-gradient-to-r from-slate-900 to-blue-950 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
                        <div className="flex items-start gap-3">
                          <Crown size={16} className="text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-extrabold text-white">
                              {isPro ? 'Export as PDF' : 'Unlock HQ PDF Export'}
                            </p>
                            <p className="text-xs text-slate-400">
                              {isPro
                                ? 'Download print-ready notes for offline study.'
                                : 'Print-ready notes with diagrams, formulas & all chapters.'}
                            </p>
                          </div>
                        </div>
                        {isPro ? (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="gap-1.5 justify-center whitespace-nowrap bg-blue-600 hover:bg-blue-500"
                              onClick={() => selected && exportPdf(selected.id)}
                              disabled={pdfLoading}
                            >
                              <Download size={13} />
                              {pdfLoading ? 'Exporting…' : 'Export PDF'}
                            </Button>
                            {pdfError && (
                              <p className="text-xs text-red-500 mt-1">{pdfError}</p>
                            )}
                          </>
                        ) : (
                          <Link to="/pricing" className="shrink-0 w-full sm:w-auto">
                            <Button variant="gold" size="sm" fullWidth className="gap-1.5 justify-center whitespace-nowrap">
                              <Sparkles size={13} className="fill-amber-200 text-amber-200" />
                              Upgrade — ₹99/mo
                            </Button>
                          </Link>
                        )}
                      </div>
                    </>
                  ) : (
                    /* Empty state — no chapter selected */
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
                      <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
                        <BookOpen size={24} className="text-slate-400" />
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-700 mb-1">Select a chapter</p>
                        <p className="text-sm text-slate-400 max-w-xs">
                          Choose any chapter from the list on the left to view its AI-generated smart notes.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </AppLayout>
  );
};

export default NotesGenerator;

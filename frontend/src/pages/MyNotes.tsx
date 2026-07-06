import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { cn } from '../utils/cn';
import {
  Plus, FileText, Pencil, Trash2, X, Check, AlertCircle, Loader2,
  ChevronRight,
} from 'lucide-react';
import {
  UserNote,
  fetchUserNotes,
  createUserNote,
  updateUserNote,
  deleteUserNote,
} from '../services/userNotesService';

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastState { message: string; type: 'success' | 'error' }

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all',
        toast.type === 'success'
          ? 'bg-slate-900 text-white'
          : 'bg-red-600 text-white'
      )}
    >
      {toast.type === 'error' && <AlertCircle size={15} />}
      {toast.message}
    </div>
  );
}

// ─── Note Form Modal ──────────────────────────────────────────────────────────

interface NoteFormProps {
  initial?: UserNote | null;
  isSaving: boolean;
  onSave: (title: string, content: string) => void;
  onClose: () => void;
}

function NoteForm({ initial, isSaving, onSave, onClose }: NoteFormProps) {
  const [title,   setTitle]   = useState(initial?.title   ?? '');
  const [content, setContent] = useState(initial?.content ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave(title.trim(), content.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">
            {initial ? 'Edit Note' : 'New Note'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pt-4 pb-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Note title…"
              maxLength={200}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Content</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Write your note here…"
              rows={6}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              disabled={!title.trim() || isSaving}
              isLoading={isSaving}
            >
              <Check size={14} />
              {initial ? 'Save Changes' : 'Create Note'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Note Card ────────────────────────────────────────────────────────────────

function NoteCard({
  note,
  onEdit,
  onDelete,
  isDeleting,
}: {
  note: UserNote;
  onEdit: (note: UserNote) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const date = new Date(note.updatedAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 bg-blue-50 rounded-xl shrink-0 mt-0.5">
            <FileText size={15} className="text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{note.title}</p>
            {note.content ? (
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{note.content}</p>
            ) : (
              <p className="text-xs text-slate-400 mt-0.5 italic">No content</p>
            )}
            <p className="text-xs text-slate-400 mt-2">{date}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(note)}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            title="Edit note"
          >
            <Pencil size={14} className="text-slate-500" />
          </button>
          <button
            onClick={() => onDelete(note.id)}
            disabled={isDeleting}
            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
            title="Delete note"
          >
            {isDeleting
              ? <Loader2 size={14} className="text-red-400 animate-spin" />
              : <Trash2 size={14} className="text-red-400" />
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MyNotes() {
  const [notes,       setNotes]       = useState<UserNote[]>([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [loadError,   setLoadError]   = useState<string | null>(null);
  const [toast,       setToast]       = useState<ToastState | null>(null);
  const [showForm,    setShowForm]    = useState(false);
  const [editNote,    setEditNote]    = useState<UserNote | null>(null);
  const [isSaving,    setIsSaving]    = useState(false);
  const [deletingId,  setDeletingId]  = useState<string | null>(null);

  const showToast = useCallback((message: string, type: ToastState['type'] = 'success') => {
    setToast({ message, type });
  }, []);

  // Load notes on mount
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    fetchUserNotes().then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        setLoadError(error);
      } else {
        setNotes(data);
      }
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  // Create or update
  const handleSave = async (title: string, content: string) => {
    setIsSaving(true);
    if (editNote) {
      const { data, error } = await updateUserNote(editNote.id, title, content);
      setIsSaving(false);
      if (error) { showToast(error, 'error'); return; }
      setNotes(prev => prev.map(n => n.id === editNote.id ? data : n));
      showToast('Note updated');
    } else {
      const { data, error } = await createUserNote(title, content);
      setIsSaving(false);
      if (error) { showToast(error, 'error'); return; }
      setNotes(prev => [data, ...prev]);
      showToast('Note created');
    }
    setShowForm(false);
    setEditNote(null);
  };

  // Delete
  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this note? This cannot be undone.')) return;
    setDeletingId(id);
    const { error } = await deleteUserNote(id);
    setDeletingId(null);
    if (error) { showToast(error, 'error'); return; }
    setNotes(prev => prev.filter(n => n.id !== id));
    showToast('Note deleted');
  };

  const openCreate = () => { setEditNote(null); setShowForm(true); };
  const openEdit   = (note: UserNote) => { setEditNote(note); setShowForm(true); };
  const closeForm  = () => { setShowForm(false); setEditNote(null); };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Notes</h1>
            <p className="text-sm text-slate-500 mt-0.5">Your personal study notes</p>
          </div>
          <Button variant="secondary" size="sm" onClick={openCreate}>
            <Plus size={15} />
            New Note
          </Button>
        </div>

        {/* Cross-navigation: link to Smart Notes */}
        <div className="flex items-center justify-between bg-blue-50 border border-blue-100
                        rounded-2xl px-4 py-3 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-100 rounded-lg shrink-0">
              <FileText size={14} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-black text-blue-900">
                See board notes, formulas &amp; PYQs
              </p>
              <p className="text-[10px] text-blue-600 mt-0.5">
                Subject-wise board content in Smart Notes
              </p>
            </div>
          </div>
          <Link
            to="/notes"
            className="shrink-0 flex items-center gap-1 text-[10px] font-black
                       text-blue-600 hover:text-blue-800 transition-colors"
          >
            Smart Notes <ChevronRight size={11} />
          </Link>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={28} className="text-blue-500 animate-spin" />
            <p className="text-sm text-slate-500">Loading notes…</p>
          </div>
        )}

        {/* Load error */}
        {!isLoading && loadError && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <AlertCircle size={16} />
            {loadError}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !loadError && notes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-4 bg-blue-50 rounded-2xl mb-4">
              <FileText size={28} className="text-blue-400" />
            </div>
            <p className="text-base font-semibold text-slate-700">No notes yet</p>
            <p className="text-sm text-slate-400 mt-1 mb-5">Create your first note to get started</p>
            <Button variant="secondary" size="sm" onClick={openCreate}>
              <Plus size={14} />
              Create Note
            </Button>
          </div>
        )}

        {/* Notes list */}
        {!isLoading && !loadError && notes.length > 0 && (
          <div className="grid gap-3">
            {notes.map(note => (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={openEdit}
                onDelete={handleDelete}
                isDeleting={deletingId === note.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <NoteForm
          initial={editNote}
          isSaving={isSaving}
          onSave={handleSave}
          onClose={closeForm}
        />
      )}

      {/* Toast */}
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </AppLayout>
  );
}

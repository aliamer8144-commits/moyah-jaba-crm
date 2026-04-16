'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  MessageSquare,
  Send,
  Trash2,
  Loader2,
  User,
} from 'lucide-react';

interface Note {
  id: string;
  invoiceId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffSec < 60) return 'الآن';
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  if (diffHour < 24) return `منذ ${diffHour} ساعة`;
  if (diffDay < 7) return `منذ ${diffDay} يوم`;
  if (diffWeek < 4) return `منذ ${diffWeek} أسبوع`;
  if (diffMonth < 12) return `منذ ${diffMonth} شهر`;
  return `منذ ${Math.floor(diffDay / 365)} سنة`;
}

function formatArabicDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SkeletonNotes() {
  return (
    <div className="space-y-3 p-4">
      {[1, 2].map((i) => (
        <div key={i} className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse w-1/3" />
            <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function InvoiceNotes({ invoiceId, clientName }: { invoiceId: string; clientName: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

  const fetchNotes = async () => {
    try {
      const res = await fetch(`/api/invoice-notes?invoiceId=${invoiceId}`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [invoiceId]);

  useEffect(() => {
    if (listEndRef.current) {
      listEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [notes]);

  const handleSend = async () => {
    if (!content.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/invoice-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId,
          content: content.trim(),
        }),
      });

      if (res.ok) {
        const newNote = await res.json();
        setNotes((prev) => [newNote, ...prev]);
        setContent('');
        toast.success('تم إضافة الملاحظة');
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      } else {
        const err = await res.json();
        toast.error(err.error || 'حدث خطأ');
      }
    } catch {
      toast.error('حدث خطأ أثناء إضافة الملاحظة');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (deletingId) return;

    setDeletingId(noteId);
    try {
      const res = await fetch(`/api/invoice-notes?noteId=${noteId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        setConfirmDeleteId(null);
        toast.success('تم حذف الملاحظة');
      } else {
        const err = await res.json();
        toast.error(err.error || 'حدث خطأ');
      }
    } catch {
      toast.error('حدث خطأ أثناء حذف الملاحظة');
    } finally {
      setDeletingId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="mx-4 bg-white/80 dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700/50">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-[#007AFF]/10 flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-[#007AFF]" />
        </div>
        <h3 className="text-base font-bold">ملاحظات الفاتورة</h3>
        {notes.length > 0 && (
          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full mr-auto">
            {notes.length} ملاحظة
          </span>
        )}
      </div>

      {/* Notes list */}
      {loading ? (
        <SkeletonNotes />
      ) : notes.length === 0 && !content ? (
        <div className="py-8 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-gray-300 dark:text-gray-500" />
          </div>
          <p className="text-sm text-gray-400">لا توجد ملاحظات على هذه الفاتورة</p>
          <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">أضف ملاحظة لتسجيل أي تفاصيل</p>
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto px-4 py-2 space-y-3">
          <AnimatePresence mode="popLayout">
            {notes.map((note, index) => (
              <motion.div
                key={note.id}
                layout
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: -50, scale: 0.95 }}
                transition={{ delay: index * 0.03, duration: 0.25, ease: 'easeOut' }}
                className="group relative flex gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/40 hover:bg-gray-100 dark:hover:bg-gray-900/60 transition-colors"
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-white" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {clientName.charAt(0) === clientName.charAt(0) ? clientName : 'مستخدم'}
                    </span>
                    <span className="text-[10px] text-gray-400" title={formatArabicDate(note.createdAt)}>
                      {formatRelativeTime(note.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                    {note.content}
                  </p>
                </div>

                {/* Delete button */}
                <div className="flex-shrink-0 self-start opacity-0 group-hover:opacity-100 transition-opacity">
                  {confirmDeleteId === note.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(note.id)}
                        disabled={deletingId === note.id}
                        className="w-7 h-7 rounded-lg bg-[#FF3B30]/10 flex items-center justify-center hover:bg-[#FF3B30]/20 transition-colors"
                      >
                        {deletingId === note.id ? (
                          <Loader2 className="w-3 h-3 text-[#FF3B30] animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3 text-[#FF3B30]" />
                        )}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-[10px] text-gray-400 hover:text-gray-600 font-medium"
                      >
                        إلغاء
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(note.id)}
                      className="w-7 h-7 rounded-lg bg-transparent hover:bg-[#FF3B30]/10 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 hover:text-[#FF3B30]" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={listEndRef} />
        </div>
      )}

      {/* Input area */}
      <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700/50">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                if (e.target.value.length <= 500) {
                  setContent(e.target.value);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="أضف ملاحظة..."
              className="w-full bg-gray-50 dark:bg-gray-900/40 rounded-xl px-3 py-2.5 text-sm resize-none border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]/30 transition-all min-h-[40px] max-h-[120px]"
              rows={1}
              dir="rtl"
            />
            <div className="flex items-center justify-between mt-1 px-1">
              <span className="text-[10px] text-gray-300 dark:text-gray-600">
                Enter للإرسال
              </span>
              <span className={`text-[10px] ${content.length >= 450 ? 'text-[#FF9500]' : content.length >= 500 ? 'text-[#FF3B30]' : 'text-gray-300 dark:text-gray-600'}`}>
                {content.length}/500
              </span>
            </div>
          </div>
          <Button
            onClick={handleSend}
            disabled={!content.trim() || submitting}
            size="sm"
            className="h-10 w-10 rounded-xl p-0 bg-[#007AFF] hover:bg-[#0055D4] text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, AlertTriangle, MessageSquare } from 'lucide-react';

export function RequestForm() {
  const {
    requestDialogOpen,
    setRequestDialogOpen,
    requestEntityType,
    requestActionType,
    requestEntityId,
    user,
  } = useAppStore();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const entityLabel =
    requestEntityType === 'client' ? 'عميل' : requestEntityType === 'invoice' ? 'فاتورة' : '';
  const actionLabel = requestActionType === 'edit' ? 'تعديل' : requestActionType === 'delete' ? 'حذف' : '';
  const isDelete = requestActionType === 'delete';

  const MIN_REASON_LENGTH = 10;
  const reasonLength = reason.trim().length;
  const isReasonValid = reasonLength >= MIN_REASON_LENGTH;
  const reasonError = reasonLength > 0 && !isReasonValid;

  const handleClose = () => {
    setReason('');
    setConfirmOpen(false);
    setRequestDialogOpen(false);
  };

  const handleOpenConfirm = () => {
    if (!isReasonValid) {
      toast.error({ description: `يجب أن يكون السبب ${MIN_REASON_LENGTH} أحرف على الأقل` });
      return;
    }
    setConfirmOpen(true);
  };

  const handleSubmit = async () => {
    if (!user || !requestEntityType || !requestActionType || !requestEntityId) return;

    setLoading(true);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repId: user.id,
          type: requestActionType,
          entityType: requestEntityType,
          entityId: requestEntityId,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'حدث خطأ');

      const actionEmoji = isDelete ? '🗑️' : '✏️';
      toast.success({
        description: `تم إرسال طلب ${actionLabel} ${entityLabel} بنجاح ${actionEmoji}`,
      });
      setConfirmOpen(false);
      handleClose();
    } catch (err) {
      toast.error({
        description: err instanceof Error ? err.message : 'حدث خطأ أثناء إرسال الطلب',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Main Request Dialog */}
      <AlertDialog open={requestDialogOpen && !confirmOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <AlertDialogContent className="sm:max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold flex items-center gap-2">
              {isDelete ? (
                <div className="w-9 h-9 rounded-xl bg-[#FF3B30]/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-[#FF3B30]" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-xl bg-[#FF9500]/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-[#FF9500]" />
                </div>
              )}
              <span>
                طلب {actionLabel} {entityLabel}
              </span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 leading-relaxed mt-2">
              {isDelete
                ? `سيتم إرسال طلب حذف هذا ${entityLabel} إلى الإدارة للمراجعة والموافقة. يرجى توضيح سبب الحذف.`
                : `سيتم إرسال طلب تعديل بيانات هذا ${entityLabel} إلى الإدارة للمراجعة والموافقة. يرجى توضيح التعديلات المطلوبة.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                السبب <span className="text-[#FF3B30]">*</span>
              </label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="اكتب سبب الطلب هنا..."
                className={`bg-[#f2f2f7] rounded-xl border-0 focus:ring-2 min-h-[100px] resize-none text-sm ${
                  reasonError
                    ? 'ring-[#FF3B30]/30'
                    : 'ring-[#007AFF]/20'
                }`}
              />
              <div className="flex items-center justify-between mt-1.5">
                <p className={`text-xs transition-colors ${reasonError ? 'text-[#FF3B30]' : 'text-gray-400'}`}>
                  {reasonLength > 0 && !isReasonValid
                    ? `يجب ${MIN_REASON_LENGTH} أحرف على الأقل (${MIN_REASON_LENGTH - reasonLength} متبقي)`
                    : isReasonValid
                      ? 'السبب مناسب ✓'
                      : ''
                  }
                </p>
                <p className={`text-xs ${isReasonValid ? 'text-[#34C759]' : 'text-gray-400'}`}>
                  {reasonLength}/{MIN_REASON_LENGTH}
                </p>
              </div>
            </div>
          </div>

          <AlertDialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="rounded-2xl flex-1"
              disabled={loading}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleOpenConfirm}
              disabled={loading || !isReasonValid}
              className={`rounded-2xl flex-1 font-semibold ${
                isDelete
                  ? 'bg-[#FF3B30] text-white hover:bg-[#FF3B30]/90'
                  : 'bg-[#007AFF] text-white hover:bg-[#007AFF]/90'
              }`}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 ml-2" />
                  إرسال الطلب
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="sm:max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-lg">
              {isDelete ? (
                <AlertTriangle className="w-5 h-5 text-[#FF3B30]" />
              ) : (
                <Send className="w-5 h-5 text-[#007AFF]" />
              )}
              تأكيد إرسال الطلب
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 leading-relaxed">
              {isDelete
                ? `هل أنت متأكد من إرسال طلب حذف ${entityLabel}؟ سيتم مراجعة الطلب من قبل الإدارة.`
                : `سيتم إرسال طلب {actionLabel} {entityLabel} إلى الإدارة للمراجعة.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl" disabled={loading}>
              تراجع
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmit}
              disabled={loading}
              className={`rounded-xl font-semibold ${
                isDelete
                  ? 'bg-[#FF3B30] text-white hover:bg-[#FF3B30]/90'
                  : 'bg-[#007AFF] text-white hover:bg-[#007AFF]/90'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ml-1" />
                  جارٍ الإرسال...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 ml-1" />
                  تأكيد الإرسال
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

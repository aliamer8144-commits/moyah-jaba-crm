'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, User } from '@/lib/store';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Search,
  Plus,
  Loader2,
  UserPlus,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Phone,
  Building2,
  Tag,
  FileText,
} from 'lucide-react';

interface AdminClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminClientFormDialog({ open, onOpenChange }: AdminClientFormDialogProps) {
  const { user } = useAppStore();

  // Step 1: Select Rep
  const [reps, setReps] = useState<User[]>([]);
  const [repSearch, setRepSearch] = useState('');
  const [selectedRepId, setSelectedRepId] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);

  // Step 2: Client Form
  const [form, setForm] = useState({ name: '', phone: '', businessName: '', address: '', category: '', customCategory: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const categories = ['مطعم', 'مقهى', 'سوبرماركت', 'مكتب', 'منزل', 'مصنع', 'أخرى'];

  const selectedRep = reps.find((r) => r.id === selectedRepId);

  const filteredReps = useMemo(() => {
    if (!repSearch) return reps;
    return reps.filter((r) => r.name.includes(repSearch));
  }, [reps, repSearch]);

  const resetForm = () => {
    setSelectedRepId(null);
    setRepSearch('');
    setForm({ name: '', phone: '', businessName: '', address: '', category: '', customCategory: '', notes: '' });
    setErrors({});
    setStep(1);
  };

  useEffect(() => {
    if (open && user) {
      fetch(`/api/auth?adminId=${user.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setReps(data.filter((r: User) => r.isActive));
          }
        })
        .catch(() => {});
      resetForm();
    }
  }, [open, user]);

  const handleRepSelect = (rep: User) => {
    setSelectedRepId(rep.id);
    setRepSearch('');
    setTimeout(() => setStep(2), 200);
  };

  const handleBack = () => {
    setStep(1);
    setForm({ name: '', phone: '', businessName: '', address: '', category: '', customCategory: '', notes: '' });
    setErrors({});
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = 'اسم العميل مطلوب';
    if (form.phone && !/^[\d+\-() ]{7,15}$/.test(form.phone)) newErrors.phone = 'رقم الهاتف غير صالح';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!selectedRepId || !validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repId: selectedRepId,
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          businessName: form.businessName.trim() || null,
          address: form.address.trim() || null,
          category: form.category === 'custom' ? form.customCategory.trim() : (form.category || null),
          notes: form.notes.trim() || null,
          createdByAdmin: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'حدث خطأ');

      toast.success('تم إضافة العميل بنجاح ✅');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ في الاتصال');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent
        className="rounded-2xl max-w-sm mx-auto bg-white dark:bg-[#1c1c1e] dark:border-gray-700 flex flex-col max-h-[90vh]"
        dir="rtl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-right flex items-center gap-2 dark:text-white">
            <UserPlus className="w-5 h-5 text-[#AF52DE]" />
            {step === 1 ? 'اختر المندوب' : 'إضافة عميل جديد'}
          </DialogTitle>
          <DialogDescription className="text-right text-gray-500 dark:text-gray-400">
            {step === 1
              ? 'اختر المندوب الذي سيتبع له العميل'
              : `إضافة عميل - ${selectedRep?.name}`}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Rep Selection */}
        {step === 1 && (
          <div className="space-y-3 mt-2 flex-1 min-h-0 overflow-y-auto">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={repSearch}
                onChange={(e) => setRepSearch(e.target.value)}
                placeholder="ابحث عن مندوب..."
                className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 dark:text-white rounded-xl pr-10 h-11 text-sm"
                autoFocus
              />
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {filteredReps.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">لا يوجد مناديب نشطين</p>
              ) : (
                filteredReps.map((rep) => (
                  <motion.button
                    key={rep.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleRepSelect(rep)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-right"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#34C759] to-[#28A745] flex items-center justify-center shrink-0">
                      <UserCircle className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{rep.name}</p>
                      <p className="text-[11px] text-gray-400">مندوب</p>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-gray-300" />
                  </motion.button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Step 2: Client Form */}
        {step === 2 && (
          <div className="space-y-3 mt-2 overflow-y-auto flex-1 min-h-0">
            <button onClick={handleBack} className="flex items-center gap-1.5 text-xs text-[#007AFF] font-medium hover:underline">
              <ChevronRight className="w-3.5 h-3.5" />
              تغيير المندوب
            </button>

            {/* Name */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">اسم العميل *</label>
              <div className="relative">
                <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="اسم العميل"
                  className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 dark:text-white rounded-xl pr-10 h-10 text-sm"
                  autoFocus
                />
              </div>
              {errors.name && <p className="text-[11px] text-[#FF3B30] mt-1">{errors.name}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">رقم الهاتف</label>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="5XXXXXXXX"
                  className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 dark:text-white rounded-xl pr-10 h-10 text-sm"
                  dir="ltr"
                />
              </div>
              {errors.phone && <p className="text-[11px] text-[#FF3B30] mt-1">{errors.phone}</p>}
            </div>

            {/* Business Name */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">اسم المؤسسة / المحل</label>
              <Input
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                placeholder="اسم المؤسسة (اختياري)"
                className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 dark:text-white rounded-xl h-10 text-sm"
              />
            </div>

            {/* Address */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">العنوان</label>
              <div className="relative">
                <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="عنوان العميل"
                  className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 dark:text-white rounded-xl pr-10 h-10 text-sm"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">التصنيف</label>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setForm({ ...form, category: cat === 'custom' ? 'custom' : cat })}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                      form.category === cat
                        ? 'bg-[#AF52DE] text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              {form.category === 'custom' && (
                <Input
                  value={form.customCategory}
                  onChange={(e) => setForm({ ...form, customCategory: e.target.value })}
                  placeholder="اكتب التصنيف..."
                  className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 dark:text-white rounded-xl h-10 text-sm mt-2"
                />
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">ملاحظات</label>
              <div className="relative">
                <FileText className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="ملاحظات إضافية..."
                  className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 dark:text-white rounded-xl pr-10 h-10 text-sm"
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex-row gap-2 pt-3 mt-3 border-t border-gray-100 dark:border-gray-700 shrink-0">
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }} className="flex-1 rounded-xl">إلغاء</Button>
          {step === 2 && (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 rounded-xl bg-gradient-to-l from-[#AF52DE] to-[#9B30D9] text-white shadow-lg shadow-[#AF52DE]/25 disabled:opacity-40"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" />إضافة</>}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

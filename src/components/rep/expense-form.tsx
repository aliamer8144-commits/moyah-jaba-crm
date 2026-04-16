'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Zap,
  UtensilsCrossed,
  Wrench,
  Phone,
  MoreHorizontal,
  Loader2,
  Receipt,
  CalendarDays,
} from 'lucide-react';

const categoryOptions = [
  { id: 'fuel', label: 'وقود', icon: Zap, color: '#FF9500' },
  { id: 'food', label: 'طعام', icon: UtensilsCrossed, color: '#34C759' },
  { id: 'maintenance', label: 'صيانة', icon: Wrench, color: '#AF52DE' },
  { id: 'phone', label: 'هاتف', icon: Phone, color: '#007AFF' },
  { id: 'other', label: 'أخرى', icon: MoreHorizontal, color: '#8E8E93' },
];

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ExpenseForm({ open, onOpenChange, onSuccess }: ExpenseFormProps) {
  const { user } = useAppStore();
  const [category, setCategory] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setCategory(null);
    setAmount('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setLoading(false);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!category) {
      toast.error('يرجى اختيار فئة المصروف');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repId: user.id,
          category,
          amount: parseFloat(amount),
          description: description.trim() || null,
          date,
        }),
      });

      if (res.ok) {
        toast.success('تم تسجيل المصروف بنجاح ✅');
        handleClose(false);
        onSuccess();
      } else {
        const data = await res.json();
        toast.error(data.error || 'فشل في تسجيل المصروف');
      }
    } catch {
      toast.error('حدث خطأ في الاتصال');
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-l from-[#FF3B30] to-[#FF453A] px-5 pt-6 pb-5 text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-24 h-24 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-20 h-20 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3" />
          <DialogHeader className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
              <DialogTitle className="text-lg font-bold text-white">
                مصروف جديد
              </DialogTitle>
            </div>
            <p className="text-sm text-white/70">سجّل مصروفاتك اليومية</p>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Category Selector */}
          <div>
            <label className="text-sm font-semibold text-[#1c1c1e] mb-3 block">الفئة</label>
            <div className="grid grid-cols-5 gap-2">
              {categoryOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = category === opt.id;
                return (
                  <motion.button
                    key={opt.id}
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setCategory(opt.id)}
                    className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl transition-all duration-200 border-2 ${
                      isSelected
                        ? 'border-current shadow-sm'
                        : 'border-transparent bg-gray-50 hover:bg-gray-100'
                    }`}
                    style={isSelected ? { borderColor: opt.color, backgroundColor: `${opt.color}08` } : undefined}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200"
                      style={{
                        backgroundColor: isSelected ? `${opt.color}18` : `${opt.color}08`,
                      }}
                    >
                      <Icon className="w-5 h-5" style={{ color: opt.color }} />
                    </div>
                    <span
                      className={`text-[11px] font-medium ${
                        isSelected ? '' : 'text-gray-500'
                      }`}
                      style={isSelected ? { color: opt.color } : undefined}
                    >
                      {opt.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="text-sm font-semibold text-[#1c1c1e] mb-2 block">المبلغ (ر.س)</label>
            <div className="relative">
              <Input
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-16 text-2xl font-bold text-center rounded-2xl border-gray-200 focus:border-[#FF3B30] focus:ring-[#FF3B30]/20 text-[#1c1c1e]"
                min="0"
                step="0.01"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">
                ر.س
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-semibold text-[#1c1c1e] mb-2 block">
              الوصف <span className="text-gray-400 font-normal">(اختياري)</span>
            </label>
            <Textarea
              placeholder="أضف وصفاً للمصروف..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl border-gray-200 focus:border-[#FF3B30] focus:ring-[#FF3B30]/20 resize-none text-sm min-h-[72px]"
              rows={2}
            />
          </div>

          {/* Date Picker */}
          <div>
            <label className="text-sm font-semibold text-[#1c1c1e] mb-2 flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-gray-500" />
              التاريخ
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border-gray-200 focus:border-[#FF3B30] focus:ring-[#FF3B30]/20 text-sm"
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading || !category || !amount || parseFloat(amount) <= 0}
            className="w-full h-12 bg-gradient-to-l from-[#FF3B30] to-[#FF453A] hover:from-[#E0342B] hover:to-[#E03A30] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#FF3B30]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                جارٍ التسجيل...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                تسجيل المصروف
              </div>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

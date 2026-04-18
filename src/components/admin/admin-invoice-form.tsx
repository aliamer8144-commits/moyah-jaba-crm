'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, User } from '@/lib/store';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import {
  Search,
  Plus,
  Loader2,
  Droplets,
  FileText,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Gift,
  AlertCircle,
  CheckCircle2,
  UserCircle,
  ChevronLeft,
} from 'lucide-react';
import { SarIcon } from '@/components/shared/sar-icon';
import { Button } from '@/components/ui/button';

interface ProductItem {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
}

interface ClientItem {
  id: string;
  name: string;
  businessName: string | null;
  phone: string | null;
  repId: string;
}

interface AdminInvoiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminInvoiceFormDialog({ open, onOpenChange }: AdminInvoiceFormDialogProps) {
  const { user } = useAppStore();

  // Step 1: Select Rep
  const [reps, setReps] = useState<User[]>([]);
  const [repSearch, setRepSearch] = useState('');
  const [selectedRepId, setSelectedRepId] = useState<string | null>(null);

  // Step 2: Invoice Form
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState('');
  const [promotionQty, setPromotionQty] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<'debt' | 'credit' | null>(null);
  const [confirmData, setConfirmData] = useState({ debt: 0, credit: 0, paid: 0, finalTotal: 0 });
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [showDiscount, setShowDiscount] = useState(false);
  const [showPromotion, setShowPromotion] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const quantityRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setSelectedRepId(null);
    setRepSearch('');
    setClients([]);
    setSelectedClientId(null);
    setQuantity('');
    setPrice('');
    setDiscountType('none');
    setDiscountValue('');
    setPromotionQty('');
    setPaidAmount('');
    setClientSearch('');
    setShowClientDropdown(false);
    setConfirmDialog(null);
    setSelectedProductId(null);
    setShowDiscount(false);
    setShowPromotion(false);
    setStep(1);
  };

  // Fetch reps when dialog opens
  useEffect(() => {
    if (open && user) {
      fetch(`/api/reps?adminId=${user.id}`)
        .then((res) => res.json())
        .then((data) => {
          setReps(data.filter((r: User) => r.isActive));
        })
        .catch(() => {});
      resetForm();
    }
  }, [open, user]);

  // Fetch products
  useEffect(() => {
    if (open) {
      fetch('/api/products')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setProducts(data.filter((p: ProductItem) => p.isActive));
        })
        .catch(() => {});
    }
  }, [open]);

  // Auto-select product if only one
  useEffect(() => {
    if (products.length === 1 && !selectedProductId) {
      setSelectedProductId(products[0].id);
      setPrice(String(products[0].price));
    }
  }, [products.length, selectedProductId]);

  // Fetch clients when rep is selected
  const fetchClients = async (repId: string) => {
    try {
      const res = await fetch(`/api/clients?repId=${repId}`);
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch {
      // silent
    }
  };

  const handleRepSelect = (rep: User) => {
    setSelectedRepId(rep.id);
    setRepSearch('');
    fetchClients(rep.id);
    setTimeout(() => setStep(2), 200);
  };

  const handleBack = () => {
    setStep(1);
    setSelectedClientId(null);
    setClients([]);
  };

  const selectedRep = reps.find((r) => r.id === selectedRepId);
  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const filteredReps = useMemo(() => {
    if (!repSearch) return reps;
    return reps.filter((r) => r.name.includes(repSearch));
  }, [reps, repSearch]);

  const filteredClients = useMemo(() => {
    return clients.filter(
      (c) =>
        c.name.includes(clientSearch) ||
        (c.businessName && c.businessName.includes(clientSearch)) ||
        (c.phone && c.phone.includes(clientSearch))
    );
  }, [clients, clientSearch]);

  // Calculations
  const qty = parseFloat(quantity) || 0;
  const prc = parseFloat(price) || 0;
  const total = qty * prc;

  const discountAmount = useMemo(() => {
    if (discountType === 'percentage') return total * ((parseFloat(discountValue) || 0) / 100);
    if (discountType === 'fixed') return parseFloat(discountValue) || 0;
    return 0;
  }, [discountType, discountValue, total]);

  const finalTotal = Math.max(0, total - discountAmount);
  const paid = parseFloat(paidAmount) || 0;
  const debt = Math.max(0, finalTotal - paid);
  const credit = Math.max(0, paid - finalTotal);

  const handleProductSelect = (product: ProductItem) => {
    setSelectedProductId(product.id);
    setPrice(String(product.price));
    setTimeout(() => quantityRef.current?.focus(), 150);
  };

  const handleSubmit = async (confirmed = false) => {
    if (!selectedRepId || !selectedClientId) { toast.error('يرجى اختيار عميل'); return; }
    if (qty <= 0) { toast.error('يرجى إدخال الكمية'); return; }
    if (prc <= 0) { toast.error('يرجى إدخال السعر'); return; }
    if (paid < 0) { toast.error('المبلغ المدفوع لا يمكن أن يكون سالباً'); return; }

    if (!confirmed && debt > 0) { setConfirmData({ debt, credit: 0, paid, finalTotal }); setConfirmDialog('debt'); return; }
    if (!confirmed && credit > 0) { setConfirmData({ debt: 0, credit, paid, finalTotal }); setConfirmDialog('credit'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repId: selectedRepId,
          clientId: selectedClientId,
          createdByAdmin: true,
          productSize: 'عادي',
          quantity: qty,
          price: prc,
          total,
          discountType,
          discountValue: discountAmount,
          finalTotal,
          promotionQty: parseInt(promotionQty) || 0,
          paidAmount: paid,
          debtAmount: debt,
          creditAmount: credit,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'حدث خطأ');

      toast.success('تم إنشاء الفاتورة بنجاح ✨');
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
        <DialogContent
          className="rounded-2xl max-w-md mx-auto bg-white dark:bg-[#1c1c1e] dark:border-gray-700 flex flex-col max-h-[92vh]"
          dir="rtl"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-right flex items-center gap-2 dark:text-white">
              <Droplets className="w-5 h-5 text-[#007AFF]" />
              {step === 1 ? 'اختر المندوب' : 'فاتورة جديدة'}
            </DialogTitle>
            <DialogDescription className="text-right text-gray-500 dark:text-gray-400">
              {step === 1
                ? 'اختر المندوب الذي سيتم تسجيل الفاتورة باسمه'
                : `إنشاء فاتورة - ${selectedRep?.name}`}
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

          {/* Step 2: Invoice Form */}
          {step === 2 && (
            <div className="space-y-3 mt-2 overflow-y-auto flex-1 min-h-0">
              {/* Back button */}
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 text-xs text-[#007AFF] font-medium hover:underline"
              >
                <ChevronRight className="w-3.5 h-3.5" />
                تغيير المندوب
              </button>

              {/* Client Selection */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">العميل</p>
                {selectedClient ? (
                  <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#007AFF] to-[#0055D4] flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{selectedClient.name.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-white">{selectedClient.name}</p>
                        {selectedClient.businessName && <p className="text-[11px] text-gray-500">{selectedClient.businessName}</p>}
                      </div>
                    </div>
                    <button onClick={() => setSelectedClientId(null)} className="text-xs text-[#007AFF] font-medium hover:underline">تغيير</button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      value={clientSearch}
                      onChange={(e) => { setClientSearch(e.target.value); setShowClientDropdown(true); }}
                      onFocus={() => setShowClientDropdown(true)}
                      onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                      placeholder="ابحث عن العميل..."
                      className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 dark:text-white rounded-xl pr-10 h-11 text-sm"
                    />
                    <AnimatePresence>
                      {showClientDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="absolute top-full mt-1 right-0 left-0 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 max-h-48 overflow-y-auto z-20"
                        >
                          {filteredClients.length > 0 ? (
                            filteredClients.map((c) => (
                              <button
                                key={c.id}
                                onClick={() => { setSelectedClientId(c.id); setClientSearch(''); setShowClientDropdown(false); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors"
                              >
                                <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                                  <span className="text-[10px] font-bold text-gray-500">{c.name.charAt(0)}</span>
                                </div>
                                <p className="font-medium truncate">{c.name}</p>
                              </button>
                            ))
                          ) : (
                            <p className="text-sm text-gray-400 text-center py-4">لا يوجد عملاء</p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              <div className="border-t border-dashed border-gray-200 dark:border-gray-700" />

              {/* Product & Details */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">تفاصيل المنتج</p>
                {products.length > 1 && (
                  <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                    {products.map((product) => {
                      const isSelected = selectedProductId === product.id;
                      return (
                        <motion.button
                          key={product.id}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleProductSelect(product)}
                          className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                            isSelected
                              ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-sm shadow-[#007AFF]/20'
                              : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <Droplets className="w-3.5 h-3.5" />
                          <span>{product.name}</span>
                          <span className="opacity-70">{product.price} <SarIcon className="inline" size={10} /></span>
                        </motion.button>
                      );
                    })}
                  </div>
                )}

                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-3 bg-gray-50 dark:bg-gray-800/80">
                    <div className="px-3 py-2.5 text-[11px] font-semibold text-gray-500 text-center border-l border-gray-200 dark:border-gray-700">المنتج</div>
                    <div className="px-3 py-2.5 text-[11px] font-semibold text-gray-500 text-center border-l border-gray-200 dark:border-gray-700">الكمية</div>
                    <div className="px-3 py-2.5 text-[11px] font-semibold text-gray-500 text-center">السعر</div>
                  </div>
                  <div className="grid grid-cols-3">
                    <div className="px-3 py-2.5 flex items-center justify-center gap-1.5 border-l border-gray-100 dark:border-gray-800">
                      <Droplets className="w-3.5 h-3.5 text-[#007AFF] shrink-0" />
                      <span className="text-sm font-medium text-gray-800 dark:text-white truncate">
                        {selectedProduct?.name || 'منتج'}
                      </span>
                    </div>
                    <div className="px-2 py-2 flex items-center border-l border-gray-100 dark:border-gray-800">
                      <Input
                        ref={quantityRef}
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="0"
                        min="0"
                        className="bg-transparent border-none shadow-none focus-visible:ring-0 h-8 text-sm text-center font-semibold text-gray-800 dark:text-white p-0 placeholder:text-gray-300"
                      />
                    </div>
                    <div className="px-2 py-2 flex items-center">
                      <Input
                        type="number"
                        value={price}
                        onChange={(e) => { setPrice(e.target.value); setSelectedProductId(null); }}
                        placeholder="0"
                        min="0"
                        step="0.5"
                        className="bg-transparent border-none shadow-none focus-visible:ring-0 h-8 text-sm text-center font-semibold text-gray-800 dark:text-white p-0 placeholder:text-gray-300"
                      />
                    </div>
                  </div>
                  {total > 0 && (
                    <div className="grid grid-cols-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/30">
                      <div className="col-span-2 px-3 py-2.5 text-sm text-gray-600 dark:text-gray-400 flex items-center justify-end font-medium">المجموع</div>
                      <div className="px-3 py-2.5 text-sm font-bold text-gray-900 dark:text-white text-center">
                        {total.toLocaleString('ar-SA')} <SarIcon className="text-gray-400" size={11} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Discount */}
              <div>
                <button onClick={() => setShowDiscount(!showDiscount)} className="flex items-center justify-between w-full py-1">
                  <span className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">الخصم</span>
                  {showDiscount ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                <AnimatePresence>
                  {showDiscount && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="flex gap-1.5 mb-2">
                        {([['none', 'بدون'], ['percentage', 'نسبة %'], ['fixed', 'مبلغ']] as const).map(([type, label]) => (
                          <button
                            key={type}
                            onClick={() => { setDiscountType(type as any); if (type === 'none') setDiscountValue(''); }}
                            className={`flex-1 h-8 rounded-lg text-[11px] font-medium transition-colors ${
                              discountType === type ? 'bg-[#007AFF] text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                            }`}
                          >{label}</button>
                        ))}
                      </div>
                      {discountType !== 'none' && (
                        <Input type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder={discountType === 'percentage' ? 'نسبة الخصم %' : 'مبلغ الخصم'} min="0" className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 dark:text-white rounded-xl h-10 text-sm" />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Promotion */}
              <div>
                <button onClick={() => setShowPromotion(!showPromotion)} className="flex items-center justify-between w-full py-1">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">الدعاية</span>
                  {showPromotion ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                <AnimatePresence>
                  {showPromotion && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-[#FF9500] shrink-0" />
                        <Input type="number" value={promotionQty} onChange={(e) => setPromotionQty(e.target.value)} placeholder="عدد الكراتين المجانية" min="0" className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 dark:text-white rounded-xl h-10 text-sm" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="border-t border-dashed border-gray-200 dark:border-gray-700" />

              {/* Payment */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">الدفع</p>
                  {finalTotal > 0 && (
                    <div className="flex items-center gap-2">
                      {discountAmount > 0 && (
                        <span className="text-[11px] text-red-500 line-through">{total.toLocaleString('ar-SA')} <SarIcon className="inline" size={11} /></span>
                      )}
                      <p className="text-sm font-extrabold text-gray-900 dark:text-white">{finalTotal.toLocaleString('ar-SA')} <SarIcon className="text-gray-400" /></p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">المبلغ المدفوع (<SarIcon className="inline" size={10} />)</label>
                  <Input type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} placeholder="0" min="0" className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 dark:text-white rounded-xl h-11 text-sm font-semibold" />
                </div>
                {debt > 0 && paid > 0 && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1.5 mt-2 text-[11px] text-[#FF3B30] bg-[#FF3B30]/5 px-2.5 py-1.5 rounded-lg">
                    <AlertCircle className="w-3 h-3" />
                    سيُسجل {debt.toLocaleString('ar-SA')} <SarIcon className="inline" size={11} /> كدين
                  </motion.div>
                )}
                {credit > 0 && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1.5 mt-2 text-[11px] text-[#34C759] bg-[#34C759]/5 px-2.5 py-1.5 rounded-lg">
                    <CheckCircle2 className="w-3 h-3" />
                    سيُضاف {credit.toLocaleString('ar-SA')} <SarIcon className="inline" size={11} /> لرصيد العميل
                  </motion.div>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <DialogFooter className="flex-row gap-2 pt-3 mt-3 border-t border-gray-100 dark:border-gray-700 shrink-0">
            <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }} className="flex-1 rounded-xl">إلغاء</Button>
            {step === 2 && (
              <Button
                onClick={() => handleSubmit()}
                disabled={loading || !selectedClientId || qty <= 0 || prc <= 0}
                className="flex-1 rounded-xl bg-gradient-to-l from-[#007AFF] to-[#0055D4] text-white shadow-lg shadow-[#007AFF]/25 disabled:opacity-40"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" />إنشاء</>}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Debt Confirmation */}
      <AlertDialog open={confirmDialog === 'debt'} onOpenChange={(o) => !o && setConfirmDialog(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#FF3B30]/10 flex items-center justify-center"><AlertCircle className="w-4 h-4 text-[#FF3B30]" /></div>
              تسجيل دين
            </AlertDialogTitle>
            <AlertDialogDescription>
              سيتم قبض {confirmData.paid.toLocaleString('ar-SA')} <SarIcon className="inline" size={11} /> وتسجيل الباقي {confirmData.debt.toLocaleString('ar-SA')} <SarIcon className="inline" size={11} /> كدين على العميل
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" onClick={() => { setPaidAmount(String(finalTotal)); setConfirmDialog(null); }}>تعديل</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmDialog(null); handleSubmit(true); }} className="rounded-xl bg-[#007AFF]">تأكيد</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Credit Confirmation */}
      <AlertDialog open={confirmDialog === 'credit'} onOpenChange={(o) => !o && setConfirmDialog(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#34C759]/10 flex items-center justify-center"><CheckCircle2 className="w-4 h-4 text-[#34C759]" /></div>
              إضافة رصيد
            </AlertDialogTitle>
            <AlertDialogDescription>
              سيتم قبض {confirmData.finalTotal.toLocaleString('ar-SA')} <SarIcon className="inline" size={11} /> وإضافة {confirmData.credit.toLocaleString('ar-SA')} <SarIcon className="inline" size={11} /> لرصيد العميل
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" onClick={() => { setPaidAmount(String(finalTotal)); setConfirmDialog(null); }}>تعديل</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmDialog(null); handleSubmit(true); }} className="rounded-xl bg-[#007AFF]">تأكيد</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

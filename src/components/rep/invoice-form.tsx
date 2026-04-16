'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
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
  Percent,
  Calculator,
  Copy,
  X,
  Droplets,
  FileText,
  ChevronDown,
  ChevronUp,
  Gift,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface ProductItem {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
}

export function InvoiceForm() {
  const {
    user,
    clients,
    setClients,
    selectedClientId,
    setSelectedClientId,
    setRepTab,
    setInvoices,
    invoices,
    setRequestDialogOpen,
    setRequestEntityType,
    setRequestActionType,
    setRequestEntityId,
    duplicateInvoiceData,
    setDuplicateInvoiceData,
  } = useAppStore();

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
  const quantityRef = useRef<HTMLInputElement>(null);

  // Load duplicate invoice data
  useEffect(() => {
    if (duplicateInvoiceData) {
      setSelectedClientId(duplicateInvoiceData.clientId);
      setQuantity(String(duplicateInvoiceData.quantity));
      setPrice(String(duplicateInvoiceData.price));
      setPromotionQty('');
      setDiscountType('none');
      setDiscountValue('');
      setPaidAmount('');
    }
  }, [duplicateInvoiceData, setSelectedClientId]);

  // Fetch clients
  useEffect(() => {
    if (user && clients.length === 0) {
      fetch(`/api/clients?repId=${user.id}`)
        .then((res) => res.json())
        .then((data) => setClients(data))
        .catch(() => {});
    }
  }, [user, clients.length, setClients]);

  // Fetch invoices for recent clients
  useEffect(() => {
    if (user && invoices.length === 0) {
      fetch(`/api/invoices?repId=${user.id}`)
        .then((res) => res.json())
        .then((data) => setInvoices(data))
        .catch(() => {});
    }
  }, [user, invoices.length, setInvoices]);

  // Fetch products
  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setProducts(data.filter((p: ProductItem) => p.isActive));
      })
      .catch(() => {});
  }, []);

  // Auto-select product if only one exists
  useEffect(() => {
    if (products.length === 1 && !selectedProductId) {
      handleProductSelect(products[0]);
    }
  }, [products.length]);

  const recentClients = useMemo(() => {
    const seen = new Set<string>();
    const recent: any[] = [];
    for (const inv of invoices) {
      if (inv.clientId && !seen.has(inv.clientId)) {
        seen.add(inv.clientId);
        const client = clients.find((c) => c.id === inv.clientId);
        if (client) recent.push(client);
        if (recent.length >= 5) break;
      }
    }
    return recent;
  }, [invoices, clients]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId),
    [clients, selectedClientId]
  );

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  );

  const filteredClients = useMemo(
    () =>
      clients.filter(
        (c) =>
          c.name.includes(clientSearch) ||
          (c.businessName && c.businessName.includes(clientSearch)) ||
          (c.phone && c.phone.includes(clientSearch))
      ),
    [clients, clientSearch]
  );

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
    if (!user || !selectedClientId) { toast.error('يرجى اختيار عميل'); return; }
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
          repId: user.id,
          clientId: selectedClientId,
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
      setDuplicateInvoiceData(null);
      setSelectedClientId(null);
      setQuantity('');
      setPrice('');
      setDiscountType('none');
      setDiscountValue('');
      setPromotionQty('');
      setPaidAmount('');
      setShowDiscount(false);
      setShowPromotion(false);

      const invRes = await fetch(`/api/invoices?repId=${user.id}`);
      if (invRes.ok) setInvoices(await invRes.json());

      const updatedUser = { ...user, allocatedInventory: (user.allocatedInventory || 0) - qty - (parseInt(promotionQty) || 0) };
      useAppStore.getState().setUser(updatedUser);
      setRepTab('invoices');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 pb-32 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">فاتورة جديدة</h2>
        {invoices.length > 0 && !duplicateInvoiceData && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              const last = invoices[invoices.length - 1];
              if (last) {
                setDuplicateInvoiceData({ clientId: last.clientId, productSize: last.productSize || 'عادي', quantity: last.quantity, price: last.price });
                setSelectedClientId(last.clientId);
                setQuantity(String(last.quantity));
                setPrice(String(last.price));
                toast.success('تم نسخ آخر فاتورة');
              }
            }}
            className="flex items-center gap-1.5 text-xs text-[#007AFF] bg-[#007AFF]/8 px-3 py-1.5 rounded-lg font-medium"
          >
            <Copy className="w-3.5 h-3.5" />
            نسخ آخر فاتورة
          </motion.button>
        )}
      </div>

      {/* Invoice Document */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        {/* Invoice Header */}
        <div className="bg-gradient-to-l from-[#007AFF] to-[#0055D4] p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">مياه جبأ</h3>
                <p className="text-[11px] opacity-80">فاتورة بيع</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[11px]">
              <FileText className="w-3 h-3" />
              <span>جديدة</span>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
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
                <button
                  onClick={() => setSelectedClientId(null)}
                  className="text-xs text-[#007AFF] font-medium hover:underline"
                >
                  تغيير
                </button>
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
                      className="absolute top-full mt-1 right-0 left-0 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 max-h-56 overflow-y-auto z-20"
                    >
                      {!clientSearch && recentClients.length > 0 && (
                        <>
                          <p className="text-[10px] text-gray-400 font-medium px-3 py-1.5 sticky top-0 bg-white dark:bg-gray-800">الأخيرون</p>
                          {recentClients.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => { setSelectedClientId(c.id); setClientSearch(''); setShowClientDropdown(false); }}
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors"
                            >
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#007AFF] to-[#0055D4] flex items-center justify-center shrink-0">
                                <span className="text-white text-[10px] font-bold">{c.name.charAt(0)}</span>
                              </div>
                              <div className="text-right min-w-0">
                                <p className="font-medium truncate">{c.name}</p>
                                {c.businessName && <p className="text-[11px] text-gray-400 truncate">{c.businessName}</p>}
                              </div>
                            </button>
                          ))}
                          <div className="border-t border-gray-100 dark:border-gray-700" />
                        </>
                      )}
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
                            <div className="text-right min-w-0">
                              <p className="font-medium truncate">{c.name}</p>
                              {c.businessName && <p className="text-[11px] text-gray-400 truncate">{c.businessName}</p>}
                            </div>
                          </button>
                        ))
                      ) : (
                        <p className="text-sm text-gray-400 text-center py-4">لا توجد نتائج</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Dashed Separator */}
          <div className="relative">
            <div className="border-t border-dashed border-gray-200 dark:border-gray-700" />
          </div>

          {/* Product & Details Table */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">تفاصيل المنتج</p>

            {/* Product Quick Select - Horizontal chips */}
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
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Droplets className="w-3.5 h-3.5" />
                      <span>{product.name}</span>
                      <span className="opacity-70">{product.price} ر.س</span>
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* Invoice Table */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-3 bg-gray-50 dark:bg-gray-800/80">
                <div className="px-3 py-2.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400 text-center border-l border-gray-200 dark:border-gray-700">المنتج</div>
                <div className="px-3 py-2.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400 text-center border-l border-gray-200 dark:border-gray-700">الكمية</div>
                <div className="px-3 py-2.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400 text-center">السعر</div>
              </div>
              {/* Table Data Row */}
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
                    className="bg-transparent border-none shadow-none focus-visible:ring-0 h-8 text-sm text-center font-semibold text-gray-800 dark:text-white p-0 placeholder:text-gray-300 dark:placeholder:text-gray-600"
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
                    className="bg-transparent border-none shadow-none focus-visible:ring-0 h-8 text-sm text-center font-semibold text-gray-800 dark:text-white p-0 placeholder:text-gray-300 dark:placeholder:text-gray-600"
                  />
                </div>
              </div>
              {/* Total Row */}
              {total > 0 && (
                <div className="grid grid-cols-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/30">
                  <div className="col-span-2 px-3 py-2.5 text-sm text-gray-600 dark:text-gray-400 flex items-center justify-end font-medium">
                    المجموع
                  </div>
                  <div className="px-3 py-2.5 text-sm font-bold text-gray-900 dark:text-white text-center">
                    {total.toLocaleString('ar-SA')} <span className="text-[11px] font-normal text-gray-400">ر.س</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Discount Section */}
          <div>
            <button
              onClick={() => setShowDiscount(!showDiscount)}
              className="flex items-center justify-between w-full py-1"
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                الخصم
                {discountType === 'percentage' && discountValue && !showDiscount && (
                  <span className="normal-case font-bold text-[#007AFF] text-[11px]">{discountValue}%</span>
                )}
                {discountType === 'fixed' && discountValue && !showDiscount && (
                  <span className="normal-case font-bold text-[#007AFF] text-[11px]">{Number(discountValue).toLocaleString('ar-SA')} ر.س</span>
                )}
              </span>
              {showDiscount ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            <AnimatePresence>
              {showDiscount && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-1.5 mb-2">
                    {([['none', 'بدون'], ['percentage', 'نسبة %'], ['fixed', 'مبلغ']] as const).map(([type, label]) => (
                      <button
                        key={type}
                        onClick={() => { setDiscountType(type as any); if (type === 'none') setDiscountValue(''); }}
                        className={`flex-1 h-8 rounded-lg text-[11px] font-medium transition-colors ${
                          discountType === type
                            ? 'bg-[#007AFF] text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {discountType !== 'none' && (
                    <div>
                      <Input
                        type="number"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        placeholder={discountType === 'percentage' ? 'نسبة الخصم %' : 'مبلغ الخصم'}
                        min="0"
                        className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 dark:text-white rounded-xl h-10 text-sm"
                      />
                      {discountType === 'percentage' && discountValue && (
                        <p className="text-[10px] text-gray-400 mt-1">خصم: {discountAmount.toLocaleString('ar-SA')} ر.س</p>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Promotion Section */}
          <div>
            <button
              onClick={() => setShowPromotion(!showPromotion)}
              className="flex items-center justify-between w-full py-1"
            >
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">الدعاية</span>
              {showPromotion ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            <AnimatePresence>
              {showPromotion && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-[#FF9500] shrink-0" />
                    <Input
                      type="number"
                      value={promotionQty}
                      onChange={(e) => setPromotionQty(e.target.value)}
                      placeholder="عدد الكراتين المجانية"
                      min="0"
                      className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 dark:text-white rounded-xl h-10 text-sm"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 mr-6">لا تؤثر على السعر - تخصم من المخزون فقط</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Dashed Separator */}
          <div className="border-t border-dashed border-gray-200 dark:border-gray-700" />

          {/* Payment Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">الدفع</p>
              {finalTotal > 0 && (
                <div className="flex items-center gap-2">
                  {discountAmount > 0 && (
                    <span className="text-[11px] text-red-500 line-through">{total.toLocaleString('ar-SA')} ر.س</span>
                  )}
                  <p className="text-sm font-extrabold text-gray-900 dark:text-white">
                    {finalTotal.toLocaleString('ar-SA')} <span className="text-xs font-normal text-gray-400">ر.س</span>
                  </p>
                </div>
              )}
            </div>
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block">المبلغ المدفوع (ر.س)</label>
              <Input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder="0"
                min="0"
                className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 dark:text-white rounded-xl h-11 text-sm font-semibold"
              />
            </div>
            {debt > 0 && paid > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-1.5 mt-2 text-[11px] text-[#FF3B30] bg-[#FF3B30]/5 px-2.5 py-1.5 rounded-lg"
              >
                <AlertCircle className="w-3 h-3" />
                سيُسجل {debt.toLocaleString('ar-SA')} ر.س كدين
              </motion.div>
            )}
            {credit > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-1.5 mt-2 text-[11px] text-[#34C759] bg-[#34C759]/5 px-2.5 py-1.5 rounded-lg"
              >
                <CheckCircle2 className="w-3 h-3" />
                سيُضاف {credit.toLocaleString('ar-SA')} ر.س لرصيد العميل
              </motion.div>
            )}
          </div>

          {/* Dashed Separator */}
          <div className="border-t border-dashed border-gray-200 dark:border-gray-700" />
        </div>
      </div>

      {/* Submit Button */}
      <button
        id="invoice-submit-btn"
        onClick={() => handleSubmit(true)}
        disabled={loading || !selectedClientId || qty <= 0 || prc <= 0}
        className="w-full h-12 rounded-2xl bg-gradient-to-l from-[#007AFF] to-[#0055D4] text-white font-bold text-sm shadow-lg shadow-[#007AFF]/25 disabled:opacity-40 disabled:shadow-none transition-opacity flex items-center justify-center gap-2"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Plus className="w-4 h-4" />
            إنشاء الفاتورة
          </>
        )}
      </button>

      {/* Debt Confirmation Dialog */}
      <AlertDialog open={confirmDialog === 'debt'} onOpenChange={(o) => !o && setConfirmDialog(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#FF3B30]/10 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-[#FF3B30]" />
              </div>
              تسجيل دين
            </AlertDialogTitle>
            <AlertDialogDescription>
              سيتم قبض {confirmData.paid.toLocaleString('ar-SA')} ر.س وتسجيل الباقي {confirmData.debt.toLocaleString('ar-SA')} ر.س كدين على العميل
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" onClick={() => { setPaidAmount(String(finalTotal)); setConfirmDialog(null); }}>
              تعديل
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmDialog(null); handleSubmit(true); }} className="rounded-xl bg-[#007AFF]">
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Credit Confirmation Dialog */}
      <AlertDialog open={confirmDialog === 'credit'} onOpenChange={(o) => !o && setConfirmDialog(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#34C759]/10 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
              </div>
              إضافة رصيد
            </AlertDialogTitle>
            <AlertDialogDescription>
              سيتم قبض {confirmData.finalTotal.toLocaleString('ar-SA')} ر.س للفاتورة وإضافة {confirmData.credit.toLocaleString('ar-SA')} ر.س لرصيد العميل
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" onClick={() => { setPaidAmount(String(finalTotal)); setConfirmDialog(null); }}>
              تعديل
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmDialog(null); handleSubmit(true); }} className="rounded-xl bg-[#007AFF]">
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

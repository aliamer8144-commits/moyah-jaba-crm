'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChevronDown,
  Package,
  Search,
  Plus,
  Loader2,
  Info,
  Percent,
  DollarSign,
  Calculator,
  Copy,
  X,
  PackageOpen,
  Box,
  Pencil,
  Sparkles,
} from 'lucide-react';

interface ProductItem {
  id: string;
  name: string;
  size: string;
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
    sizeVariationsEnabled,
    setRequestDialogOpen,
    setRequestEntityType,
    setRequestActionType,
    setRequestEntityId,
    duplicateInvoiceData,
    setDuplicateInvoiceData,
  } = useAppStore();

  const [productSize, setProductSize] = useState('عادي');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState('');
  const [promotionQty, setPromotionQty] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [dropdownFocused, setDropdownFocused] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<'debt' | 'credit' | null>(null);
  const [confirmData, setConfirmData] = useState({ debt: 0, credit: 0, paid: 0, finalTotal: 0 });
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);

  // Load duplicate invoice data on mount
  useEffect(() => {
    if (duplicateInvoiceData) {
      setSelectedClientId(duplicateInvoiceData.clientId);
      setProductSize(duplicateInvoiceData.productSize);
      setQuantity(String(duplicateInvoiceData.quantity));
      setPrice(String(duplicateInvoiceData.price));
      setPromotionQty('');
      setDiscountType('none');
      setDiscountValue('');
      setPaidAmount('');
    }
  }, [duplicateInvoiceData, setSelectedClientId]);

  // Fetch clients on mount
  useEffect(() => {
    if (user && clients.length === 0) {
      fetch(`/api/clients?repId=${user.id}`)
        .then((res) => res.json())
        .then((data) => setClients(data))
        .catch(() => {});
    }
  }, [user, clients.length, setClients]);

  // Fetch invoices on mount for recent clients suggestions
  useEffect(() => {
    if (user && invoices.length === 0) {
      fetch(`/api/invoices?repId=${user.id}`)
        .then((res) => res.json())
        .then((data) => setInvoices(data))
        .catch(() => {});
    }
  }, [user, invoices.length, setInvoices]);

  // Fetch products on mount
  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setProducts(data.filter((p: ProductItem) => p.isActive));
      })
      .catch(() => {});
  }, []);

  // Recent clients (last 5 unique clients from invoices)
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

  // Set selected client if coming from client profile
  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId),
    [clients, selectedClientId]
  );

  // Filter clients for search
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
    if (discountType === 'percentage') {
      return total * ((parseFloat(discountValue) || 0) / 100);
    }
    if (discountType === 'fixed') {
      return parseFloat(discountValue) || 0;
    }
    return 0;
  }, [discountType, discountValue, total]);

  const finalTotal = Math.max(0, total - discountAmount);
  const paid = parseFloat(paidAmount) || 0;
  const debt = Math.max(0, finalTotal - paid);
  const credit = Math.max(0, paid - finalTotal);

  const handleProductSelect = (product: ProductItem) => {
    setSelectedProductId(product.id);
    setProductSize(product.size);
    setPrice(String(product.price));
    // Focus quantity input after a short delay
    setTimeout(() => quantityInputRef.current?.focus(), 150);
  };

  const handleCustomSelect = () => {
    setSelectedProductId('custom');
    setProductSize('عادي');
    setPrice('');
    setTimeout(() => quantityInputRef.current?.focus(), 150);
  };

  const handlePaidBlur = () => {
    if (paid > 0 && paid < finalTotal) {
      setConfirmData({ debt, credit: 0, paid, finalTotal });
      setConfirmDialog('debt');
    } else if (paid > finalTotal && finalTotal > 0) {
      setConfirmData({ debt: 0, credit, paid, finalTotal });
      setConfirmDialog('credit');
    }
  };

  const handleSubmit = async (confirmed = false) => {
    if (!user || !selectedClientId) {
      toast.error('يرجى اختيار عميل');
      return;
    }
    if (qty <= 0) {
      toast.error('يرجى إدخال الكمية');
      return;
    }
    if (prc <= 0) {
      toast.error('يرجى إدخال السعر');
      return;
    }
    if (paid < 0) {
      toast.error('المبلغ المدفوع لا يمكن أن يكون سالباً');
      return;
    }

    // Check confirmation for debt/credit
    if (!confirmed && debt > 0) {
      setConfirmData({ debt, credit: 0, paid, finalTotal });
      setConfirmDialog('debt');
      return;
    }
    if (!confirmed && credit > 0) {
      setConfirmData({ debt: 0, credit, paid, finalTotal });
      setConfirmDialog('credit');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repId: user.id,
          clientId: selectedClientId,
          productSize,
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

      toast.success('تم إنشاء الفاتورة بنجاح');
      // Clear duplicate data on success
      setDuplicateInvoiceData(null);
      setSelectedClientId(null);

      // Refresh invoices
      const invRes = await fetch(`/api/invoices?repId=${user.id}`);
      if (invRes.ok) {
        const invData = await invRes.json();
        setInvoices(invData);
      }

      // Update user inventory
      const updatedUser = { ...user, allocatedInventory: (user.allocatedInventory || 0) - qty - (parseInt(promotionQty) || 0) };
      useAppStore.getState().setUser(updatedUser);

      setRepTab('invoices');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const sizes = ['عادي', ...(sizeVariationsEnabled ? ['صغير', 'كبير'] : [])];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-4 pb-32 space-y-4 compact-form">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-lg font-bold dark:text-white compact-title">فاتورة جديدة</h2>
        <div className="flex items-center gap-2">
          {/* Duplicate Last Invoice Quick Action */}
          {invoices.length > 0 && !duplicateInvoiceData && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const lastInv = invoices[invoices.length - 1];
                if (lastInv) {
                  setDuplicateInvoiceData({
                    clientId: lastInv.clientId,
                    productSize: lastInv.productSize || 'عادي',
                    quantity: lastInv.quantity,
                    price: lastInv.price,
                  });
                  setSelectedClientId(lastInv.clientId);
                  setProductSize(lastInv.productSize || 'عادي');
                  setQuantity(String(lastInv.quantity));
                  setPrice(String(lastInv.price));
                  setPromotionQty('');
                  setDiscountType('none');
                  setDiscountValue('');
                  setPaidAmount('');
                  toast.success('تم نسخ بيانات آخر فاتورة');
                }
              }}
              className="flex items-center gap-1.5 text-xs text-[#007AFF] bg-[#007AFF]/10 px-3 py-1.5 rounded-full font-medium hover:bg-[#007AFF]/20 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              نسخ آخر فاتورة
            </motion.button>
          )}
          {duplicateInvoiceData && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => {
                setDuplicateInvoiceData(null);
                setSelectedClientId(null);
                setProductSize('عادي');
                setQuantity('');
                setPrice('');
                setDiscountType('none');
                setDiscountValue('');
                setPromotionQty('');
                setPaidAmount('');
              }}
              className="flex items-center gap-1.5 text-xs text-[#FF9500] bg-[#FF9500]/10 px-3 py-1.5 rounded-full font-medium hover:bg-[#FF9500]/20 transition-colors"
            >
              <X className="w-3 h-3" />
              مسح البيانات المعبأة
            </motion.button>
          )}
        </div>
      </div>

      {duplicateInvoiceData && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 bg-[#34C759]/5 border border-[#34C759]/20 rounded-xl px-3 py-2.5"
        >
          <Copy className="w-4 h-4 text-[#34C759] shrink-0" />
          <span className="text-xs text-[#34C759] font-medium">بيانات فاتورة مسبقة التعبئة - يمكنك تعديلها قبل الحفظ</span>
        </motion.div>
      )}

      <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-4 shadow-sm space-y-4 compact-card">
        {/* Product */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">المنتج</Label>
          <div className="flex items-center gap-2 bg-[#f2f2f7] dark:bg-gray-700 rounded-xl h-11 px-3">
            <Package className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">مياه جبأ</span>
          </div>
        </div>

        {/* Products Quick Select */}
        {products.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#007AFF]" />
                اختيار سريع للمنتج
              </Label>
              {selectedProductId && selectedProductId !== 'custom' && (
                <button
                  onClick={() => { setSelectedProductId(null); setPrice(''); }}
                  className="text-[10px] text-[#FF3B30] font-medium hover:underline"
                >
                  إلغاء الاختيار
                </button>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
              {products.map((product, index) => {
                const isSelected = selectedProductId === product.id;
                const sizeConfig: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode; darkBg: string }> = {
                  'عادي': { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50', border: 'border-blue-200', icon: <Package className="w-3 h-3" />, darkBg: 'dark:bg-blue-900/30' },
                  'صغير': { color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50', border: 'border-orange-200', icon: <PackageOpen className="w-3 h-3" />, darkBg: 'dark:bg-orange-900/30' },
                  'كبير': { color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50', border: 'border-purple-200', icon: <Box className="w-3 h-3" />, darkBg: 'dark:bg-purple-900/30' },
                };
                const cfg = sizeConfig[product.size] || sizeConfig['عادي'];
                return (
                  <motion.button
                    key={product.id}
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: index * 0.05, type: 'spring', stiffness: 350, damping: 25 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleProductSelect(product)}
                    className={`relative flex-shrink-0 w-28 rounded-xl p-2.5 border-2 transition-all duration-200 text-center ${
                      isSelected
                        ? `${cfg.bg} ${cfg.darkBg} ${cfg.color} ${cfg.border} shadow-sm ring-2 ring-[#007AFF]/20`
                        : 'bg-[#f2f2f7] dark:bg-gray-700 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    {/* Stock availability dot */}
                    <div className="absolute top-1.5 left-1.5">
                      <div className={`w-2 h-2 rounded-full ${product.isActive ? 'bg-[#34C759] shadow-sm shadow-[#34C759]/40' : 'bg-gray-300'}`} />
                    </div>
                    <div className={`w-8 h-8 rounded-lg ${isSelected ? cfg.bg : 'bg-gray-200 dark:bg-gray-600'} flex items-center justify-center mx-auto mb-1.5`}>
                      <span className={isSelected ? cfg.color : 'text-gray-400 dark:text-gray-500'}>{cfg.icon}</span>
                    </div>
                    <p className="text-[11px] font-medium truncate text-gray-700 dark:text-gray-300">{product.name}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{product.size}</p>
                    <p className={`text-xs font-bold mt-1 number-mono ${isSelected ? cfg.color : 'text-gray-700 dark:text-gray-300'}`}>
                      {product.price.toLocaleString('ar-SA')} ر.س
                    </p>
                  </motion.button>
                );
              })}
              {/* Custom option */}
              <motion.button
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: products.length * 0.05, type: 'spring', stiffness: 350, damping: 25 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCustomSelect}
                className={`relative flex-shrink-0 w-28 rounded-xl p-2.5 border-2 transition-all duration-200 text-center ${
                  selectedProductId === 'custom'
                    ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 shadow-sm ring-2 ring-amber-400/20'
                    : 'bg-[#f2f2f7] dark:bg-gray-700 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center mx-auto mb-1.5">
                  <Pencil className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-[11px] font-medium text-gray-700 dark:text-gray-300">مخصص</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">إدخال يدوي</p>
                <p className="text-xs font-bold mt-1 text-gray-400 dark:text-gray-500">---</p>
              </motion.button>
            </div>
          </div>
        )}

        {/* Product Size - Visual Badges */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">حجم المنتج</Label>
          <div className="flex gap-2">
            {sizes.map((s) => {
              const sizeConfig: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
                'عادي': { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: <Package className="w-3.5 h-3.5" /> },
                'صغير': { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', icon: <PackageOpen className="w-3.5 h-3.5" /> },
                'كبير': { color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', icon: <Box className="w-3.5 h-3.5" /> },
              };
              const cfg = sizeConfig[s] || sizeConfig['عادي'];
              const isSelected = productSize === s;
              return (
                <motion.button
                  key={s}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setProductSize(s); setSelectedProductId(null); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isSelected
                      ? `${cfg.bg} ${cfg.color} border-2 ${cfg.border} shadow-sm`
                      : 'bg-[#f2f2f7] dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-2 border-transparent hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {cfg.icon}
                  {s}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Unit */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">الوحدة</Label>
          <div className="flex items-center gap-2 bg-[#f2f2f7] dark:bg-gray-700 rounded-xl h-11 px-3">
            <Package className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">كرتون</span>
          </div>
        </div>

        {/* Client Selection */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            العميل <span className="text-[#FF3B30]">*</span>
          </Label>
          {selectedClient ? (
            <div className="flex items-center justify-between bg-[#007AFF]/5 border border-[#007AFF]/20 rounded-xl h-11 px-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#007AFF] flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{selectedClient.name.charAt(0)}</span>
                </div>
                <span className="text-sm font-medium">{selectedClient.name}</span>
              </div>
              <button
                onClick={() => setSelectedClientId(null)}
                className="text-[#FF3B30] text-xs font-medium"
              >
                تغيير
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setShowClientDropdown(true);
                  }}
                  onFocus={() => setShowClientDropdown(true)}
                  onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                  placeholder="اختر العميل..."
                  className="bg-[#f2f2f7] dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-500 rounded-xl border-0 pr-10 h-11 text-sm input-focus-ring"
                />
              </div>
              {showClientDropdown && (
                <div className="absolute top-full mt-1 right-0 left-0 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 max-h-64 overflow-y-auto z-10">
                  {/* Recent Clients Suggestions */}
                  {!clientSearch && recentClients.length > 0 && (
                    <div className="border-b border-gray-50">
                      <p className="text-[11px] text-gray-400 font-medium px-3 py-1.5">العملاء الأخيرون</p>
                      {recentClients.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedClientId(c.id);
                            setClientSearch('');
                            setShowClientDropdown(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors"
                        >
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#007AFF] to-[#0055D4] flex items-center justify-center shrink-0">
                            <span className="text-white text-xs font-bold">{c.name.charAt(0)}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{c.name}</p>
                            {c.businessName && (
                              <p className="text-xs text-gray-500">{c.businessName}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Search results */}
                  {filteredClients.length > 0 && (
                    <div>
                      {filteredClients.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedClientId(c.id);
                            setClientSearch('');
                            setShowClientDropdown(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors"
                        >
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold">{c.name.charAt(0)}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{c.name}</p>
                            {c.businessName && (
                              <p className="text-xs text-gray-500">{c.businessName}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {clientSearch && filteredClients.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">لا توجد نتائج</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quantity & Price */}
        <div className="grid grid-cols-2 gap-3 compact-grid">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">
              العدد <span className="text-[#FF3B30]">*</span>
            </Label>
            <Input
              ref={quantityInputRef}
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              min="0"
              className="bg-[#f2f2f7] dark:bg-gray-700 dark:text-white rounded-xl border-0 h-11 text-sm input-focus-ring"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              السعر <span className="text-[#FF3B30]">*</span>
            </Label>
            <Input
              type="number"
              value={price}
              onChange={(e) => { setPrice(e.target.value); setSelectedProductId(null); }}
              placeholder="0"
              min="0"
              step="0.5"
              className="bg-[#f2f2f7] dark:bg-gray-700 dark:text-white rounded-xl border-0 h-11 text-sm input-focus-ring"
            />
          </div>
        </div>

        {/* Total */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">الإجمالي</Label>
          <div className="flex items-center gap-2 bg-[#007AFF]/5 border border-[#007AFF]/20 rounded-xl h-11 px-3">
            <Calculator className="w-4 h-4 text-[#007AFF]" />
            <span className="text-sm font-bold text-[#007AFF]">{total.toLocaleString('ar-SA')} ر.س</span>
          </div>
        </div>

        {/* Discount */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">الخصم</Label>
          <div className="flex gap-2">
            <button
              onClick={() => { setDiscountType('none'); setDiscountValue(''); }}
              className={`flex-1 h-9 rounded-xl text-xs font-medium transition-colors ${
                discountType === 'none'
                  ? 'bg-[#007AFF] text-white'
                  : 'bg-[#f2f2f7] dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              بدون خصم
            </button>
            <button
              onClick={() => setDiscountType('percentage')}
              className={`flex-1 h-9 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                discountType === 'percentage'
                  ? 'bg-[#007AFF] text-white'
                  : 'bg-[#f2f2f7] dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              <Percent className="w-3 h-3" />
              نسبة %
            </button>
            <button
              onClick={() => setDiscountType('fixed')}
              className={`flex-1 h-9 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                discountType === 'fixed'
                  ? 'bg-[#007AFF] text-white'
                  : 'bg-[#f2f2f7] dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              <DollarSign className="w-3 h-3" />
              مبلغ ثابت
            </button>
          </div>
          {discountType !== 'none' && (
            <div className="animate-discount-expand">
              <Input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === 'percentage' ? 'نسبة الخصم' : 'مبلغ الخصم'}
                min="0"
                className="bg-[#f2f2f7] dark:bg-gray-700 dark:text-white rounded-xl border-0 h-11 text-sm focus:ring-2 ring-[#007AFF]/20"
              />
              {discountType === 'percentage' && discountValue && (
                <p className="text-[11px] text-gray-400 mt-1">
                  خصم: <span className="font-medium text-[#FF9500]">{discountAmount.toLocaleString('ar-SA')}</span> ر.س
                </p>
              )}
            </div>
          )}
        </div>

        {/* Final Total */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">الإجمالي بعد الخصم</Label>
          <div className="flex items-center gap-2 bg-[#34C759]/5 border border-[#34C759]/20 rounded-xl h-12 px-3">
            <span className="text-base font-bold text-[#34C759]">{finalTotal.toLocaleString('ar-SA')} ر.س</span>
          </div>
        </div>

        {/* Promotion */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#FF9500]" />
            الدعاية (كرتونات مجانية)
          </Label>
          <Input
            type="number"
            value={promotionQty}
            onChange={(e) => setPromotionQty(e.target.value)}
            placeholder="0"
            min="0"
            className="bg-[#f2f2f7] dark:bg-gray-700 dark:text-white rounded-xl border-0 h-11 text-sm focus:ring-2 ring-[#007AFF]/20"
          />
          <p className="text-[11px] text-gray-400">
            لا تؤثر على السعر ولكن تخصم من المخزون
          </p>
        </div>

        {/* Paid Amount */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">المبلغ المدفوع</Label>
          <Input
            type="number"
            value={paidAmount}
            onChange={(e) => setPaidAmount(e.target.value)}
            onBlur={handlePaidBlur}
            placeholder="0"
            min="0"
            className="bg-[#f2f2f7] dark:bg-gray-700 dark:text-white rounded-xl border-0 h-11 text-sm focus:ring-2 ring-[#007AFF]/20"
          />
          {debt > 0 && paid > 0 && (
            <p className="text-xs text-[#FF3B30]">
              سيتم تسجيل {debt.toLocaleString('ar-SA')} ر.س كدين على العميل
            </p>
          )}
          {credit > 0 && (
            <p className="text-xs text-[#34C759]">
              سيتم إضافة {credit.toLocaleString('ar-SA')} ر.س إلى رصيد العميل
            </p>
          )}
        </div>
      </div>

      {/* Submit */}
      <Button
        id="invoice-submit-btn"
        onClick={() => handleSubmit(true)}
        disabled={loading || !selectedClientId}
        className="w-full h-12 rounded-2xl bg-[#007AFF] text-white font-semibold text-base shadow-lg shadow-[#007AFF]/20"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          'إنشاء الفاتورة'
        )}
      </Button>

      {/* Real-time Invoice Total Preview Bar */}
      {(qty > 0 || prc > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-gradient-to-t from-white via-white to-white/95 dark:from-[#1c1c1e] dark:via-[#1c1c1e] dark:to-[#1c1c1e]/95 border-t border-gray-200/50 dark:border-gray-800/50 animate-total-slide-up"
        >
          <div className="max-w-md mx-auto flex items-center justify-between bg-gradient-to-l from-[#007AFF]/5 to-[#34C759]/5 rounded-2xl px-4 py-3 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#007AFF]/10 flex items-center justify-center">
                <Calculator className="w-4 h-4 text-[#007AFF]" />
              </div>
              <div>
                <p className="text-[11px] text-gray-500">الإجمالي</p>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-[#1c1c1e] dark:text-white text-shadow-glow">{finalTotal.toLocaleString('ar-SA')}</p>
                  <span className="text-xs text-gray-400">ر.س</span>
                  {discountAmount > 0 && (
                    <span className="text-xs text-[#FF9500] line-through">{total.toLocaleString('ar-SA')}</span>
                  )}
                </div>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const el = document.getElementById('invoice-submit-btn');
                el?.click();
              }}
              className="px-5 py-2.5 bg-gradient-to-l from-[#007AFF] to-[#5856D6] text-white rounded-xl text-sm font-semibold shadow-md shadow-[#007AFF]/25"
            >
              إنشاء ✨
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Debt Confirmation */}
      <AlertDialog open={confirmDialog === 'debt'} onOpenChange={(o) => !o && setConfirmDialog(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد تسجيل دين</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم قبض {confirmData.paid.toLocaleString('ar-SA')} ر.س وتسجيل الباقي {confirmData.debt.toLocaleString('ar-SA')} ر.س كدين على العميل. هل تريد المتابعة؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" onClick={() => { setPaidAmount(String(finalTotal)); setConfirmDialog(null); }}>
              تعديل المبلغ
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setConfirmDialog(null); handleSubmit(true); }}
              className="rounded-xl bg-[#007AFF]"
            >
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Credit Confirmation */}
      <AlertDialog open={confirmDialog === 'credit'} onOpenChange={(o) => !o && setConfirmDialog(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد إضافة رصيد</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم قبض {confirmData.finalTotal.toLocaleString('ar-SA')} ر.س للفاتورة، وإضافة الباقي {confirmData.credit.toLocaleString('ar-SA')} ر.س إلى رصيد العميل. هل تريد المتابعة؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" onClick={() => { setPaidAmount(String(finalTotal)); setConfirmDialog(null); }}>
              تعديل المبلغ
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setConfirmDialog(null); handleSubmit(true); }}
              className="rounded-xl bg-[#007AFF]"
            >
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

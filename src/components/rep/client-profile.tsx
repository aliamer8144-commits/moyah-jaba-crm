'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ReceiptForm } from '@/components/rep/receipt-form';
import { ReceiptList } from '@/components/rep/receipt-list';
import {
  ArrowRight,
  Phone,
  MapPin,
  Building2,
  StickyNote,
  Wallet,
  FileText,
  Clock,
  Pencil,
  Trash2,
  Plus,
  CheckCircle,
  XCircle,
  Receipt,
  MessageCircle,
  Tag,
} from 'lucide-react';
import { SarIcon } from '@/components/shared/sar-icon';
import { CallLog } from '@/components/rep/call-log';
import { ClientInsights } from '@/components/rep/client-insights';
import { ClientTrustBadge } from '@/components/rep/client-trust-badge';
import { PaymentTimeline } from '@/components/rep/payment-timeline';

const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
};

const CLIENT_CATEGORIES = [
  { label: 'مطعم', value: 'مطعم', color: '#FF9500' },
  { label: 'سوبرماركت', value: 'سوبرماركت', color: '#34C759' },
  { label: 'بقالة', value: 'بقالة', color: '#AF52DE' },
  { label: 'محل', value: 'محل', color: '#FF3B30' },
  { label: 'مكتب', value: 'مكتب', color: '#007AFF' },
  { label: 'فندق', value: 'فندق', color: '#5856D6' },
  { label: 'مقهى', value: 'مقهى', color: '#FF6B6B' },
  { label: 'أخرى', value: 'أخرى', color: '#8E8E93' },
];

function getCategoryStyle(value: string) {
  const cat = CLIENT_CATEGORIES.find((c) => c.value === value);
  if (!cat) return { color: '#8E8E93' };
  return { color: cat.color };
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('ar-SA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ClientProfile({ onBack, onRefresh }: { onBack: () => void; onRefresh?: () => void }) {
  const {
    user,
    selectedClientId,
    clients,
    setClients,
    setSelectedClientId,
    setRepTab,
    setRequestDialogOpen,
    setRequestEntityType,
    setRequestActionType,
    setRequestEntityId,
  } = useAppStore();
  const client = clients.find((c) => c.id === selectedClientId);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [receiptDrawerOpen, setReceiptDrawerOpen] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(client?.notes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [editingCategory, setEditingCategory] = useState(false);
  const [categoryValue, setCategoryValue] = useState(client?.category || '');
  const [customCategory, setCustomCategory] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  const fetchInvoices = useCallback(async () => {
    if (!selectedClientId) return;
    try {
      const res = await fetch(`/api/invoices?clientId=${selectedClientId}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [selectedClientId]);

  const fetchClientData = useCallback(async () => {
    if (!selectedClientId || !user) return;
    try {
      const res = await fetch(`/api/clients?repId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch {
      // silent
    }
  }, [selectedClientId, user, setClients]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleNewInvoice = () => {
    setRepTab('create-invoice');
  };

  const handleEditRequest = () => {
    if (!selectedClientId) return;
    setRequestEntityType('client');
    setRequestActionType('edit');
    setRequestEntityId(selectedClientId);
    setRequestDialogOpen(true);
  };

  const handleDeleteRequest = () => {
    if (!selectedClientId) return;
    setRequestEntityType('client');
    setRequestActionType('delete');
    setRequestEntityId(selectedClientId);
    setRequestDialogOpen(true);
  };

  const handleReceiptSuccess = () => {
    fetchClientData();
    onRefresh?.();
  };

  const handleSaveCategory = async () => {
    if (!selectedClientId) return;
    setSavingCategory(true);
    try {
      const finalCategory = categoryValue === 'أخرى' ? customCategory.trim() : (categoryValue || null);
      if (categoryValue === 'أخرى' && !customCategory.trim()) {
        toast.error('يرجى كتابة نوع الفئة');
        setSavingCategory(false);
        return;
      }
      const res = await fetch(`/api/clients?clientId=${selectedClientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: finalCategory }),
      });
      if (res.ok) {
        const updatedClient = await res.json();
        setClients(clients.map((c) => (c.id === selectedClientId ? { ...c, category: updatedClient.category } : c)));
        toast.success('تم تحديث الفئة بنجاح');
        setEditingCategory(false);
      }
    } catch {
      toast.error('حدث خطأ أثناء التحديث');
    } finally {
      setSavingCategory(false);
    }
  };

  if (!client) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>العميل غير موجود</p>
        <Button onClick={onBack} variant="outline" className="mt-4 rounded-xl">رجوع</Button>
      </div>
    );
  }

  const catStyle = client.category ? getCategoryStyle(client.category) : null;

  return (
    <motion.div initial="initial" animate="animate" variants={fadeUp} className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-2">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowRight className="w-5 h-5 text-[#1c1c1e]" />
        </button>
        <h2 className="text-lg font-bold">تفاصيل العميل</h2>
      </div>

      {/* Client Card */}
      <div className="mx-4 bg-white dark:bg-[#1c1c1e] rounded-2xl p-5 shadow-sm card-hover-lift dark-card-border">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#007AFF] to-[#0055D4] flex items-center justify-center">
            <span className="text-white font-bold text-xl">{client.name.charAt(0)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold">{client.name}</h3>
              {catStyle && (
                <span
                  className="text-[11px] font-medium px-2 py-0.5 rounded-lg"
                  style={{ backgroundColor: `${catStyle.color}15`, color: catStyle.color }}
                >
                  {client.category}
                </span>
              )}
            </div>
            {client.businessName && (
              <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                <Building2 className="w-3.5 h-3.5" />
                {client.businessName}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {client.phone && (
            <div className="flex items-center gap-3 text-sm">
              <Phone className="w-4 h-4 text-gray-400" />
              <span dir="ltr" className="flex-1">{client.phone}</span>
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${client.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="w-9 h-9 rounded-full bg-[#34C759] flex items-center justify-center shadow-sm hover:bg-[#2DB84D] transition-colors active:scale-95"
                >
                  <Phone className="w-4 h-4 text-white" />
                </a>
                <a
                  href={`https://wa.me/${client.phone.replace(/[^0-9+]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center shadow-sm hover:bg-[#1EBE5A] transition-colors active:scale-95"
                >
                  <MessageCircle className="w-4 h-4 text-white" />
                </a>
              </div>
            </div>
          )}
          {client.address && (
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span>{client.address}</span>
            </div>
          )}

          {/* Category Section */}
          <div className="pt-1">
            <div className="flex items-center gap-2 mb-1.5">
              <Tag className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">فئة العميل</span>
            </div>
            {editingCategory ? (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-1.5">
                  {CLIENT_CATEGORIES.map((cat) => {
                    const isSelected = categoryValue === cat.value;
                    return (
                      <motion.button
                        key={cat.value}
                        type="button"
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setCategoryValue(isSelected ? '' : cat.value)}
                        className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 border ${
                          isSelected
                            ? 'border-transparent text-white shadow-sm'
                            : 'bg-[#f2f2f7] dark:bg-gray-800 border-transparent text-gray-600 dark:text-gray-400'
                        }`}
                        style={isSelected ? { backgroundColor: cat.color, boxShadow: `0 2px 8px ${cat.color}30` } : {}}
                      >
                        {cat.label}
                      </motion.button>
                    );
                  })}
                </div>

                {categoryValue === 'أخرى' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                  >
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="اكتب نوع الفئة..."
                      className="w-full bg-[#f2f2f7] dark:bg-gray-800 rounded-xl border-0 focus:ring-2 ring-[#007AFF]/20 px-3 py-2 text-sm"
                    />
                  </motion.div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleSaveCategory}
                    disabled={savingCategory}
                    className="flex-1 h-8 rounded-xl text-xs font-medium bg-[#007AFF] text-white flex items-center justify-center gap-1 hover:bg-[#0055D4] transition-colors disabled:opacity-50"
                  >
                    {savingCategory ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><CheckCircle className="w-3 h-3" /> حفظ</>}
                  </button>
                  <button
                    onClick={() => {
                      setCategoryValue(client.category || '');
                      setCustomCategory('');
                      setEditingCategory(false);
                    }}
                    disabled={savingCategory}
                    className="flex-1 h-8 rounded-xl text-xs font-medium bg-[#f2f2f7] text-gray-600 flex items-center justify-center gap-1 hover:bg-gray-200 transition-colors"
                  >
                    <XCircle className="w-3 h-3" /> إلغاء
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2">
                  {client.category ? (
                    <span
                      className="text-xs font-medium px-2.5 py-1 rounded-lg"
                      style={{ backgroundColor: `${catStyle?.color || '#8E8E93'}15`, color: catStyle?.color || '#8E8E93' }}
                    >
                      {client.category}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 bg-gray-50 dark:bg-gray-800 px-2.5 py-1 rounded-lg">
                      غير محدد
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setCategoryValue(client.category || '');
                    setCustomCategory('');
                    setEditingCategory(true);
                  }}
                  className="mt-2 mr-7 text-[11px] text-[#007AFF] font-medium flex items-center gap-1 hover:underline"
                >
                  <Pencil className="w-3 h-3" />
                  تعديل الفئة
                </button>
              </div>
            )}
          </div>

          {editingNotes ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">الملاحظات</span>
              </div>
              <textarea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                className="w-full bg-[#f2f2f7] rounded-xl border-0 p-3 text-sm resize-none focus:ring-2 ring-[#007AFF]/20 min-h-[80px]"
                placeholder="أضف ملاحظات عن العميل..."
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    setSavingNotes(true);
                    try {
                      const res = await fetch(`/api/clients?clientId=${selectedClientId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ notes: notesValue || null }),
                      });
                      if (res.ok) {
                        const updatedClient = await res.json();
                        setClients(clients.map((c) => (c.id === selectedClientId ? { ...c, notes: updatedClient.notes } : c)));
                        toast.success('تم حفظ الملاحظات بنجاح');
                        setEditingNotes(false);
                      }
                    } catch {
                      toast.error('حدث خطأ أثناء الحفظ');
                    } finally {
                      setSavingNotes(false);
                    }
                  }}
                  disabled={savingNotes}
                  className="flex-1 h-9 rounded-xl text-xs font-medium bg-[#007AFF] text-white flex items-center justify-center gap-1 hover:bg-[#0055D4] transition-colors disabled:opacity-50"
                >
                  {savingNotes ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><CheckCircle className="w-3 h-3" /> حفظ</>}
                </button>
                <button
                  onClick={() => {
                    setNotesValue(client.notes || '');
                    setEditingNotes(false);
                  }}
                  disabled={savingNotes}
                  className="flex-1 h-9 rounded-xl text-xs font-medium bg-[#f2f2f7] text-gray-600 flex items-center justify-center gap-1 hover:bg-gray-200 transition-colors"
                >
                  <XCircle className="w-3 h-3" /> إلغاء
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-start gap-3 text-sm">
                <StickyNote className="w-4 h-4 text-gray-400 mt-0.5" />
                <span className="text-gray-600">{client.notes || 'لا توجد ملاحظات'}</span>
              </div>
              <button
                onClick={() => {
                  setNotesValue(client.notes || '');
                  setEditingNotes(true);
                }}
                className="mt-2 mr-7 text-[11px] text-[#007AFF] font-medium flex items-center gap-1 hover:underline"
              >
                <Pencil className="w-3 h-3" />
                تعديل الملاحظات
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Client Trust Badge */}
      <ClientTrustBadge clientId={selectedClientId!} />

      {/* Wallet */}
      <div className="mx-4 bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm card-hover-lift glass-card-enhanced dark-card-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className={`w-5 h-5 ${client.walletBalance >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'}`} />
            <span className="font-semibold text-sm">رصيد المحفظة</span>
          </div>
          <span className={`text-lg font-bold ${client.walletBalance >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
            {client.walletBalance.toLocaleString('ar-SA')} <SarIcon className="inline" />
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {client.walletBalance > 0
            ? 'رصيد إيجابي (للعميل)'
            : client.walletBalance < 0
            ? 'رصيد سلبي (على العميل)'
            : 'لا يوجد رصيد'}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mx-4 flex gap-3">
        <Button
          onClick={handleNewInvoice}
          className="flex-1 h-11 rounded-2xl bg-[#007AFF] text-white font-semibold text-sm touch-feedback water-ripple-button"
        >
          <Plus className="w-4 h-4 ml-1.5" />
          فاتورة جديدة
        </Button>
        <Button
          variant="outline"
          onClick={() => setReceiptDrawerOpen(true)}
          className="flex-1 h-11 rounded-2xl font-semibold text-sm border-[#34C759] text-[#34C759] hover:bg-[#34C759]/5 touch-feedback water-ripple-button"
        >
          <Wallet className="w-4 h-4 ml-1.5" />
          سند قبض
        </Button>
      </div>

      {/* Invoices */}
      <div className="mx-4 bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm overflow-hidden card-hover-lift dark-card-border">
        <div className="px-4 pt-4 pb-2">
          <h3 className="text-base font-bold">سجل الفواتير</h3>
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">لا توجد فواتير</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {invoices.map((inv) => (
              <div key={inv.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    inv.debtAmount > 0 ? 'bg-[#FF3B30]/10' : 'bg-[#34C759]/10'
                  }`}>
                    {inv.debtAmount > 0 ? (
                      <XCircle className="w-4 h-4 text-[#FF3B30]" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-[#34C759]" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{inv.quantity} كرتون × {inv.price.toLocaleString('ar-SA')}</p>
                    <div className="flex items-center gap-1 text-[11px] text-gray-400">
                      <Clock className="w-3 h-3" />
                      {formatDate(inv.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">{inv.finalTotal.toLocaleString('ar-SA')}</p>
                  {inv.debtAmount > 0 && (
                    <p className="text-[11px] text-[#FF3B30]">دين: {inv.debtAmount.toLocaleString('ar-SA')}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Receipts */}
      <div className="mx-4 bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm overflow-hidden card-hover-lift dark-card-border">
        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-[#34C759]" />
          <h3 className="text-base font-bold">سندات القبض</h3>
        </div>
        <ReceiptList clientId={selectedClientId!} />
      </div>

      {/* Payment Timeline */}
      <PaymentTimeline clientId={selectedClientId!} />

      {/* Call Log */}
      <div className="mx-4">
        <CallLog clientId={selectedClientId!} />
      </div>

      {/* Client Insights */}
      <ClientInsights clientId={selectedClientId!} />

      {/* Bottom Actions */}
      <div className="mx-4 flex gap-3 pb-6">
        <Button
          variant="outline"
          onClick={handleEditRequest}
          className="flex-1 h-11 rounded-2xl font-semibold text-sm border-[#007AFF] text-[#007AFF] hover:bg-[#007AFF]/5 touch-feedback water-ripple-button"
        >
          <Pencil className="w-4 h-4 ml-1.5" />
          طلب تعديل
        </Button>
        <Button
          variant="outline"
          onClick={handleDeleteRequest}
          className="flex-1 h-11 rounded-2xl font-semibold text-sm border-[#FF3B30] text-[#FF3B30] hover:bg-[#FF3B30]/5 touch-feedback water-ripple-button"
        >
          <Trash2 className="w-4 h-4 ml-1.5" />
          طلب حذف
        </Button>
      </div>

      {/* Receipt Form Drawer */}
      <ReceiptForm
        open={receiptDrawerOpen}
        onOpenChange={setReceiptDrawerOpen}
        onSuccess={handleReceiptSuccess}
      />
    </motion.div>
  );
}

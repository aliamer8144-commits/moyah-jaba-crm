'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, Users, Phone, Building2, Wallet, MapPin, X, FileText, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { SarIcon } from '@/components/shared/sar-icon';

const stagger = {
  animate: { transition: { staggerChildren: 0.05 } },
};
const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
};

interface ClientWithRep {
  id: string;
  repId: string;
  name: string;
  businessName: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  walletBalance: number;
  createdAt: string;
  rep?: { id: string; name: string };
}

interface InvoiceItem {
  id: string;
  quantity: number;
  price: number;
  finalTotal: number;
  debtAmount: number;
  createdAt: string;
  productSize: string;
}

export function AdminClients() {
  const { user } = useAppStore();
  const [clients, setClients] = useState<ClientWithRep[]>([]);
  const [reps, setReps] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRep, setFilterRep] = useState<string>('all');
  const [selectedClient, setSelectedClient] = useState<ClientWithRep | null>(null);
  const [clientInvoices, setClientInvoices] = useState<InvoiceItem[]>([]);

  const fetchClients = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ adminId: user.id });
      if (filterRep !== 'all') params.set('filterRepId', filterRep);
      const res = await fetch(`/api/clients?${params}`);
      if (res.ok) setClients(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user, filterRep]);

  const fetchReps = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/auth?adminId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setReps(data.map((r: { id: string; name: string }) => ({ id: r.id, name: r.name })));
      }
    } catch {
      // silent
    }
  }, [user]);

  useEffect(() => {
    fetchReps();
  }, [fetchReps]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const filtered = clients.filter(
    (c) =>
      !search ||
      c.name.includes(search) ||
      (c.businessName && c.businessName.includes(search)) ||
      (c.phone && c.phone.includes(search))
  );

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      toast.error({ description: 'لا توجد بيانات للتصدير' });
      return;
    }
    const BOM = '\uFEFF';
    const headers = ['الاسم', 'اسم المتجر', 'الهاتف', 'العنوان', 'الرصيد', 'المندوب', 'تاريخ التسجيل'];
    const rows = filtered.map((c) => [
      c.name,
      c.businessName || '-',
      c.phone || '-',
      c.address || '-',
      String(c.walletBalance),
      c.rep?.name || '-',
      new Date(c.createdAt).toLocaleDateString('ar-SA', {
        year: 'numeric', month: 'long', day: 'numeric',
      }),
    ]);
    const csvContent = BOM + [headers, ...rows].map((r) => r.map((col) => `"${col}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `clients_${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success({ description: `تم تصدير ${filtered.length} عميل بنجاح ✅` });
  };

  const handleSelectClient = async (client: ClientWithRep) => {
    setSelectedClient(client);
    try {
      const res = await fetch(`/api/invoices?clientId=${client.id}`);
      if (res.ok) setClientInvoices(await res.json());
    } catch {
      setClientInvoices([]);
    }
  };

  if (selectedClient) {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedClient(null)} className="p-2 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold">تفاصيل العميل</h2>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#007AFF] to-[#0055D4] flex items-center justify-center">
              <span className="text-white font-bold text-xl">{selectedClient.name.charAt(0)}</span>
            </div>
            <div>
              <h3 className="text-lg font-bold">{selectedClient.name}</h3>
              {selectedClient.rep && (
                <p className="text-xs text-gray-500">مندوب: {selectedClient.rep.name}</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {selectedClient.businessName && (
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span>{selectedClient.businessName}</span>
              </div>
            )}
            {selectedClient.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-gray-400" />
                <span dir="ltr">{selectedClient.phone}</span>
              </div>
            )}
            {selectedClient.address && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>{selectedClient.address}</span>
              </div>
            )}
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className={`w-4 h-4 ${selectedClient.walletBalance >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'}`} />
                <span className="text-sm font-medium">رصيد المحفظة</span>
              </div>
              <span className={`font-bold ${selectedClient.walletBalance >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'} flex items-center gap-0.5`}>
                {selectedClient.walletBalance.toLocaleString('ar-SA')} <SarIcon size={14} className={selectedClient.walletBalance >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'} />
              </span>
            </div>
          </div>
        </div>

        {/* Client Invoices */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-base font-bold flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#007AFF]" />
              سجل الفواتير ({clientInvoices.length})
            </h3>
          </div>
          {clientInvoices.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">لا توجد فواتير</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {clientInvoices.map((inv) => (
                <div key={inv.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{inv.quantity} كرتون × {inv.price.toLocaleString('ar-SA')}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(inv.createdAt).toLocaleDateString('ar-SA')}
                      {inv.productSize !== 'عادي' && ` - ${inv.productSize}`}
                    </p>
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
      </motion.div>
    );
  }

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-4">
      <motion.div variants={fadeUp}>
        <h2 className="text-lg font-bold mb-3">إدارة العملاء</h2>

        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو الهاتف..." className="bg-white rounded-xl border-0 pr-10 h-10 shadow-sm" />
          </div>
          <Select value={filterRep} onValueChange={setFilterRep}>
            <SelectTrigger className="w-[140px] bg-white rounded-xl border-0 shadow-sm h-10">
              <SelectValue placeholder="المناديب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              {reps.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="h-10 px-3 rounded-xl shrink-0 border-0 bg-white shadow-sm text-[#34C759] hover:bg-[#34C759]/5 font-semibold text-sm gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">تصدير</span>
          </Button>
        </div>

        {/* Total Clients Counter */}
        {!loading && clients.length > 0 && (
          <div className="bg-white rounded-2xl p-3 shadow-sm mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#007AFF]" />
                <span className="text-sm font-medium text-gray-600">إجمالي العملاء</span>
              </div>
              <span className="text-sm font-bold text-[#1c1c1e]">{clients.length}</span>
            </div>
          </div>
        )}
      </motion.div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-gray-400">
          <Users className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-medium">لا يوجد عملاء</p>
        </div>
      ) : (
        <motion.div variants={fadeUp}>
          <p className="text-xs text-gray-500 mb-2">{filtered.length} عميل</p>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 max-h-[calc(100vh-200px)] overflow-y-auto pb-2">
            {filtered.map((client) => (
              <motion.div
                key={client.id}
                layout
                onClick={() => handleSelectClient(client)}
                className="bg-white rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#007AFF] to-[#0055D4] flex items-center justify-center shrink-0">
                    <span className="text-white font-bold text-sm">{client.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{client.name}</h3>
                    {client.rep && (
                      <p className="text-xs text-gray-500">{client.rep.name}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  {client.businessName && (
                    <span className="text-xs text-gray-500 truncate">{client.businessName}</span>
                  )}
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${
                    client.walletBalance >= 0 ? 'bg-[#34C759]/10 text-[#34C759]' : 'bg-[#FF3B30]/10 text-[#FF3B30]'
                  }`}>
                    {client.walletBalance.toLocaleString('ar-SA')}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

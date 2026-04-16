'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Plus, MoreVertical, User, Phone, Building2, Wallet, Pencil, Trash2, Users, FileText, UserPlus, Tag, Clock, X, Loader2 } from 'lucide-react';

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

const stagger = {
  animate: { transition: { staggerChildren: 0.05 } },
};
const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
};

const CLIENT_CATEGORIES = [
  { label: 'الكل', value: '', color: '#007AFF' },
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
  if (!cat) return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' };
  return {
    bg: `${cat.color}15`,
    text: cat.color,
    color: cat.color,
  };
}

function ClientSkeletonCard() {
  return (
    <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm shimmer-skeleton dark-card-border">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 flex-1">
          <Skeleton className="w-11 h-11 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-28 rounded-lg" />
            <Skeleton className="h-3 w-36 rounded-lg" />
            <Skeleton className="h-3 w-24 rounded-lg" />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-6 w-14 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

const RECENT_SEARCHES_KEY = 'jaba-recent-searches';
const MAX_RECENT_SEARCHES = 5;

function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentSearches(searches: string[]) {
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
  } catch {
    // silent
  }
}

export function ClientList() {
  const { user, clients, setClients, setSelectedClientId, setRequestDialogOpen, setRequestEntityType, setRequestActionType, setRequestEntityId, setRepTab, invoices, repTab } = useAppStore();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Quick-add dialog state
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickForm, setQuickForm] = useState({ name: '', phone: '', businessName: '', address: '', category: '', customCategory: '', notes: '' });
  const [quickSubmitting, setQuickSubmitting] = useState(false);
  const [quickErrors, setQuickErrors] = useState<Record<string, string>>({});

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // Debounce search
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [search]);

  const fetchClients = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/clients?repId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user, setClients]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Compute total spent per client from invoices
  const clientTotalSpent = useCallback((clientId: string) => {
    return invoices
      .filter((inv) => inv.clientId === clientId)
      .reduce((sum, inv) => sum + inv.finalTotal, 0);
  }, [invoices]);

  const filtered = clients.filter(
    (c) =>
      (c.name.includes(debouncedSearch) ||
      (c.businessName && c.businessName.includes(debouncedSearch)) ||
      (c.phone && c.phone.includes(debouncedSearch))) &&
      (!activeCategory || c.category === activeCategory)
  );

  const handleSearch = (value: string) => {
    setSearch(value);
  };

  const handleSearchBlur = () => {
    setSearchFocused(false);
    // Save to recent searches
    if (search.trim()) {
      const existing = getRecentSearches().filter((s) => s !== search.trim());
      const updated = [search.trim(), ...existing].slice(0, MAX_RECENT_SEARCHES);
      saveRecentSearches(updated);
      setRecentSearches(updated);
    }
  };

  const handleRecentSearchClick = (term: string) => {
    setSearch(term);
    setDebouncedSearch(term);
  };

  const handleClearRecentSearches = () => {
    saveRecentSearches([]);
    setRecentSearches([]);
  };

  const handleEditRequest = (clientId: string) => {
    setRequestEntityType('client');
    setRequestActionType('edit');
    setRequestEntityId(clientId);
    setRequestDialogOpen(true);
  };

  const handleDeleteRequest = (clientId: string) => {
    setRequestEntityType('client');
    setRequestActionType('delete');
    setRequestEntityId(clientId);
    setRequestDialogOpen(true);
  };

  const openNewInvoice = (clientId: string) => {
    setSelectedClientId(clientId);
    setRepTab('create-invoice');
  };

  // Quick-add client handler
  const handleQuickAddSubmit = async () => {
    const errors: Record<string, string> = {};
    if (!quickForm.name.trim()) errors.name = 'اسم العميل مطلوب';
    if (!quickForm.phone.trim()) errors.phone = 'رقم الهاتف مطلوب';
    if (!quickForm.businessName.trim()) errors.businessName = 'اسم المنشأة مطلوب';
    if (!quickForm.address.trim()) errors.address = 'العنوان مطلوب';
    if (!quickForm.category) errors.category = 'فئة العميل مطلوبة';
    if (quickForm.category === 'أخرى' && !quickForm.customCategory.trim()) errors.customCategory = 'اسم الفئة مطلوب';
    if (Object.keys(errors).length > 0) {
      setQuickErrors(errors);
      return;
    }
    if (!user) return;

    setQuickSubmitting(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repId: user.id,
          name: quickForm.name.trim(),
          phone: quickForm.phone.trim(),
          businessName: quickForm.businessName.trim() || null,
          address: quickForm.address.trim() || null,
          category: quickForm.category === 'أخرى' ? quickForm.customCategory.trim() : (quickForm.category || null),
          notes: quickForm.notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'حدث خطأ');
      toast.success('تم إضافة العميل بنجاح ✅');
      setQuickAddOpen(false);
      setQuickForm({ name: '', phone: '', businessName: '', address: '', category: '', customCategory: '', notes: '' });
      setQuickErrors({});
      fetchClients();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ أثناء إضافة العميل');
    } finally {
      setQuickSubmitting(false);
    }
  };

  const handleQuickAddClose = () => {
    setQuickAddOpen(false);
    setQuickForm({ name: '', phone: '', businessName: '', address: '', category: '', customCategory: '', notes: '' });
    setQuickErrors({});
  };

  // Get accent bar color based on wallet balance
  const getAccentColor = (balance: number) => {
    if (balance >= 0) return '#34C759'; // positive = green
    return '#FF3B30'; // negative = red
  };

  // Show the FAB only when on clients tab
  const showFab = repTab === 'clients';

  const formCategories = CLIENT_CATEGORIES.filter((c) => c.value !== '');

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="p-4 space-y-4">
      {/* Search with Focus Animation */}
      <motion.div variants={fadeUp} className="flex gap-2">
        <div className="relative flex-1 glass-card-enhanced rounded-xl">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-colors duration-300" />
          <motion.div animate={searchFocused ? { scale: 1.01 } : { scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}>
            <Input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={handleSearchBlur}
              placeholder="بحث عن عميل..."
              className={`bg-white dark:bg-[#1c1c1e] rounded-xl border-0 pr-10 h-11 shadow-sm transition-all duration-300 ${
                searchFocused
                  ? 'ring-2 ring-[#007AFF]/30 shadow-[0_0_16px_rgba(0,122,255,0.08)]'
                  : ''
              }`}
            />
          </motion.div>

          {/* Recent Searches Dropdown */}
          <AnimatePresence>
            {searchFocused && !search && recentSearches.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full left-0 right-0 mt-1 z-50 mx-4 bg-white dark:bg-[#1c1c1e] rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500">عمليات البحث الأخيرة</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleClearRecentSearches(); }}
                    className="text-[10px] text-[#FF3B30] font-medium hover:underline flex items-center gap-0.5"
                  >
                    <X className="w-3 h-3" />
                    مسح
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {recentSearches.map((term) => (
                    <button
                      key={term}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleRecentSearchClick(term)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Clock className="w-3 h-3 text-gray-400" />
                      {term}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <Button
          onClick={() => setQuickAddOpen(true)}
          className="h-11 w-11 rounded-xl bg-[#007AFF] text-white p-0 shrink-0 shadow-md shadow-[#007AFF]/20 hover-lift press-scale"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </motion.div>

      {/* Category Filter Pills */}
      <motion.div variants={fadeUp} className="relative">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {CLIENT_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.value;
            return (
              <motion.button
                key={cat.value}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveCategory(isActive ? '' : cat.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 shrink-0 border ${
                  isActive
                    ? 'border-transparent text-white shadow-sm'
                    : 'bg-white dark:bg-[#1c1c1e] border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                }`}
                style={isActive ? { backgroundColor: cat.color, boxShadow: `0 2px 8px ${cat.color}30` } : {}}
              >
                <Tag className="w-3 h-3" />
                {cat.label}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Results count */}
      {(debouncedSearch || activeCategory) && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-gray-500">
          عدد النتائج: {filtered.length}
        </motion.p>
      )}

      {/* Client List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <ClientSkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Building2 className="w-8 h-8 text-[#007AFF]/50" />
          </div>
          <p className="font-medium text-gray-600 dark:text-gray-300 text-base">
            {debouncedSearch || activeCategory ? 'لا توجد نتائج' : 'لا يوجد عملاء بعد'}
          </p>
          <p className="empty-state-text mt-1">
            {!debouncedSearch && !activeCategory ? 'ابدأ بإضافة عملائك لإدارة فواتيرهم' : 'حاول تغيير معايير البحث أو الفئة'}
          </p>
          {!debouncedSearch && !activeCategory && (
            <Button
              onClick={() => setQuickAddOpen(true)}
              className="mt-4 h-11 px-6 rounded-2xl bg-[#007AFF] text-white font-semibold gap-2"
            >
              <UserPlus className="w-4 h-4" />
              أضف عميلك الأول
            </Button>
          )}
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-2">
            {filtered.map((client, index) => {
              const totalSpent = clientTotalSpent(client.id);
              const accentColor = getAccentColor(client.walletBalance);
              const catStyle = client.category ? getCategoryStyle(client.category) : null;

              return (
                <motion.div
                  key={client.id}
                  variants={fadeUp}
                  layout
                  initial="initial"
                  animate="animate"
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 25,
                    delay: index * 0.03,
                  }}
                  onClick={() => setSelectedClientId(client.id)}
                  whileHover={{ y: -2, boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm cursor-pointer transition-shadow duration-200 hover:shadow-md overflow-hidden relative card-hover-lift dark-card-border touch-feedback"
                >
                  {/* Left-side 3px colored accent bar based on wallet balance */}
                  <div
                    className="absolute top-2 bottom-2 left-0 w-[3px] rounded-full"
                    style={{ backgroundColor: accentColor }}
                  />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center shrink-0 shadow-sm shadow-[#007AFF]/15">
                        <span className="text-white font-bold text-sm">
                          {client.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-[#1c1c1e] dark:text-white leading-relaxed">{client.name}</h3>
                        <div className={`inline-flex items-center mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-medium ${
                          client.walletBalance > 0
                            ? 'bg-[#34C759]/10 text-[#34C759]'
                            : client.walletBalance < 0
                              ? 'bg-[#FF3B30]/10 text-[#FF3B30]'
                              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          <Wallet className="w-2.5 h-2.5 ml-0.5" />
                          {client.walletBalance > 0 ? 'الرصيد له' : client.walletBalance < 0 ? 'الرصيد عليه' : 'الرصيد'}
                          <span className="font-semibold mx-0.5">{Math.abs(client.walletBalance).toLocaleString('ar-SA')}</span>
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 rounded-xl">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            openNewInvoice(client.id);
                          }}
                          className="rounded-lg"
                        >
                          <FileText className="w-4 h-4 ml-2" />
                          فاتورة جديدة
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditRequest(client.id);
                          }}
                          className="rounded-lg"
                        >
                          <Pencil className="w-4 h-4 ml-2" />
                          طلب تعديل
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRequest(client.id);
                          }}
                          className="rounded-lg text-[#FF3B30] focus:text-[#FF3B30]"
                        >
                          <Trash2 className="w-4 h-4 ml-2" />
                          طلب حذف
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Info row: business name, category, phone, contact buttons */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex-1 min-w-0 space-y-0.5">
                      {client.businessName && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Building2 className="w-3 h-3 shrink-0" />
                          <span className="truncate">{client.businessName}</span>
                          {catStyle && (
                            <span
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded-md shrink-0"
                              style={{ backgroundColor: `${catStyle.color}15`, color: catStyle.color }}
                            >
                              {client.category}
                            </span>
                          )}
                        </div>
                      )}
                      {!client.businessName && catStyle && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <span
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded-md shrink-0"
                            style={{ backgroundColor: `${catStyle.color}15`, color: catStyle.color }}
                          >
                            {client.category}
                          </span>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Phone className="w-3 h-3 shrink-0" />
                          {client.phone}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {client.phone && (
                        <>
                          <a
                            href={`tel:${client.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="w-8 h-8 rounded-full bg-[#34C759] flex items-center justify-center shadow-sm shadow-[#34C759]/20 hover:bg-[#2DB84D] transition-colors active:scale-95"
                          >
                            <Phone className="w-3.5 h-3.5 text-white" />
                          </a>
                          <a
                            href={`https://wa.me/${client.phone.replace(/[^0-9+]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center shadow-sm shadow-[#25D366]/20 hover:bg-[#1EBE5A] transition-colors active:scale-95"
                          >
                            <WhatsAppIcon className="w-4 h-4 text-white" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}

      {/* Floating Quick-Add Button (bottom-right, above bottom nav) */}
      <AnimatePresence>
        {showFab && (
          <motion.div
            initial={{ opacity: 0, scale: 0, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="fixed right-4 bottom-24 z-50"
          >
            {/* Pulse ring */}
            <motion.div
              animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full bg-[#AF52DE]/30"
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => setQuickAddOpen(true)}
              className="relative w-12 h-12 rounded-full flex items-center justify-center shadow-xl"
              style={{
                background: 'linear-gradient(135deg, #AF52DE, #5856D6)',
                boxShadow: '0 4px 20px rgba(175,82,222,0.4), 0 0 30px rgba(88,86,214,0.1)',
              }}
            >
              <UserPlus className="w-5 h-5 text-white" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Client Dialog */}
      <Dialog open={quickAddOpen} onOpenChange={(o) => { if (!o) handleQuickAddClose(); else setQuickAddOpen(true); }}>
        <DialogContent
          className="rounded-2xl max-w-sm mx-auto bg-white dark:bg-[#1c1c1e] dark:border-gray-700 flex flex-col max-h-[90vh]"
          dir="rtl"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2 dark:text-white">
              <UserPlus className="w-5 h-5 text-[#AF52DE]" />
              إضافة عميل جديد
            </DialogTitle>
            <DialogDescription className="text-right text-gray-500 dark:text-gray-400">
              أضف عميل جديد بالمعلومات المطلوبة
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2 overflow-y-auto flex-1 min-h-0">
            {/* Name */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                اسم العميل <span className="text-[#FF3B30]">*</span>
              </label>
              <Input
                value={quickForm.name}
                onChange={(e) => setQuickForm({ ...quickForm, name: e.target.value })}
                placeholder="اسم العميل"
                className={`bg-[#f2f2f7] dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 rounded-xl border-0 h-10 text-sm ${
                  quickErrors.name ? 'ring-2 ring-[#FF3B30]/30' : 'focus:ring-2 ring-[#AF52DE]/20'
                }`}
              />
              {quickErrors.name && <p className="text-[10px] text-[#FF3B30]">{quickErrors.name}</p>}
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                رقم الهاتف <span className="text-[#FF3B30]">*</span>
              </label>
              <Input
                value={quickForm.phone}
                onChange={(e) => setQuickForm({ ...quickForm, phone: e.target.value })}
                placeholder="05xxxxxxxx"
                type="tel"
                className={`bg-[#f2f2f7] dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 rounded-xl border-0 h-10 text-sm ${
                  quickErrors.phone ? 'ring-2 ring-[#FF3B30]/30' : 'focus:ring-2 ring-[#AF52DE]/20'
                }`}
              />
              {quickErrors.phone && <p className="text-[10px] text-[#FF3B30]">{quickErrors.phone}</p>}
            </div>

            {/* Business Name */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                اسم المنشأة <span className="text-[#FF3B30]">*</span>
              </label>
              <Input
                value={quickForm.businessName}
                onChange={(e) => setQuickForm({ ...quickForm, businessName: e.target.value })}
                placeholder="اسم المتجر أو الشركة"
                className={`bg-[#f2f2f7] dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 rounded-xl border-0 h-10 text-sm ${
                  quickErrors.businessName ? 'ring-2 ring-[#FF3B30]/30' : 'focus:ring-2 ring-[#AF52DE]/20'
                }`}
              />
              {quickErrors.businessName && <p className="text-[10px] text-[#FF3B30]">{quickErrors.businessName}</p>}
            </div>

            {/* Address */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                العنوان <span className="text-[#FF3B30]">*</span>
              </label>
              <Input
                value={quickForm.address}
                onChange={(e) => setQuickForm({ ...quickForm, address: e.target.value })}
                placeholder="عنوان العميل"
                className={`bg-[#f2f2f7] dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 rounded-xl border-0 h-10 text-sm ${
                  quickErrors.address ? 'ring-2 ring-[#FF3B30]/30' : 'focus:ring-2 ring-[#AF52DE]/20'
                }`}
              />
              {quickErrors.address && <p className="text-[10px] text-[#FF3B30]">{quickErrors.address}</p>}
            </div>

            {/* Category Dropdown + Custom Category */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                فئة العميل <span className="text-[#FF3B30]">*</span>
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select
                    value={quickForm.category}
                    onValueChange={(v) => setQuickForm({ ...quickForm, category: v, customCategory: '' })}
                  >
                    <SelectTrigger className={`w-full bg-[#f2f2f7] dark:bg-gray-800 dark:text-white rounded-xl border-0 h-10 text-sm ${
                      quickErrors.category ? 'ring-2 ring-[#FF3B30]/30' : 'focus:ring-2 ring-[#AF52DE]/20'
                    }`}>
                      <SelectValue placeholder="اختر الفئة..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {formCategories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value} className="rounded-lg">
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {quickForm.category === 'أخرى' && (
                  <div className="flex-1">
                    <Input
                      value={quickForm.customCategory}
                      onChange={(e) => setQuickForm({ ...quickForm, customCategory: e.target.value })}
                      placeholder="اسم الفئة"
                      className={`bg-[#f2f2f7] dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 rounded-xl border-0 h-10 text-sm ${
                        quickErrors.customCategory ? 'ring-2 ring-[#FF3B30]/30' : 'focus:ring-2 ring-[#AF52DE]/20'
                      }`}
                    />
                  </div>
                )}
              </div>
              {quickErrors.category && <p className="text-[10px] text-[#FF3B30]">{quickErrors.category}</p>}
              {quickErrors.customCategory && <p className="text-[10px] text-[#FF3B30]">{quickErrors.customCategory}</p>}
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                ملاحظات
                <span className="text-gray-400 font-normal mr-1 text-[10px]">(اختياري)</span>
              </label>
              <textarea
                value={quickForm.notes}
                onChange={(e) => setQuickForm({ ...quickForm, notes: e.target.value })}
                placeholder="أي ملاحظات إضافية..."
                className="w-full bg-[#f2f2f7] dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 rounded-xl border-0 focus:ring-2 ring-[#AF52DE]/20 p-3 text-sm resize-none min-h-[60px]"
              />
            </div>
          </div>

          <DialogFooter className="flex-row gap-2 pt-3 mt-3 border-t border-gray-100 dark:border-gray-700 shrink-0">
            <Button
              variant="outline"
              onClick={handleQuickAddClose}
              className="flex-1 h-10 rounded-xl border-gray-200 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleQuickAddSubmit}
              disabled={quickSubmitting}
              className="flex-1 h-10 rounded-xl text-white font-semibold"
              style={{
                background: 'linear-gradient(135deg, #AF52DE, #5856D6)',
              }}
            >
              {quickSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4 ml-1.5" />
                  إضافة
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}


'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Package,
  Droplets,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
} from 'lucide-react';
import { SarIcon } from '@/components/shared/sar-icon';

interface ProductItem {
  id: string;
  name: string;
  size: string;
  price: number;
  isActive: boolean;
  createdAt: string;
}

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
};

function ProductSkeletonCard() {
  return (
    <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 rounded-lg" />
            <Skeleton className="h-3 w-20 rounded-lg" />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-20 rounded-lg" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
  );
}

export function AdminProducts() {
  const { user } = useAppStore();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/products?adminId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filtered = products.filter(
    (p) =>
      p.name.includes(search) ||
      p.size.includes(search)
  );

  const handleToggleActive = async (product: ProductItem) => {
    try {
      const res = await fetch(`/api/products?productId=${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user?.id, isActive: !product.isActive }),
      });
      if (res.ok) {
        toast.success(product.isActive ? 'تم تعطيل المنتج' : 'تم تفعيل المنتج');
        fetchProducts();
      }
    } catch {
      toast.error('حدث خطأ أثناء التحديث');
    }
  };

  const handleDelete = async (productId: string) => {
    try {
      const res = await fetch(`/api/products?productId=${productId}&adminId=${user?.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('تم حذف المنتج بنجاح');
        setDeleteConfirm(null);
        fetchProducts();
      }
    } catch {
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  const activeCount = products.filter((p) => p.isActive).length;
  const inactiveCount = products.length - activeCount;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-3 gap-3">
        <motion.div variants={fadeUp} className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm text-center">
          <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <p className="text-2xl font-bold text-[#1c1c1e] dark:text-white">{products.length}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">إجمالي المنتجات</p>
        </motion.div>
        <motion.div variants={fadeUp} className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm text-center">
          <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-gradient-to-br from-[#34C759] to-[#28A745] flex items-center justify-center">
            <ToggleRight className="w-5 h-5 text-white" />
          </div>
          <p className="text-2xl font-bold text-[#34C759]">{activeCount}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">مفعّل</p>
        </motion.div>
        <motion.div variants={fadeUp} className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-sm text-center">
          <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-gradient-to-br from-[#8E8E93] to-[#636366] flex items-center justify-center">
            <ToggleLeft className="w-5 h-5 text-white" />
          </div>
          <p className="text-2xl font-bold text-[#8E8E93]">{inactiveCount}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">معطّل</p>
        </motion.div>
      </motion.div>

      {/* Search + Add */}
      <motion.div variants={fadeUp} initial="initial" animate="animate" className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث عن منتج..."
            className="bg-white dark:bg-[#1c1c1e] rounded-xl border-0 pr-10 h-11 shadow-sm focus:ring-2 ring-[#007AFF]/20"
          />
        </div>
        <Button
          onClick={() => {
            setEditingProduct(null);
            setDrawerOpen(true);
          }}
          className="h-11 px-4 rounded-xl bg-[#007AFF] text-white font-medium gap-2 shadow-md shadow-[#007AFF]/20 hover-lift press-scale"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">إضافة منتج</span>
        </Button>
      </motion.div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <ProductSkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <Package className="w-10 h-10 opacity-40" />
          </div>
          <p className="font-medium text-gray-600 text-base">
            {search ? 'لا توجد نتائج للبحث' : 'لا توجد منتجات بعد'}
          </p>
          {!search && (
            <p className="text-sm mt-1 text-gray-400">ابدأ بإضافة منتجاتك</p>
          )}
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((product) => (
              <motion.div
                key={product.id}
                variants={fadeUp}
                layout
                initial="initial"
                animate="animate"
                exit={{ opacity: 0, scale: 0.95 }}
                whileHover={{ y: -2, boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={`bg-white dark:bg-[#1c1c1e] rounded-2xl p-5 shadow-sm transition-all duration-200 hover:shadow-md relative overflow-hidden ${
                  !product.isActive ? 'opacity-60' : ''
                }`}
              >
                {/* Top gradient accent */}
                <div
                  className="absolute top-0 right-0 left-0 h-1 rounded-t-2xl"
                  style={{
                    background: product.isActive
                      ? 'linear-gradient(to left, #007AFF, #5856D6)'
                      : 'linear-gradient(to left, #8E8E93, #636366)',
                  }}
                />

                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      product.isActive
                        ? 'bg-gradient-to-br from-[#007AFF]/10 to-[#5856D6]/10'
                        : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                      <Droplets className={`w-6 h-6 ${
                        product.isActive ? 'text-[#007AFF]' : 'text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-[#1c1c1e] dark:text-white">{product.name}</h3>
                      <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded-md mt-0.5">
                        <Package className="w-3 h-3" />
                        {product.size}
                      </span>
                    </div>
                  </div>

                  {/* Toggle */}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleToggleActive(product)}
                    className="p-1"
                  >
                    {product.isActive ? (
                      <ToggleRight className="w-7 h-7 text-[#34C759]" />
                    ) : (
                      <ToggleLeft className="w-7 h-7 text-[#8E8E93]" />
                    )}
                  </motion.button>
                </div>

                {/* Price */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4 text-[#34C759]" />
                    <span className="text-lg font-bold text-[#34C759]">{product.price.toLocaleString('ar-SA')}</span>
                    <SarIcon size={12} className="text-gray-400" />
                  </div>

                  <div className="flex items-center gap-1">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        setEditingProduct(product);
                        setDrawerOpen(true);
                      }}
                      className="w-8 h-8 rounded-full bg-[#007AFF]/10 flex items-center justify-center hover:bg-[#007AFF]/20 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5 text-[#007AFF]" />
                    </motion.button>

                    {/* Delete with confirmation */}
                    {deleteConfirm === product.id ? (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex items-center gap-1"
                      >
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="w-8 h-8 rounded-full bg-[#FF3B30] flex items-center justify-center text-white"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center"
                        >
                          <svg className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </motion.div>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setDeleteConfirm(product.id)}
                        className="w-8 h-8 rounded-full bg-[#FF3B30]/10 flex items-center justify-center hover:bg-[#FF3B30]/20 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-[#FF3B30]" />
                      </motion.button>
                    )}
                  </div>
                </div>

                {/* Inactive label */}
                {!product.isActive && (
                  <div className="absolute top-3 left-3">
                    <span className="text-[10px] font-medium bg-[#8E8E93]/10 text-[#8E8E93] px-2 py-0.5 rounded-md">
                      معطّل
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Add/Edit Product Drawer */}
      <ProductFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onSaved={fetchProducts}
        editingProduct={editingProduct}
        adminId={user?.id || ''}
      />
    </div>
  );
}

function ProductFormDrawer({
  open,
  onOpenChange,
  onSaved,
  editingProduct,
  adminId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
  editingProduct: ProductItem | null;
  adminId: string;
}) {
  const isEditing = !!editingProduct;
  const [form, setForm] = useState({
    name: editingProduct?.name || '',
    size: editingProduct?.size || '',
    price: editingProduct?.price?.toString() || '',
    isActive: editingProduct?.isActive ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setForm({
        name: editingProduct?.name || '',
        size: editingProduct?.size || '',
        price: editingProduct?.price?.toString() || '',
        isActive: editingProduct?.isActive ?? true,
      });
      setErrors({});
    }
  }, [open, editingProduct]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'اسم المنتج مطلوب';
    if (!form.size.trim()) e.size = 'حجم المنتج مطلوب';
    if (!form.price || isNaN(parseFloat(form.price)) || parseFloat(form.price) < 0) e.price = 'السعر مطلوب ويجب أن يكون رقماً صحيحاً';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const url = isEditing
        ? `/api/products?productId=${editingProduct.id}`
        : '/api/products';
      const method = isEditing ? 'PUT' : 'POST';
      const body = {
        adminId,
        name: form.name.trim(),
        size: form.size.trim(),
        price: parseFloat(form.price),
        isActive: form.isActive,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'حدث خطأ');
      toast.success(isEditing ? 'تم تحديث المنتج بنجاح ✅' : 'تم إضافة المنتج بنجاح ✅');
      handleClose();
      onSaved();
    } catch (err) {
      toast.error({
        description: err instanceof Error ? err.message : 'حدث خطأ',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) handleClose(); else onOpenChange(true); }}>
      <DrawerContent className="max-h-[80vh] rounded-t-2xl">
        <DrawerHeader className="border-b border-gray-100 dark:border-gray-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center shadow-sm shadow-[#007AFF]/20">
              <Package className="w-5 h-5 text-white" />
            </div>
            <DrawerTitle className="text-lg font-bold">
              {isEditing ? 'تعديل المنتج' : 'إضافة منتج جديد'}
            </DrawerTitle>
          </div>
        </DrawerHeader>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[55vh]">
          {/* Product Name */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              اسم المنتج
              <span className="text-[#FF3B30] mr-1">*</span>
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="مثال: مياه جبأ 18 لتر"
              className={`bg-[#f2f2f7] dark:bg-gray-800 rounded-xl border-0 h-11 text-sm ${
                errors.name ? 'ring-2 ring-[#FF3B30]/30' : 'focus:ring-2 ring-[#007AFF]/20'
              }`}
            />
            {errors.name && <p className="text-xs text-[#FF3B30]">{errors.name}</p>}
          </div>

          {/* Size */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              الحجم
              <span className="text-[#FF3B30] mr-1">*</span>
            </label>
            <Input
              value={form.size}
              onChange={(e) => setForm({ ...form, size: e.target.value })}
              placeholder="مثال: 18 لتر"
              className={`bg-[#f2f2f7] dark:bg-gray-800 rounded-xl border-0 h-11 text-sm ${
                errors.size ? 'ring-2 ring-[#FF3B30]/30' : 'focus:ring-2 ring-[#007AFF]/20'
              }`}
            />
            {errors.size && <p className="text-xs text-[#FF3B30]">{errors.size}</p>}
          </div>

          {/* Price */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              السعر (<SarIcon size={12} className="text-gray-500" />)
              <span className="text-[#FF3B30] mr-1">*</span>
            </label>
            <div className="relative">
              <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0.00"
                className={`bg-[#f2f2f7] dark:bg-gray-800 rounded-xl border-0 h-11 text-sm pr-10 ${
                  errors.price ? 'ring-2 ring-[#FF3B30]/30' : 'focus:ring-2 ring-[#007AFF]/20'
                }`}
              />
            </div>
            {errors.price && <p className="text-xs text-[#FF3B30]">{errors.price}</p>}
          </div>

          {/* Active Toggle */}
          {isEditing && (
            <div className="flex items-center justify-between p-3 bg-[#f2f2f7] dark:bg-gray-800 rounded-xl">
              <div className="flex items-center gap-2">
                <ToggleRight className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">حالة المنتج</span>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setForm({ ...form, isActive: !form.isActive })}
                className="relative w-12 h-7 rounded-full transition-colors duration-200"
                style={{ backgroundColor: form.isActive ? '#34C759' : '#D1D5DB' }}
              >
                <motion.div
                  className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm"
                  animate={{ left: form.isActive ? 4 : 24 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
                <span className="absolute top-0.5 text-[10px] font-medium text-white" style={{ right: form.isActive ? 8 : 'auto', left: form.isActive ? 'auto' : 8 }}>
                  {form.isActive ? 'مفعّل' : 'معطّل'}
                </span>
              </motion.button>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-gray-800 safe-bottom">
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-12 rounded-2xl bg-[#007AFF] text-white font-semibold text-base"
          >
            {loading
              ? 'جارٍ الحفظ...'
              : isEditing
              ? 'تحديث المنتج'
              : 'إضافة المنتج'}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

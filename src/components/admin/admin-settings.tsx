'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Settings,
  Package,
  Loader2,
  Save,
  Info,
  UserCircle,
  Palette,
  Bell,
  Shield,
  Code2,
  Calendar,
} from 'lucide-react';

const stagger = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
};

export function AdminSettings() {
  const { user, sizeVariationsEnabled, setSizeVariationsEnabled } = useAppStore();
  const [sizeVariations, setSizeVariations] = useState(sizeVariationsEnabled);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          const sv = data.sizeVariationsEnabled === 'true';
          setSizeVariations(sv);
          setSizeVariationsEnabled(sv);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [setSizeVariationsEnabled]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: user.id,
          settings: {
            sizeVariationsEnabled: sizeVariations,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'حدث خطأ');
      setSizeVariationsEnabled(sizeVariations);
      toast.success('تم حفظ الإعدادات بنجاح');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  const todayDate = new Date().toLocaleDateString('ar-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (loading) {
    return (
      <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </motion.div>
    );
  }

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-4">
      <motion.h2 variants={fadeUp} className="text-lg font-bold">
        الإعدادات
      </motion.h2>

      {/* Profile Settings Card */}
      <motion.div
        variants={fadeUp}
        className="bg-white rounded-2xl p-5 shadow-sm"
      >
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-[#007AFF]/10 flex items-center justify-center shrink-0">
            <UserCircle className="w-5.5 h-5.5 text-[#007AFF]" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold mb-1">الملف الشخصي</h3>
            <p className="text-xs text-gray-500 mb-3">معلومات الحساب الأساسية</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">الاسم</span>
                <span className="text-sm font-medium">{user?.name}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">اسم المستخدم</span>
                <span className="text-sm font-medium">{user?.username}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-500">الدور</span>
                <span className="text-xs font-medium bg-[#007AFF]/10 text-[#007AFF] px-2.5 py-1 rounded-lg">
                  مدير النظام
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Product Size Settings Card */}
      <motion.div
        variants={fadeUp}
        className="bg-white rounded-2xl p-5 shadow-sm"
      >
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-[#FF9500]/10 flex items-center justify-center shrink-0">
            <Package className="w-5.5 h-5.5 text-[#FF9500]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-base font-bold">أحجام المنتجات</h3>
                <p className="text-xs text-gray-500 mt-0.5">تفعيل أحجام مختلفة للمنتج</p>
              </div>
              <Switch
                checked={sizeVariations}
                onCheckedChange={setSizeVariations}
                className="scale-110"
              />
            </div>

            <div className="bg-[#f2f2f7] rounded-xl p-3 mt-3">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-[#007AFF] mt-0.5 shrink-0" />
                <div className="text-xs text-gray-600 space-y-1">
                  <p>
                    {sizeVariations
                      ? 'عند التفعيل، سيتمكن المناديب من اختيار حجم المنتج عند إنشاء فاتورة:'
                      : 'حالياً، يتم استخدام الحجم الافتراضي فقط.'}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      true ? 'bg-[#007AFF]/10 text-[#007AFF]' : 'bg-gray-100 text-gray-400'
                    }`}>
                      عادي
                    </span>
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      sizeVariations ? 'bg-[#FF9500]/10 text-[#FF9500]' : 'bg-gray-100 text-gray-400'
                    }`}>
                      صغير
                    </span>
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      sizeVariations ? 'bg-[#AF52DE]/10 text-[#AF52DE]' : 'bg-gray-100 text-gray-400'
                    }`}>
                      كبير
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Notifications Settings Card */}
      <motion.div
        variants={fadeUp}
        className="bg-white rounded-2xl p-5 shadow-sm"
      >
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-[#AF52DE]/10 flex items-center justify-center shrink-0">
            <Bell className="w-5.5 h-5.5 text-[#AF52DE]" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold">الإشعارات</h3>
            <p className="text-xs text-gray-500 mt-0.5 mb-3">إعدادات التنبيهات والإشعارات</p>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-600">إشعارات الطلبات الجديدة</span>
              <Switch defaultChecked className="scale-110" />
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-600">إشعارات الفواتير</span>
              <Switch defaultChecked className="scale-110" />
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">إشعارات النشاط</span>
              <Switch defaultChecked className="scale-110" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Security Settings Card */}
      <motion.div
        variants={fadeUp}
        className="bg-white rounded-2xl p-5 shadow-sm"
      >
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-[#34C759]/10 flex items-center justify-center shrink-0">
            <Shield className="w-5.5 h-5.5 text-[#34C759]" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold">الأمان</h3>
            <p className="text-xs text-gray-500 mt-0.5 mb-3">إعدادات الحماية والخصوصية</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-600">المصادقة</span>
                <span className="text-xs font-medium bg-[#34C759]/10 text-[#34C759] px-2.5 py-1 rounded-lg">
                  مفعّلة
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">تشفير البيانات</span>
                <span className="text-xs font-medium bg-[#34C759]/10 text-[#34C759] px-2.5 py-1 rounded-lg">
                  AES-256
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Appearance Settings Card */}
      <motion.div
        variants={fadeUp}
        className="bg-white rounded-2xl p-5 shadow-sm"
      >
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-[#5856D6]/10 flex items-center justify-center shrink-0">
            <Palette className="w-5.5 h-5.5 text-[#5856D6]" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold">المظهر</h3>
            <p className="text-xs text-gray-500 mt-0.5 mb-3">تخصيص واجهة التطبيق</p>
            <div className="flex gap-2">
              <div className="flex-1 h-16 rounded-xl bg-gradient-to-br from-[#f2f2f7] to-white border-2 border-[#007AFF] flex items-center justify-center cursor-pointer">
                <span className="text-xs font-medium text-[#007AFF]">فاتح</span>
              </div>
              <div className="flex-1 h-16 rounded-xl bg-gradient-to-br from-[#1c1c1e] to-[#2c2c2e] border-2 border-transparent flex items-center justify-center cursor-pointer hover:border-[#007AFF]/50 transition-colors">
                <span className="text-xs font-medium text-gray-400">داكن</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Save Button */}
      <motion.div variants={fadeUp}>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12 rounded-2xl bg-[#007AFF] text-white font-semibold text-base shadow-lg shadow-[#007AFF]/20"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4 ml-1.5" />
              حفظ الإعدادات
            </>
          )}
        </Button>
      </motion.div>

      {/* About System Section */}
      <motion.div
        variants={fadeUp}
        className="bg-white rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="bg-gradient-to-l from-[#007AFF]/5 to-transparent px-5 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-[#007AFF]" />
            <h3 className="text-base font-bold">حول النظام</h3>
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5 mr-7">معلومات تقنية عن التطبيق</p>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">الإصدار</span>
            </div>
            <span className="text-sm font-bold text-[#007AFF]">الإصدار 2.0.0</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">التقنيات</span>
            </div>
            <span className="text-xs font-medium bg-[#f2f2f7] px-2.5 py-1 rounded-lg text-gray-600">
              Next.js 16 + Prisma + Zustand
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">التطبيق</span>
            </div>
            <span className="text-sm font-medium text-gray-600">مياه جبأ - نظام إدارة المناديب</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">آخر تحديث</span>
            </div>
            <span className="text-xs font-medium text-gray-500">{todayDate}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

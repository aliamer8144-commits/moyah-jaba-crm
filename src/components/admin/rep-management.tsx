'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, User } from '@/lib/store';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  UserPlus,
  Pencil,
  Trash2,
  UserCircle,
  Phone,
  Package,
  ToggleLeft,
  ToggleRight,
  Users,
  Loader2,
  UsersRound,
  BarChart3,
} from 'lucide-react';
import { RepPerformance } from './rep-performance';

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
};

interface RepWithCount extends User {
  _count?: { clients: number; invoices: number };
}

export function RepManagement() {
  const { user } = useAppStore();
  const [reps, setReps] = useState<RepWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRep, setEditingRep] = useState<RepWithCount | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [selectedRepId, setSelectedRepId] = useState<string | null>(null);
  const [selectedRepName, setSelectedRepName] = useState<string>('');

  // Form state
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [inventory, setInventory] = useState('');

  const fetchReps = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/auth?adminId=${user.id}`);
      if (res.ok) setReps(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchReps();
  }, [fetchReps]);

  const resetForm = () => {
    setName('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setPhone('');
    setInventory('');
    setEditingRep(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (rep: RepWithCount) => {
    setEditingRep(rep);
    setName(rep.name);
    setUsername(rep.username);
    setPassword('');
    setConfirmPassword('');
    setPhone(rep.phone || '');
    setInventory(String(rep.allocatedInventory));
    setDialogOpen(true);
  };

  const validate = () => {
    if (!name.trim()) return 'الاسم مطلوب';
    if (!editingRep && !username.trim()) return 'اسم المستخدم مطلوب';
    if (!editingRep && !password) return 'كلمة المرور مطلوبة';
    if (!editingRep && password !== confirmPassword) return 'كلمة المرور غير متطابقة';
    if (!editingRep && password.length < 4) return 'كلمة المرور يجب أن تكون 4 أحرف على الأقل';
    return null;
  };

  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    setFormLoading(true);
    try {
      if (editingRep) {
        const body: Record<string, unknown> = {
          adminId: user!.id,
          userId: editingRep.id,
          name: name.trim(),
          phone: phone.trim() || null,
          allocatedInventory: parseInt(inventory) || 0,
        };
        if (password) body.password = password;

        const res = await fetch('/api/auth', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'حدث خطأ');
        toast.success('تم تحديث المندوب بنجاح');
      } else {
        const res = await fetch('/api/auth', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adminId: user!.id,
            name: name.trim(),
            username: username.trim(),
            password,
            phone: phone.trim() || null,
            role: 'REP',
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'حدث خطأ');
        toast.success('تم إضافة المندوب بنجاح');
      }
      setDialogOpen(false);
      resetForm();
      fetchReps();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleActive = async (rep: RepWithCount) => {
    try {
      const res = await fetch('/api/auth', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: user!.id,
          userId: rep.id,
          isActive: !rep.isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'حدث خطأ');
      toast.success(rep.isActive ? 'تم تعطيل المندوب' : 'تم تفعيل المندوب');
      fetchReps();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm || !user) return;
    try {
      const res = await fetch(`/api/auth?adminId=${user.id}&userId=${deleteConfirm}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'حدث خطأ');
      toast.success('تم حذف المندوب بنجاح');
      setDeleteConfirm(null);
      fetchReps();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ');
    }
  };

  if (selectedRepId) {
    return (
      <RepPerformance
        repId={selectedRepId}
        repName={selectedRepName}
        onBack={() => { setSelectedRepId(null); setSelectedRepName(''); }}
      />
    );
  }

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-4">
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">إدارة المناديب</h2>
          <p className="text-sm text-gray-500">{reps.length} مندوب</p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="rounded-2xl bg-[#007AFF] text-white font-semibold text-sm h-10"
        >
          <UserPlus className="w-4 h-4 ml-1.5" />
          إضافة مندوب
        </Button>
      </motion.div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : reps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <UsersRound className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-medium">لا يوجد مناديب بعد</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {reps.map((rep) => (
              <motion.div
                key={rep.id}
                variants={fadeUp}
                layout
                initial="initial"
                animate="animate"
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl p-4 shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center ${
                      rep.isActive
                        ? 'bg-gradient-to-br from-[#007AFF] to-[#0055D4]'
                        : 'bg-gray-200'
                    }`}>
                      <UserCircle className={`w-5 h-5 ${rep.isActive ? 'text-white' : 'text-gray-400'}`} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`status-dot ${rep.isActive ? 'status-dot-online' : 'status-dot-offline'}`} />
                      <div>
                        <h3 className="font-semibold text-sm">{rep.name}</h3>
                        <p className="text-xs text-gray-500">@{rep.username}</p>
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={rep.isActive ? 'default' : 'secondary'}
                    className={rep.isActive ? 'bg-[#34C759]/10 text-[#34C759] border-0' : ''}
                  >
                    {rep.isActive ? 'نشط' : 'معطل'}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center p-2 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500">عملاء</p>
                    <p className="text-sm font-bold">{rep._count?.clients || 0}</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500">فواتير</p>
                    <p className="text-sm font-bold">{rep._count?.invoices || 0}</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500">مخزون</p>
                    <p className="text-sm font-bold text-[#FF9500]">{rep.allocatedInventory}</p>
                  </div>
                </div>

                {rep.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                    <Phone className="w-3 h-3" />
                    <span dir="ltr">{rep.phone}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setSelectedRepId(rep.id); setSelectedRepName(rep.name); }}
                    className="flex-1 rounded-xl text-xs h-9 border-[#007AFF] text-[#007AFF] hover:bg-[#007AFF]/5"
                  >
                    <BarChart3 className="w-3 h-3 ml-1" />
                    تفاصيل الأداء
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(rep)}
                    className="flex-1 rounded-xl text-xs h-9"
                  >
                    <Pencil className="w-3 h-3 ml-1" />
                    تعديل
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(rep)}
                    className={`rounded-xl text-xs h-9 ${
                      rep.isActive
                        ? 'border-[#FF3B30] text-[#FF3B30] hover:bg-[#FF3B30]/5'
                        : 'border-[#34C759] text-[#34C759] hover:bg-[#34C759]/5'
                    }`}
                  >
                    {rep.isActive ? (
                      <>
                        <ToggleRight className="w-3 h-3 ml-1" />
                        تعطيل
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-3 h-3 ml-1" />
                        تفعيل
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteConfirm(rep.id)}
                    className="rounded-xl text-xs h-9 border-[#FF3B30] text-[#FF3B30] hover:bg-[#FF3B30]/5"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetForm(); setDialogOpen(o); }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingRep ? 'تعديل المندوب' : 'إضافة مندوب جديد'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm">الاسم <span className="text-[#FF3B30]">*</span></Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم المندوب" className="bg-[#f2f2f7] rounded-xl border-0 h-11" />
            </div>

            {!editingRep && (
              <div className="space-y-1.5">
                <Label className="text-sm">اسم المستخدم <span className="text-[#FF3B30]">*</span></Label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="اسم المستخدم للدخول" className="bg-[#f2f2f7] rounded-xl border-0 h-11" />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-sm">{editingRep ? 'كلمة المرور الجديدة (اتركها فارغة)' : 'كلمة المرور'} {!editingRep && <span className="text-[#FF3B30]">*</span>}</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة المرور" className="bg-[#f2f2f7] rounded-xl border-0 h-11" />
            </div>

            {!editingRep && (
              <div className="space-y-1.5">
                <Label className="text-sm">تأكيد كلمة المرور <span className="text-[#FF3B30]">*</span></Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="أعد كتابة كلمة المرور" className="bg-[#f2f2f7] rounded-xl border-0 h-11" />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-sm">رقم الهاتف</Label>
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xxxxxxxx" className="bg-[#f2f2f7] rounded-xl border-0 h-11" />
            </div>

            {editingRep && (
              <div className="space-y-1.5">
                <Label className="text-sm">المخزون المخصص (كرتون)</Label>
                <Input type="number" value={inventory} onChange={(e) => setInventory(e.target.value)} placeholder="0" min="0" className="bg-[#f2f2f7] rounded-xl border-0 h-11" />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }} className="rounded-2xl flex-1">
              إلغاء
            </Button>
            <Button onClick={handleSubmit} disabled={formLoading} className="rounded-2xl flex-1 bg-[#007AFF] text-white">
              {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : editingRep ? 'حفظ التعديلات' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا المندوب؟ سيتم حذف جميع بياناته المرتبطة. هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-xl bg-[#FF3B30] hover:bg-[#FF3B30]/90">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

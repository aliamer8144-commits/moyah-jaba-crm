'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { User, Lock, Eye, EyeOff, Droplets, Loader2 } from 'lucide-react';

export function LoginPage() {
  const { setUser, setCurrentView } = useAppStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password, action: 'login' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'حدث خطأ');

      setUser(data);
      setCurrentView(data.role === 'ADMIN' ? 'admin' : 'rep');
      toast.success(`مرحباً ${data.name}!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ في تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (quickUsername: string, quickPassword: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: quickUsername, password: quickPassword, action: 'login' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'حدث خطأ');
      setUser(data);
      setCurrentView(data.role === 'ADMIN' ? 'admin' : 'rep');
      toast.success(`مرحباً ${data.name}!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f2f2f7] dark:bg-gray-950">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="animate-float">
            <div className="w-20 h-20 bg-gradient-to-br from-[#007AFF] to-[#5856D6] rounded-2xl flex items-center justify-center animate-logo-glow mb-4 shadow-lg shadow-[#007AFF]/20">
              <Droplets className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-[#1c1c1e] dark:text-white">مياه جبأ</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">نظام إدارة المناديب</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-200/50 dark:border-gray-800/50">
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Username */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">اسم المستخدم</Label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="أدخل اسم المستخدم"
                  className={`bg-[#f2f2f7] dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 rounded-xl border-0 pr-10 h-12 text-base transition-all duration-200 ease-out ${
                    focusedField === 'username'
                      ? 'ring-2 ring-[#007AFF]/40 shadow-[0_0_12px_rgba(0,122,255,0.15)]'
                      : 'focus:ring-2 ring-[#007AFF]/20'
                  }`}
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">كلمة المرور</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="أدخل كلمة المرور"
                  className={`bg-[#f2f2f7] dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 rounded-xl border-0 pr-10 pl-10 h-12 text-base transition-all duration-200 ease-out ${
                    focusedField === 'password'
                      ? 'ring-2 ring-[#007AFF]/40 shadow-[0_0_12px_rgba(0,122,255,0.15)]'
                      : 'focus:ring-2 ring-[#007AFF]/20'
                  }`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRememberMe(!rememberMe)}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                  rememberMe
                    ? 'bg-[#007AFF] border-[#007AFF]'
                    : 'border-gray-300'
                }`}
              >
                {rememberMe && (
                  <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">تذكرني</span>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-gradient-to-l from-[#007AFF] to-[#5856D6] text-white font-semibold text-base shadow-lg shadow-[#007AFF]/25 hover:opacity-95 transition-opacity"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جارٍ تسجيل الدخول...</span>
                </div>
              ) : (
                'تسجيل الدخول'
              )}
            </Button>
          </form>

          {/* Forgot Password */}
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => toast.info('سيتم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني')}
              className="text-sm text-[#007AFF] hover:text-[#5856D6] transition-colors font-medium"
            >
              نسيت كلمة المرور؟
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 space-y-1">
          <p className="text-xs text-gray-400 dark:text-gray-600">
            © 2025 مياه جبأ - جميع الحقوق محفوظة
          </p>
          <p className="text-[10px] text-gray-300 dark:text-gray-700">
            v2.0.0
          </p>
        </div>

        {/* Quick login buttons */}
        <div className="flex gap-2 justify-center mt-3">
          <button
            type="button"
            onClick={() => handleQuickLogin('admin', 'admin123')}
            disabled={loading}
            className="text-[11px] px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 transition-colors"
          >
            🔑 دخول أدمن
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('rep1', 'rep123')}
            disabled={loading}
            className="text-[11px] px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
          >
            🔑 دخول مندوب
          </button>
        </div>
      </motion.div>
    </div>
  );
}

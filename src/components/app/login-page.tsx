'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { User, Lock, Eye, EyeOff, Droplets, Loader2 } from 'lucide-react';

function WaterWaves() {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-48 overflow-hidden pointer-events-none">
      <svg
        className="animate-water-wave absolute bottom-0 w-[200%] h-full"
        viewBox="0 0 1440 200"
        preserveAspectRatio="none"
      >
        <path
          fill="rgba(0, 122, 255, 0.06)"
          d="M0,100 C240,150 480,50 720,100 C960,150 1200,50 1440,100 L1440,200 L0,200 Z"
        />
      </svg>
      <svg
        className="animate-water-wave-2 absolute bottom-0 w-[200%] h-full"
        viewBox="0 0 1440 200"
        preserveAspectRatio="none"
      >
        <path
          fill="rgba(0, 122, 255, 0.04)"
          d="M0,120 C360,180 720,60 1080,120 C1260,150 1360,90 1440,120 L1440,200 L0,200 Z"
        />
      </svg>
      <svg
        className="animate-water-wave-3 absolute bottom-0 w-[200%] h-full"
        viewBox="0 0 1440 200"
        preserveAspectRatio="none"
      >
        <path
          fill="rgba(0, 122, 255, 0.03)"
          d="M0,140 C300,100 600,180 900,140 C1100,110 1300,170 1440,140 L1440,200 L0,200 Z"
        />
      </svg>
    </div>
  );
}

function FloatingBubbles() {
  const bubbles = [
    { size: 12, left: '10%', delay: '0s', duration: '8s' },
    { size: 6, left: '22%', delay: '6.5s', duration: '12s' },
    { size: 8, left: '35%', delay: '2s', duration: '10s' },
    { size: 18, left: '48%', delay: '1s', duration: '7s' },
    { size: 5, left: '60%', delay: '4s', duration: '11s' },
    { size: 14, left: '72%', delay: '3s', duration: '9s' },
    { size: 10, left: '85%', delay: '5s', duration: '8.5s' },
    { size: 7, left: '92%', delay: '7s', duration: '13s' },
    { size: 16, left: '5%', delay: '8s', duration: '9.5s' },
    { size: 9, left: '55%', delay: '9s', duration: '10.5s' },
    { size: 4, left: '40%', delay: '1.5s', duration: '14s' },
    { size: 11, left: '65%', delay: '3.5s', duration: '8s' },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {bubbles.map((bubble, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: bubble.size,
            height: bubble.size,
            left: bubble.left,
            bottom: '-20px',
            background: i % 3 === 0
              ? 'radial-gradient(circle at 30% 30%, rgba(0, 122, 255, 0.25), rgba(0, 122, 255, 0.05))'
              : i % 3 === 1
                ? 'radial-gradient(circle at 30% 30%, rgba(88, 86, 214, 0.2), rgba(88, 86, 214, 0.04))'
                : 'radial-gradient(circle at 30% 30%, rgba(175, 82, 222, 0.2), rgba(175, 82, 222, 0.04))',
            animation: `bubbleFloat ${bubble.duration} ease-in-out ${bubble.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
}

function ParticleField() {
  const particles = [
    { size: 3, left: '8%', delay: '0s', duration: '6s' },
    { size: 2, left: '20%', delay: '2s', duration: '8s' },
    { size: 4, left: '42%', delay: '1s', duration: '7s' },
    { size: 2, left: '58%', delay: '3s', duration: '9s' },
    { size: 3, left: '78%', delay: '4s', duration: '6.5s' },
    { size: 2, left: '90%', delay: '5s', duration: '7.5s' },
    { size: 3, left: '30%', delay: '6s', duration: '10s' },
    { size: 2, left: '68%', delay: '7s', duration: '8.5s' },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-[#007AFF]/15"
          style={{
            width: p.size,
            height: p.size,
            left: p.left,
            bottom: '-10px',
            animation: `particleDrift ${p.duration} ease-in-out ${p.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
}

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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden login-bg-particles dark:bg-gray-950 water-bg-gradient">
      {/* Background gradient layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#007AFF]/8 via-transparent to-[#007AFF]/5 dark:from-[#007AFF]/5 dark:to-[#007AFF]/3" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#007AFF]/5 dark:bg-[#007AFF]/8 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#5856D6]/3 dark:bg-[#5856D6]/5 rounded-full blur-3xl" />
      <div className="absolute top-1/4 right-0 w-[300px] h-[300px] bg-[#AF52DE]/3 dark:bg-[#AF52DE]/5 rounded-full blur-3xl" />
      {/* CSS-only particle layer (inner pseudo-elements) */}
      <div className="login-particles-inner" />

      {/* Water wave background */}
      <WaterWaves />
      <FloatingBubbles />
      <ParticleField />

      <div className="relative w-full max-w-sm">
        <div className="glass-card glass-card-enhanced rounded-3xl p-8 border-gradient bg-noise water-refraction-overlay card-hover-lift">
          {/* Logo with floating animation and glow */}
          <div className="flex flex-col items-center mb-8">
            <div className="animate-float">
              <div className="w-20 h-20 bg-gradient-to-br from-[#007AFF] to-[#5856D6] rounded-3xl flex items-center justify-center animate-logo-glow animate-water-shimmer mb-4 relative">
                <Droplets className="w-10 h-10 text-white relative z-10" />
                {/* Subtle inner glow ring */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/20 to-transparent" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-[#1c1c1e] dark:text-white gradient-text text-shadow-glow text-shadow-lg">مياه جبأ</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 typing-cursor text-gradient-ice">نظام إدارة المناديب</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">اسم المستخدم</Label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="أدخل اسم المستخدم"
                  className={`bg-[#f2f2f7]/80 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 rounded-xl border-0 pr-10 h-12 text-base transition-all duration-200 ease-out ${
                    focusedField === 'username'
                      ? 'ring-2 ring-[#007AFF]/40 shadow-[0_0_12px_rgba(0,122,255,0.15)]'
                      : 'focus:ring-2 ring-[#007AFF]/20'
                  }`}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">كلمة المرور</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="أدخل كلمة المرور"
                  className={`bg-[#f2f2f7]/80 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 rounded-xl border-0 pr-10 pl-10 h-12 text-base transition-all duration-200 ease-out ${
                    focusedField === 'password'
                      ? 'ring-2 ring-[#007AFF]/40 shadow-[0_0_12px_rgba(0,122,255,0.15)]'
                      : 'focus:ring-2 ring-[#007AFF]/20'
                  }`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors touch-feedback"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRememberMe(!rememberMe)}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all touch-feedback ${
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

            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-2xl bg-gradient-to-l from-[#007AFF] to-[#5856D6] text-white font-semibold text-base shadow-lg shadow-[#007AFF]/25 hover:opacity-95 transition-opacity relative overflow-hidden ripple-container water-ripple-button touch-feedback"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>جارٍ تسجيل الدخول...</span>
                  </div>
                ) : (
                  <span className="relative z-10">تسجيل الدخول</span>
                )}
                {!loading && <div className="absolute inset-0 animate-shimmer" />}
              </Button>
            </motion.div>
          </form>

          {/* Forgot Password with slide-up underline */}
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => toast.info('سيتم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني')}
              className="text-sm text-[#007AFF] hover:text-[#5856D6] transition-colors font-medium link-slide-underline touch-feedback"
            >
              نسيت كلمة المرور؟
            </button>
          </div>
        </div>

        {/* Footer with version */}
        <div className="text-center mt-6 space-y-1">
          <p className="text-xs text-gray-400 dark:text-gray-600">
            © 2025 مياه جبأ - جميع الحقوق محفوظة
          </p>
          <p className="text-[10px] text-gray-300 dark:text-gray-700">
            v2.0.0
          </p>
        </div>

        {/* DEV: Quick login buttons (temporary) */}
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
      </div>
    </div>
  );
}

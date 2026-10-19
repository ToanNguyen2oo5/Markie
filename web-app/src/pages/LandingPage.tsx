import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import keycloak from '../keycloak';
import {
  Eye,
  EyeSlash,
  Spinner,
  Sparkle,
  Headphones,
  CheckCircle,
  Flame,
  Heart,
  Radio,
} from '@phosphor-icons/react';

// Floating animation variants for the 3 social cards
const floatingCardVariants = (delay: number, duration: number, yRange = 8, rotateRange = 2): Variants => ({
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: [0, -yRange, 0],
    rotate: [-rotateRange, rotateRange / 2, -rotateRange],
    transition: {
      opacity: { duration: 0.6, delay },
      y: {
        repeat: Infinity,
        duration,
        ease: 'easeInOut',
        repeatType: 'reverse',
      },
      rotate: {
        repeat: Infinity,
        duration: duration * 1.25,
        ease: 'easeInOut',
        repeatType: 'reverse',
      },
    },
  },
});

export function LandingPage() {
  const navigate = useNavigate();
  const { authenticated } = useAuth();
  const [syncLoading, setSyncLoading] = useState(false);
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Sync profile after Keycloak returns
  const syncProfile = useCallback(async () => {
    if (!keycloak.token) return;
    setSyncLoading(true);

    let navigated = false;
    const goToFeed = () => {
      if (!navigated) {
        navigated = true;
        navigate('/feed');
      }
    };

    try {
      await keycloak.updateToken(30);
    } catch {
      // ignore
    }

    try {
      const checkRes = await fetch('/profile/users/my-profile', {
        headers: { Authorization: `Bearer ${keycloak.token}` },
      });
      const checkData = await checkRes.json();

      if (checkData.code === 1000) {
        const realmRoles = (keycloak.tokenParsed as any)?.realm_access?.roles || [];
        if (!realmRoles.includes('USER') && !realmRoles.includes('ADMIN')) {
          await fetch('/profile/users/sync-profile', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${keycloak.token}`,
              'Content-Type': 'application/json',
            },
          });
          try {
            await keycloak.updateToken(-1);
          } catch {
            // ignore
          }
        }
        goToFeed();
        return;
      }

      if (checkData.code === 1012) {
        await fetch('/profile/users/sync-profile', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${keycloak.token}`,
            'Content-Type': 'application/json',
          },
        });
        try {
          await keycloak.updateToken(-1);
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.error('Profile check/sync error:', err);
    } finally {
      setSyncLoading(false);
      goToFeed();
    }
  }, [navigate]);

  useEffect(() => {
    if (authenticated) {
      syncProfile();
    }
  }, [authenticated, syncProfile]);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (usernameOrEmail.trim()) {
      keycloak.login({ loginHint: usernameOrEmail.trim() });
    } else {
      keycloak.login();
    }
  };

  const handleRegister = () => keycloak.register();

  return (
    <div className="min-h-screen w-full bg-[#0A0F1D] text-slate-100 font-sans selection:bg-indigo-500/20 selection:text-indigo-300 relative overflow-x-hidden flex flex-col lg:flex-row">
      
      {/* ─────────────────────────────────────────────────────────────
          LEFT HALF: Visual Showcase ("Connect & Share Your Vibe")
         ───────────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-[58%] xl:w-[60%] relative p-8 sm:p-12 lg:p-16 xl:p-20 flex flex-col justify-between overflow-hidden bg-[#0A0F1D] min-h-[540px] lg:min-h-screen">
          
          {/* 3D Glossy Ribbon Background with subtle parallax drift */}
          <motion.div
            animate={{
              scale: [1.02, 1.06, 1.02],
              x: [0, 6, 0],
              y: [0, -4, 0],
            }}
              transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 bg-cover bg-center opacity-75 mix-blend-screen pointer-events-none"
              style={{ backgroundImage: `url('/login_visual_bg.jpg')` }}
            />

            {/* Subtle Gradient Veil */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1D] via-transparent to-[#0A0F1D]/60 pointer-events-none" />

            {/* Floating Sparkles & Animated Doodles */}
            <motion.svg
              animate={{
                y: [0, -6, 0],
                rotate: [0, 4, 0],
              }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-14 right-16 w-12 h-12 text-slate-400/40 pointer-events-none stroke-current"
              viewBox="0 0 48 48"
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M8 12 C 16 6, 28 8, 34 18 C 38 24, 32 32, 24 30 C 18 28, 20 38, 28 42" strokeDasharray="3 3" />
              <path d="M26 44 L30 42 L28 38" />
            </motion.svg>

            <motion.div
              animate={{
                scale: [1, 1.15, 1],
                rotate: [0, 15, -15, 0],
              }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-28 right-8 text-emerald-400/60 pointer-events-none"
            >
              <Sparkle weight="fill" className="w-5 h-5" />
            </motion.div>

            <motion.svg
              animate={{
                y: [0, 6, 0],
                rotate: [0, -5, 0],
              }}
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute bottom-24 left-10 w-10 h-10 text-emerald-400/30 pointer-events-none stroke-current"
              viewBox="0 0 40 40"
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M10 30 C 6 22, 14 12, 22 14 C 28 16, 32 26, 26 32 C 22 36, 16 34, 18 26" />
            </motion.svg>

            {/* ── Floating Social Card 1 (Top Left) with continuous levitation ── */}
            <motion.div
              variants={floatingCardVariants(0.15, 4.5, 9, 2.5)}
              initial="initial"
              animate="animate"
              whileHover={{
                scale: 1.05,
                y: -6,
                rotate: 0,
                boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.9), 0 0 25px rgba(79, 70, 229, 0.25)',
              }}
              className="relative z-10 w-full max-w-[285px] bg-slate-900/85 backdrop-blur-xl border border-slate-700/70 rounded-2xl p-4 shadow-2xl shadow-black/80 transition-shadow cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-indigo-500 to-rose-400 p-[1.5px]">
                    <img
                      src="https://api.dicebear.com/9.x/thumbs/svg?seed=Alex&size=32"
                      alt="User"
                      className="w-full h-full rounded-full object-cover bg-slate-800"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-heading font-semibold text-xs text-slate-100">User</span>
                    <Headphones className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-code font-semibold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Status
                </span>
              </div>
              <p className="text-xs text-slate-200 font-medium mb-3">
                Exploring the city 🏙️
              </p>
              <div className="flex items-center justify-between text-[11px] font-code pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center gap-1 text-amber-400 font-semibold group-hover:scale-105 transition-transform">
                    <Flame weight="fill" className="w-3.5 h-3.5" /> 42
                  </span>
                  <span className="flex items-center gap-1 text-sky-400 font-semibold group-hover:scale-105 transition-transform">
                    <Heart weight="fill" className="w-3.5 h-3.5" /> 18
                  </span>
                </div>
                <div className="flex -space-x-1.5">
                  <span className="w-4 h-4 rounded-full bg-amber-500/20 border border-slate-800 text-[9px] flex items-center justify-center">🔥</span>
                  <span className="w-4 h-4 rounded-full bg-pink-500/20 border border-slate-800 text-[9px] flex items-center justify-center">🥰</span>
                  <span className="w-4 h-4 rounded-full bg-indigo-500/20 border border-slate-800 text-[9px] flex items-center justify-center">💙</span>
                </div>
              </div>
            </motion.div>

            {/* ── Central Hero Slogan with Breathing Radiant Glow ── */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative z-10 my-8 sm:my-12 text-center sm:text-left"
            >
              {/* Hand-drawn arrow to title with animated draw */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.35 }}
                className="hidden sm:block mb-2 ml-4"
              >
                <svg className="w-10 h-8 text-slate-400/50" viewBox="0 0 36 28" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 4 C 14 12, 10 20, 24 22" strokeLinecap="round" strokeDasharray="2 3" />
                  <path d="M20 18 L25 22 L21 26" strokeLinecap="round" />
                </svg>
              </motion.div>

              <h1 className="font-heading font-extrabold text-3xl sm:text-5xl lg:text-6xl tracking-tight text-white leading-[1.12]">
                Connect & Share <br />
                <motion.span
                  animate={{
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                  }}
                  transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
                  style={{
                    backgroundImage: 'linear-gradient(90deg, #4F46E5, #06B6D4, #10B981, #06B6D4, #4F46E5)',
                    backgroundSize: '200% auto',
                  }}
                  className="bg-clip-text text-transparent inline-block drop-shadow-[0_2px_15px_rgba(79,70,229,0.35)]"
                >
                  Your Vibe
                </motion.span>
              </h1>
              <p className="text-sm text-slate-400 mt-3 max-w-md leading-relaxed hidden sm:block">
                Khám phá thế giới kết nối năng động, lan tỏa năng lượng tích cực cùng hàng triệu bạn trẻ GenV.
              </p>
            </motion.div>

            {/* ── Bottom Floating Cards Row with Asynchronous Levitation ── */}
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
              
              {/* Card 2: Jovian */}
              <motion.div
                variants={floatingCardVariants(0.25, 5.2, 8, -2)}
                initial="initial"
                animate="animate"
                whileHover={{
                  scale: 1.05,
                  y: -6,
                  rotate: 0,
                  boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.9), 0 0 25px rgba(16, 185, 129, 0.25)',
                }}
                className="w-full sm:w-[235px] bg-slate-900/85 backdrop-blur-xl border border-slate-700/70 rounded-2xl p-3.5 shadow-2xl shadow-black/80 transition-shadow cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <img
                      src="https://api.dicebear.com/9.x/thumbs/svg?seed=Jovian&size=32"
                      alt="Jovian"
                      className="w-7 h-7 rounded-full object-cover bg-slate-800 border border-slate-700"
                    />
                    <span className="font-heading font-semibold text-xs text-slate-100">Jovian</span>
                  </div>
                  <CheckCircle weight="fill" className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-xs text-slate-300 font-medium mb-2.5">
                  Mohors 😍
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-1 text-[11px]">
                    <span>🔥</span>
                    <span>🥰</span>
                    <span>🤩</span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[9px] font-code font-semibold text-emerald-400 uppercase tracking-wider">
                    <Radio weight="fill" className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                    Status
                  </span>
                </div>
              </motion.div>

              {/* Card 3: GenV Current Jam */}
              <motion.div
                variants={floatingCardVariants(0.35, 4.8, 7, 2)}
                initial="initial"
                animate="animate"
                whileHover={{
                  scale: 1.05,
                  y: -6,
                  rotate: 0,
                  boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.9), 0 0 25px rgba(79, 70, 229, 0.25)',
                }}
                className="w-full sm:w-[225px] bg-slate-900/85 backdrop-blur-xl border border-slate-700/70 rounded-2xl p-3.5 shadow-2xl shadow-black/80 transition-shadow cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <img
                      src="https://api.dicebear.com/9.x/thumbs/svg?seed=GenVUser&size=32"
                      alt="GenV"
                      className="w-7 h-7 rounded-full object-cover bg-slate-800 border border-slate-700"
                    />
                    <span className="font-heading font-semibold text-xs text-slate-100">GenV</span>
                  </div>
                  <CheckCircle weight="fill" className="w-4 h-4 text-indigo-400" />
                </div>
                <p className="text-xs text-slate-300 font-medium mb-2.5 flex items-center gap-1.5">
                  <span>Current Jam</span>
                  <Headphones className="w-3.5 h-3.5 text-indigo-400" />
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <div className="flex -space-x-1">
                    <span className="w-4 h-4 rounded-full bg-indigo-500/30 text-[9px] flex items-center justify-center">👤</span>
                    <span className="w-4 h-4 rounded-full bg-purple-500/30 text-[9px] flex items-center justify-center">🎧</span>
                  </div>
                  <span className="flex items-center gap-1 text-[11px] font-code text-indigo-400 font-semibold">
                    <Heart weight="fill" className="w-3 h-3 text-indigo-400" /> 18
                  </span>
                </div>
              </motion.div>

            </div>

          </div>

      {/* ─────────────────────────────────────────────────────────────
          RIGHT HALF: Modern Clean Login Form (Full-Screen Split)
         ───────────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-[42%] xl:w-[40%] bg-white p-6 sm:p-10 lg:p-12 xl:p-16 flex flex-col justify-center items-center text-slate-900 relative min-h-screen">
        <div className="w-full max-w-md mx-auto my-auto flex flex-col justify-center">
            
              {/* Top Brand Logo with spring entrance */}
              <div>
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.1 }}
                className="flex items-center gap-2.5 mb-6"
              >
                {/* Stylized M/V Gradient Icon */}
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#4F46E5] to-[#10B981] flex items-center justify-center shadow-md shadow-indigo-500/20">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 5h3l6 9 6-9h3v14h-3V9.5l-6 9-6-9V19H3V5z" />
                  </svg>
                </div>
                <span className="font-heading font-bold text-2xl tracking-tight text-slate-950">
                  GenV
                </span>
              </motion.div>

              {/* Welcome Titles */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.18 }}
                className="mb-7"
              >
                <h2 className="font-heading font-bold text-2xl sm:text-[26px] text-slate-950 tracking-tight leading-tight">
                  Welcome back to GenV
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Sign in to catch up with your friends.
                </p>
              </motion.div>

              {/* Login Form */}
              {syncLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <Spinner className="w-8 h-8 animate-spin text-indigo-600" />
                  <p className="text-sm font-medium text-slate-600">Đang đồng bộ tài khoản...</p>
                </div>
              ) : (
                <motion.form
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.25 }}
                  onSubmit={handleLogin}
                  className="space-y-4"
                >
                  {/* Username or Email Input */}
                  <div>
                    <input
                      type="text"
                      value={usernameOrEmail}
                      onChange={(e) => setUsernameOrEmail(e.target.value)}
                      placeholder="Username or Email"
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all shadow-2xs"
                    />
                  </div>

                  {/* Password Input with Show/Hide Eye */}
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all pr-12 shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeSlash className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Forgot Password Link */}
                  <div className="text-right pt-0.5">
                    <button
                      type="button"
                      onClick={handleLogin}
                      className="text-xs font-heading font-semibold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>

                  {/* Log In Button (Interactive Motion + Glow) */}
                  <motion.button
                    type="submit"
                    whileHover={{
                      scale: 1.015,
                      boxShadow: '0 14px 35px -8px rgba(79, 70, 229, 0.45)',
                    }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#10B981] text-white font-heading font-semibold text-base shadow-lg shadow-indigo-500/25 cursor-pointer flex items-center justify-center gap-2 mt-2 transition-transform"
                  >
                    <span>Log In</span>
                  </motion.button>
                </motion.form>
              )}

              {/* Or continue with divider */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.35 }}
                className="relative my-6 text-center"
              >
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <span className="relative px-3 bg-white text-xs text-slate-400 font-medium">
                  or continue with
                </span>
              </motion.div>

              {/* One-touch Social Login Row (Interactive Hover & Press) */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.4 }}
                className="grid grid-cols-3 gap-3"
              >
                {/* Google Button */}
                <motion.button
                  type="button"
                  onClick={handleLogin}
                  whileHover={{ y: -3, scale: 1.04, boxShadow: '0 8px 20px -4px rgba(15, 23, 42, 0.1)' }}
                  whileTap={{ scale: 0.95 }}
                  title="Đăng nhập bằng Google"
                  className="h-12 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center shadow-2xs hover:border-slate-300 transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                </motion.button>

                {/* Apple Button */}
                <motion.button
                  type="button"
                  onClick={handleLogin}
                  whileHover={{ y: -3, scale: 1.04, boxShadow: '0 8px 20px -4px rgba(15, 23, 42, 0.1)' }}
                  whileTap={{ scale: 0.95 }}
                  title="Đăng nhập bằng Apple"
                  className="h-12 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center shadow-2xs hover:border-slate-300 transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5 text-slate-900 fill-current" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.63-.77 1.06-1.85.94-2.93-.93.04-2.02.63-2.67 1.4-.57.65-1.07 1.74-.93 2.8 1.03.08 2.05-.53 2.66-1.27z" />
                  </svg>
                </motion.button>

                {/* Discord Button */}
                <motion.button
                  type="button"
                  onClick={handleLogin}
                  whileHover={{ y: -3, scale: 1.04, boxShadow: '0 8px 20px -4px rgba(15, 23, 42, 0.1)' }}
                  whileTap={{ scale: 0.95 }}
                  title="Đăng nhập bằng Discord"
                  className="h-12 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center shadow-2xs hover:border-slate-300 transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5 text-[#5865F2] fill-current" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                </motion.button>
              </motion.div>
            </div>

            {/* Bottom Sign Up Link with Micro Hover */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.45 }}
              className="pt-8 text-center text-xs text-slate-500"
            >
              <span>Don't have an account? </span>
              <button
                type="button"
                onClick={handleRegister}
                className="font-heading font-semibold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer ml-1 hover:underline"
              >
                Sign up
              </button>
            </motion.div>

            </div>

      </div>

    </div>
  );
}

export default LandingPage;

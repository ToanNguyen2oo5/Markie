import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import keycloak from '../keycloak';
import {
  ArrowRight,
  ShieldCheck,
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
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

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

  const handleLogin = async () => {
    if (loginLoading || syncLoading) return;
    setLoginError('');
    setLoginLoading(true);
    try {
      await keycloak.login();
    } catch {
      setLoginError('Unable to open sign in. Please try again.');
      setLoginLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#0A0F1D] text-slate-100 font-sans selection:bg-indigo-500/20 selection:text-indigo-300 relative overflow-x-hidden flex flex-col lg:flex-row">
      
      {/* ─────────────────────────────────────────────────────────────
          LEFT HALF: Visual Showcase ("Connect & Share Your Vibe")
         ───────────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-[58%] xl:w-[60%] relative p-8 sm:p-12 lg:p-16 xl:p-20 flex flex-col justify-between overflow-hidden bg-[#0A0F1D] min-h-[540px] lg:min-h-[100dvh]">
          
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

      {/* A single entry point to the existing Keycloak sign-in flow. */}
      <section
        aria-labelledby="login-heading"
        className="relative flex w-full flex-col justify-between bg-[#FAFBFC] px-7 py-8 text-slate-900 sm:px-12 sm:py-10 lg:min-h-[100dvh] lg:w-[42%] lg:px-10 xl:w-[40%] xl:px-16"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-slate-950 font-heading text-xl font-bold text-white">
            <span aria-hidden="true">M</span>
          </div>
          <span className="font-heading text-xl font-bold tracking-tight">GenV</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mx-auto w-full max-w-[380px] py-16 sm:py-20 lg:py-12"
        >
          <div aria-hidden="true" className="mb-9 flex h-16 w-16 items-center justify-center rounded-[22px] border border-emerald-100 bg-emerald-50 text-emerald-600">
            <Sparkle weight="duotone" className="h-8 w-8" />
          </div>
          <h2 id="login-heading" className="font-heading text-[38px] font-bold leading-[1.15] tracking-[-0.045em] text-slate-950 sm:text-[44px]">
            Your people.<br />
            Your world.<br />
            <span className="text-emerald-600">Welcome back.</span>
          </h2>
          <p className="mt-5 max-w-[300px] text-[15px] leading-7 text-slate-500">
            Good conversations. Real connections.
            Sign in and pick up where you left off.
          </p>

          <div className="mt-10" aria-busy={loginLoading || syncLoading}>
            <button
              type="button"
              onClick={handleLogin}
              disabled={loginLoading || syncLoading}
              className="group flex min-h-14 w-full cursor-pointer items-center justify-between gap-4 rounded-2xl bg-slate-950 px-6 py-4 font-heading text-sm font-semibold text-white shadow-[0_8px_20px_-10px_rgba(15,23,42,0.4)] transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600 disabled:cursor-wait disabled:opacity-70"
            >
              <span>{syncLoading ? 'Syncing your account...' : loginLoading ? 'Opening sign in...' : 'Login'}</span>
              {loginLoading || syncLoading ? (
                <Spinner aria-hidden="true" className="h-5 w-5 motion-safe:animate-spin" />
              ) : (
                <ArrowRight aria-hidden="true" className="h-5 w-5 transition-transform motion-safe:group-hover:translate-x-1" />
              )}
            </button>
            <span role="status" className="sr-only">
              {syncLoading ? 'Syncing your account' : loginLoading ? 'Opening sign in' : ''}
            </span>
            {loginError && <p role="alert" className="mt-3 text-sm text-red-600">{loginError}</p>}
          </div>

          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-500">
            <ShieldCheck aria-hidden="true" className="h-4 w-4 text-emerald-600" />
            <span>A secure start to your next connection.</span>
          </div>
        </motion.div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-200/80 pt-5 text-[11px] text-slate-500">
          <span>Connect. Share. Be you.</span>
          <span className="font-heading font-semibold text-slate-700">GenV Community</span>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;

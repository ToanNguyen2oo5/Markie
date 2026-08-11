import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import keycloak from '../keycloak';
import { Navbar } from '../components/Navbar';
import { BentoShowcase } from '../components/BentoShowcase';
import { LockKey, Sparkle, Spinner } from '@phosphor-icons/react';

export function LandingPage() {
  const navigate = useNavigate();
  const { authenticated } = useAuth();
  const [syncLoading, setSyncLoading] = useState(false);
  const [serverConnected] = useState(true);

  // Called after Keycloak redirects back with a valid token.
  // - Existing user (login):  GET my-profile succeeds  → redirect immediately, no sync call.
  // - New user (register):    GET my-profile returns USER_NOT_EXISTED (code 1012) → call sync-profile then redirect.
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
    } catch { /* ignore */ }

    try {
      // Step 1: Check if profile already exists
      const checkRes = await fetch('/profile/users/my-profile', {
        headers: { Authorization: `Bearer ${keycloak.token}` },
      });
      const checkData = await checkRes.json();

      if (checkData.code === 1000) {
        // Existing user (login) — profile already exists, skip sync
        goToFeed();
        return;
      }

      // Step 2: Profile not found → new user just registered, create profile
      if (checkData.code === 1012) {
        await fetch('/profile/users/sync-profile', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${keycloak.token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (err) {
      console.error('Profile check/sync error:', err);
    } finally {
      setSyncLoading(false);
      goToFeed();
    }
  }, [navigate]);



  // Auto-redirect if already authenticated
  useEffect(() => {
    if (authenticated) {
      syncProfile();
    }
  }, [authenticated, syncProfile]);


  const handleLogin = () => keycloak.login();
  const handleRegister = () => keycloak.register();

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-blue-500/20 selection:text-blue-300 relative overflow-hidden">

      {/* Background Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-blue-900/10 blur-[140px]" />
        <div className="absolute top-[40%] -right-[15%] w-[45vw] h-[45vw] rounded-full bg-cyan-900/10 blur-[160px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:32px_32px] opacity-20" />
      </div>

      <Navbar serverConnected={serverConnected} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 z-10 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

          <div className="lg:col-span-7">
            <BentoShowcase />
          </div>

          <div className="lg:col-span-5 w-full">
            {syncLoading ? (
              <div className="liquid-glass rounded-3xl p-8 shadow-2xl border border-zinc-800/90 flex flex-col items-center justify-center space-y-4 min-h-[300px]">
                <Spinner weight="bold" className="w-8 h-8 animate-spin text-emerald-400" />
                <p className="text-sm text-zinc-400">Đang đồng bộ hồ sơ cá nhân...</p>
              </div>
            ) : (
              <div className="liquid-glass rounded-3xl p-6 sm:p-8 shadow-2xl relative border border-zinc-800/90 liquid-glass-hover">
                <div className="text-center space-y-3 mb-8">
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Chào mừng đến với Markie
                  </h2>
                  <p className="text-sm text-zinc-400">
                    Đăng nhập hoặc tạo tài khoản mới để bắt đầu kết nối
                  </p>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={handleLogin}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium rounded-xl text-sm transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2.5 active:scale-[0.98] cursor-pointer"
                  >
                    <LockKey weight="bold" className="w-5 h-5" />
                    <span>Đăng nhập</span>
                  </button>

                  <button
                    onClick={handleRegister}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-medium rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2.5 active:scale-[0.98] cursor-pointer"
                  >
                    <Sparkle weight="bold" className="w-5 h-5" />
                    <span>Đăng ký tài khoản mới</span>
                  </button>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-800/60 text-center">
                  <p className="text-xs text-zinc-500">
                    Bạn sẽ được chuyển hướng đến trang xác thực an toàn
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>

      <footer className="border-t border-zinc-900 bg-zinc-950/80 py-4 z-10">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-zinc-500 font-mono flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>Markie Social Network &bull; Kết nối và chia sẻ đam mê</div>
          <div className="text-zinc-600">&copy; 2026 Markie</div>
        </div>
      </footer>

    </div>
  );
}

export default LandingPage;

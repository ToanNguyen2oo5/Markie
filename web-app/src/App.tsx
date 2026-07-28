import { useState, useEffect, useCallback } from 'react';
import keycloak from './keycloak';
import { Navbar } from './components/Navbar';
import { BentoShowcase } from './components/BentoShowcase';
import { AuthSuccessModal } from './components/AuthSuccessModal';
import { LockKey, Sparkle, Spinner } from '@phosphor-icons/react';

export function App() {
  const [keycloakReady, setKeycloakReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [profileData, setProfileData] = useState<any | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [serverConnected, setServerConnected] = useState(true);

  // Initialize Keycloak
  useEffect(() => {
    keycloak
      .init({ onLoad: 'check-sso', checkLoginIframe: false })
      .then((auth) => {
        setKeycloakReady(true);
        setAuthenticated(auth);
        if (auth) {
          setServerConnected(true);
        }
      })
      .catch((err) => {
        console.error('Keycloak init failed:', err);
        setKeycloakReady(true);
        setServerConnected(false);
      });
  }, []);

  // Sync profile after authentication
  const syncProfile = useCallback(async () => {
    if (!keycloak.token) return;

    setSyncLoading(true);
    try {
      const response = await fetch('/profile/users/sync-profile', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${keycloak.token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (response.ok && data.code === 1000) {
        setProfileData(data.result);
      } else {
        console.error('Sync profile failed:', data);
      }
    } catch (err) {
      console.error('Sync profile error:', err);
    } finally {
      setSyncLoading(false);
    }
  }, []);

  // Auto-sync profile when authenticated
  useEffect(() => {
    if (authenticated && keycloakReady && !profileData) {
      syncProfile();
    }
  }, [authenticated, keycloakReady, profileData, syncProfile]);

  const handleLogin = () => {
    keycloak.login();
  };

  const handleRegister = () => {
    keycloak.register();
  };

  const handleLogout = () => {
    keycloak.logout({ redirectUri: window.location.origin });
  };

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-blue-500/20 selection:text-blue-300 relative overflow-hidden">
      
      {/* Background Subtle Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-blue-900/10 blur-[140px]" />
        <div className="absolute top-[40%] -right-[15%] w-[45vw] h-[45vw] rounded-full bg-cyan-900/10 blur-[160px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:32px_32px] opacity-20" />
      </div>

      {/* Top Navbar */}
      <Navbar serverConnected={serverConnected} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 z-10 flex items-center">
        
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Bento Showcase */}
          <div className="lg:col-span-7">
            <BentoShowcase />
          </div>

          {/* Right Column: Auth Card */}
          <div className="lg:col-span-5 w-full">
            
            {!keycloakReady ? (
              /* Loading State */
              <div className="liquid-glass rounded-3xl p-8 shadow-2xl border border-zinc-800/90 flex flex-col items-center justify-center space-y-4 min-h-[300px]">
                <Spinner weight="bold" className="w-8 h-8 animate-spin text-blue-400" />
                <p className="text-sm text-zinc-400">Đang kết nối đến máy chủ xác thực...</p>
              </div>
            ) : authenticated && profileData ? (
              /* Authenticated State — Show Profile */
              <AuthSuccessModal
                profileData={profileData}
                keycloakToken={keycloak.token || ''}
                onLogout={handleLogout}
              />
            ) : authenticated && syncLoading ? (
              /* Syncing Profile */
              <div className="liquid-glass rounded-3xl p-8 shadow-2xl border border-zinc-800/90 flex flex-col items-center justify-center space-y-4 min-h-[300px]">
                <Spinner weight="bold" className="w-8 h-8 animate-spin text-emerald-400" />
                <p className="text-sm text-zinc-400">Đang đồng bộ hồ sơ cá nhân...</p>
              </div>
            ) : (
              /* Unauthenticated — Login / Register Buttons */
              <div className="liquid-glass rounded-3xl p-6 sm:p-8 shadow-2xl relative border border-zinc-800/90 liquid-glass-hover">
                
                {/* Header */}
                <div className="text-center space-y-3 mb-8">
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Chào mừng đến với Markie
                  </h2>
                  <p className="text-sm text-zinc-400">
                    Đăng nhập hoặc tạo tài khoản mới để bắt đầu kết nối
                  </p>
                </div>

                {/* Auth Buttons */}
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

                {/* Divider */}
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

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950/80 py-4 z-10">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-zinc-500 font-mono flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Markie Social Network &bull; Kết nối và chia sẻ đam mê
          </div>
          <div className="text-zinc-600">
            &copy; 2026 Markie
          </div>
        </div>
      </footer>

    </div>
  );
}

export default App;

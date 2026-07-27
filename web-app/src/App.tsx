import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { BentoShowcase } from './components/BentoShowcase';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { AuthSuccessModal } from './components/AuthSuccessModal';
import { KeycloakConfigModal } from './components/KeycloakConfigModal';
import { LockKey, Sparkle } from '@phosphor-icons/react';

export function App() {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  // Mặc định gọi qua Gateway proxy
  const apiBaseUrl = '';
  const [authData, setAuthData] = useState<any | null>(null);
  const [serverConnected, setServerConnected] = useState(true);

  // Check health status of backend
  useEffect(() => {
    const checkServerHealth = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/profile/internal/login`, {
          method: 'OPTIONS',
        }).catch(() => null);
        // If fetch didn't throw network error, server is reachable
        setServerConnected(res !== null);
      } catch (e) {
        setServerConnected(false);
      }
    };
    checkServerHealth();
  }, [apiBaseUrl]);

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-blue-500/20 selection:text-blue-300 relative overflow-hidden">
      
      {/* Background Subtle Ambient Glow (Anti-slop: Neutral Dark Blur, No Neon Purple) */}
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
          
          {/* Left Column (7 cols): Asymmetric Visual Bento Showcase */}
          <div className="lg:col-span-7">
            <BentoShowcase />
          </div>

          {/* Right Column (5 cols): Liquid Glass Auth Card */}
          <div className="lg:col-span-5 w-full">
            
            {authData ? (
              /* Success State Card */
              <AuthSuccessModal
                authData={authData}
                apiBaseUrl={apiBaseUrl}
                onLogout={() => setAuthData(null)}
              />
            ) : (
              /* Authentication Forms Container */
              <div className="liquid-glass rounded-3xl p-6 sm:p-8 shadow-2xl relative border border-zinc-800/90 liquid-glass-hover">
                
                {/* Form Tab Switcher Header */}
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-6">
                  <div className="flex space-x-2 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 text-xs font-medium w-full">
                    <button
                      onClick={() => setAuthMode('login')}
                      className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                        authMode === 'login'
                          ? 'bg-blue-600 text-white shadow-md font-semibold'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <LockKey weight="bold" className="w-4 h-4" />
                      <span>Đăng nhập</span>
                    </button>

                    <button
                      onClick={() => setAuthMode('register')}
                      className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                        authMode === 'register'
                          ? 'bg-emerald-600 text-white shadow-md font-semibold'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Sparkle weight="bold" className="w-4 h-4" />
                      <span>Đăng ký mới</span>
                    </button>
                  </div>
                </div>

                {/* Render Selected Form */}
                {authMode === 'login' ? (
                  <LoginForm
                    apiBaseUrl={apiBaseUrl}
                    onSuccess={(data) => setAuthData(data)}
                    onSwitchToRegister={() => setAuthMode('register')}
                  />
                ) : (
                  <RegisterForm
                    apiBaseUrl={apiBaseUrl}
                    onSuccess={(data) => setAuthData(data)}
                    onSwitchToLogin={() => setAuthMode('login')}
                  />
                )}

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

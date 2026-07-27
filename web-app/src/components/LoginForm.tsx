import React, { useState } from 'react';
import { User, Lock, Eye, EyeSlash, ArrowRight, Spinner, Key, Warning } from '@phosphor-icons/react';

interface LoginFormProps {
  apiBaseUrl: string;
  onSuccess: (data: any) => void;
  onSwitchToRegister: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  apiBaseUrl,
  onSuccess,
  onSwitchToRegister,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick fill helper
  const handleQuickFill = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/profile/internal/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || data.code !== 1000) {
        throw new Error(data.message || `Lỗi đăng nhập (Mã: ${data.code || response.status})`);
      }

      // Success
      onSuccess(data.result);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Direct Keycloak SSO Redirect
  const handleKeycloakSSO = () => {
    // Redirect to Keycloak Auth Endpoint for Realm 'markie'
    const keycloakAuthUrl = `http://localhost:8280/realms/markie/protocol/openid-connect/auth?client_id=markie_app&response_type=code&scope=openid&redirect_uri=${encodeURIComponent(window.location.href)}`;
    window.open(keycloakAuthUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Đăng nhập</h2>
        <p className="text-sm text-zinc-400 mt-1">
          Chào mừng bạn quay trở lại
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start space-x-2.5 animate-fadeIn">
          <Warning weight="fill" className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block">Xác thực thất bại</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Username Field */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
            <span>Tên đăng nhập (Username)</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
              <User weight="bold" className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập username (ví dụ: john_doe)"
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/90 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-sans"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
            <span>Mật khẩu (Password)</span>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-[11px] text-zinc-400 hover:text-white transition-colors"
            >
              {showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            </button>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
              <Lock weight="bold" className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-10 py-2.5 bg-zinc-900/90 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-sans"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300"
            >
              {showPassword ? <EyeSlash weight="bold" className="w-4 h-4" /> : <Eye weight="bold" className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium rounded-xl text-sm transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? (
            <>
              <Spinner weight="bold" className="w-4 h-4 animate-spin text-white" />
              <span>Đang xử lý...</span>
            </>
          ) : (
            <>
              <span>Đăng nhập</span>
              <ArrowRight weight="bold" className="w-4 h-4" />
            </>
          )}
        </button>

      </form>

      {/* Quick Demo Credentials */}
      <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-2">
        <span className="text-[11px] font-mono text-zinc-400 block">Quick Demo Fill:</span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleQuickFill('john_doe', 'Password123!')}
            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-mono text-zinc-300 border border-zinc-700/50 transition-colors"
          >
            john_doe / Password123!
          </button>
        </div>
      </div>

      {/* Switch to Register Link */}
      <div className="text-center text-xs text-zinc-400">
        Chưa có tài khoản?{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-blue-400 hover:text-blue-300 font-medium underline underline-offset-4 cursor-pointer"
        >
          Đăng ký tài khoản mới
        </button>
      </div>

    </div>
  );
};

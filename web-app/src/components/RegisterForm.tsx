import React, { useState } from 'react';
import { User, Lock, EnvelopeSimple, IdentificationCard, Calendar, ArrowRight, Spinner, Warning } from '@phosphor-icons/react';

interface RegisterFormProps {
  apiBaseUrl: string;
  onSuccess: (data: any) => void;
  onSwitchToLogin: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  apiBaseUrl,
  onSuccess,
  onSwitchToLogin,
}) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    dob: '2000-01-01',
  });

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password || !formData.email) {
      setError('Vui lòng điền các trường bắt buộc (Username, Email, Mật khẩu).');
      return;
    }

    setLoading(true);
    setError(null);
    setStep('Đang xử lý đăng ký...');

    try {
      setStep('Đang tạo tài khoản...');
      
      const response = await fetch(`${apiBaseUrl}/profile/internal/registration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || data.code !== 1000) {
        throw new Error(data.message || `Đăng ký thất bại (Mã: ${data.code || response.status})`);
      }

      setStep('Đăng ký thành công!');
      
      // Pass created profile response to parent
      onSuccess(data.result);
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
      setStep(null);
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Đăng ký tài khoản</h2>
        <p className="text-sm text-zinc-400 mt-1">
          Tạo tài khoản mới để tham gia cộng đồng
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start space-x-2.5 animate-fadeIn">
          <Warning weight="fill" className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block">Đăng ký thất bại</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Step Indicator */}
      {step && (
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs flex items-center space-x-2.5 font-mono">
          <Spinner weight="bold" className="w-4 h-4 animate-spin flex-shrink-0" />
          <span>{step}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        
        {/* Username & Email Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Username */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-300">Username *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <User weight="bold" className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                name="username"
                required
                minLength={4}
                value={formData.username}
                onChange={handleChange}
                placeholder="markie_user"
                className="w-full pl-9 pr-3 py-2 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-300">Email *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <EnvelopeSimple weight="bold" className="w-3.5 h-3.5" />
              </div>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="user@example.com"
                className="w-full pl-9 pr-3 py-2 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* First Name & Last Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-300">First Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <IdentificationCard weight="bold" className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Alex"
                className="w-full pl-9 pr-3 py-2 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-300">Last Name</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Nguyen"
              className="w-full px-3 py-2 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Password & DOB Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-300">Password * (≥ 6 ký tự)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <Lock weight="bold" className="w-3.5 h-3.5" />
              </div>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-300">Ngày sinh (DOB)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <Calendar weight="bold" className="w-3.5 h-3.5" />
              </div>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                className="w-full pl-9 pr-3 py-2 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 transition-all font-mono"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 mt-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-medium rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? (
            <>
              <Spinner weight="bold" className="w-4 h-4 animate-spin text-white" />
              <span>Đang xử lý...</span>
            </>
          ) : (
            <>
              <span>Đăng ký tài khoản</span>
              <ArrowRight weight="bold" className="w-4 h-4" />
            </>
          )}
        </button>

      </form>

      {/* Switch to Login */}
      <div className="text-center text-xs text-zinc-400 pt-2">
        Đã có tài khoản?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-emerald-400 hover:text-emerald-300 font-medium underline underline-offset-4 cursor-pointer"
        >
          Đăng nhập ngay
        </button>
      </div>

    </div>
  );
};

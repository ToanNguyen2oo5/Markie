import React, { useState, useEffect } from 'react';
import { 
  User, 
  SignOut,
  EnvelopeSimple,
  Calendar,
  Image
} from '@phosphor-icons/react';

interface AuthSuccessModalProps {
  authData: any; // TokenExchangeResponse or ProfileResponse
  apiBaseUrl: string;
  onLogout: () => void;
}

export const AuthSuccessModal: React.FC<AuthSuccessModalProps> = ({
  authData,
  apiBaseUrl,
  onLogout,
}) => {
  const [profile, setProfile] = useState<any>(authData.username ? authData : null);
  const [loading, setLoading] = useState(!authData.username);

  // Extract access token if available
  const accessToken = authData.accessToken || authData.access_token || '';

  useEffect(() => {
    // If we only got tokens (from login), fetch the actual profile
    if (!profile && accessToken) {
      const fetchProfile = async () => {
        try {
          const response = await fetch(`${apiBaseUrl}/profile/users/my-profile`, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
          const data = await response.json();
          if (response.ok && data.code === 1000) {
            setProfile(data.result);
          }
        } catch (err) {
          console.error("Failed to fetch profile", err);
        } finally {
          setLoading(false);
        }
      };
      fetchProfile();
    }
  }, [accessToken, apiBaseUrl, profile]);

  return (
    <div className="liquid-glass rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl border border-zinc-800/80">
      
      {/* Top Banner */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Trang cá nhân</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Chào mừng bạn đến với cộng đồng Markie
          </p>
        </div>

        <button
          onClick={onLogout}
          className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/30 text-xs font-medium text-zinc-300 hover:text-red-400 transition-all flex items-center space-x-1.5 active:scale-[0.98] cursor-pointer"
        >
          <SignOut weight="bold" className="w-4 h-4" />
          <span className="hidden sm:inline">Đăng xuất</span>
        </button>
      </div>

      {/* Profile Card */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-pulse flex flex-col items-center space-y-4">
            <div className="w-20 h-20 bg-zinc-800 rounded-full"></div>
            <div className="w-32 h-4 bg-zinc-800 rounded"></div>
            <div className="w-24 h-3 bg-zinc-800 rounded"></div>
          </div>
        </div>
      ) : profile ? (
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center pt-2">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-400 p-1 mb-4 shadow-xl shadow-blue-500/20">
              <div className="w-full h-full bg-zinc-900 rounded-full flex items-center justify-center text-4xl font-bold text-white uppercase">
                {profile.firstName ? profile.firstName[0] : profile.username?.[0] || 'U'}
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white">
              {profile.firstName ? `${profile.firstName} ${profile.lastName || ''}` : profile.username}
            </h3>
            <p className="text-blue-400 font-medium">@{profile.username}</p>
          </div>

          <div className="bg-zinc-900/60 rounded-2xl border border-zinc-800 p-4 space-y-3">
            <div className="flex items-center space-x-3 text-zinc-300">
              <EnvelopeSimple className="w-5 h-5 text-zinc-500" />
              <span>{profile.email}</span>
            </div>
            {profile.dob && (
              <div className="flex items-center space-x-3 text-zinc-300">
                <Calendar className="w-5 h-5 text-zinc-500" />
                <span>Sinh nhật: {profile.dob}</span>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-3 text-center">
              <span className="block text-2xl font-bold text-white">0</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Bài viết</span>
            </div>
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-3 text-center">
              <span className="block text-2xl font-bold text-white">0</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Bạn bè</span>
            </div>
          </div>
          
          <button className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center space-x-2">
            <Image weight="bold" className="w-4 h-4" />
            <span>Tạo bài viết mới</span>
          </button>
        </div>
      ) : (
        <div className="text-center py-10 text-zinc-400">
          Không thể tải thông tin cá nhân.
        </div>
      )}

    </div>
  );
};

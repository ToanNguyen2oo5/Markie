import React from 'react';
import { 
  SignOut,
  EnvelopeSimple,
  Calendar,
  Image,
  MapPin
} from '@phosphor-icons/react';

interface AuthSuccessModalProps {
  profileData: any;
  keycloakToken: string;
  onLogout: () => void;
}

export const AuthSuccessModal: React.FC<AuthSuccessModalProps> = ({
  profileData,
  keycloakToken: _keycloakToken,
  onLogout,
}) => {
  const profile = profileData;

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
      {profile ? (
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
            {profile.email && (
              <div className="flex items-center space-x-3 text-zinc-300">
                <EnvelopeSimple className="w-5 h-5 text-zinc-500" />
                <span>{profile.email}</span>
              </div>
            )}
            {profile.dob && (
              <div className="flex items-center space-x-3 text-zinc-300">
                <Calendar className="w-5 h-5 text-zinc-500" />
                <span>Sinh nhật: {profile.dob}</span>
              </div>
            )}
            {profile.address && (
              <div className="flex items-center space-x-3 text-zinc-300">
                <MapPin className="w-5 h-5 text-zinc-500" />
                <span>Địa chỉ: {profile.address}</span>
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

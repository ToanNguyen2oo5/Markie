import { useState, useEffect, memo } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  ArrowLeft, MapPin, Envelope, Calendar, Pencil,
  Article, UserCircle, ArrowClockwise, Warning, Camera,
  ChatCircleText, UserPlus
} from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import { useProfile, type ProfileData } from '../context/ProfileContext';
import keycloak from '../keycloak';

// ─── GPU-Accelerated Animation Variants (No heavy spring physics loop) ─────────
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.02 },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25, ease: 'easeOut' } },
};

function formatDob(dob: string | null): string {
  if (!dob) return '—';
  try {
    return new Date(dob).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return dob;
  }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const ProfileSkeleton = memo(function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-52 bg-zinc-800 rounded-2xl mb-0" />
      <div className="px-8 -mt-12 pb-8">
        <div className="w-24 h-24 rounded-2xl bg-zinc-700 border-4 border-zinc-900 mb-4" />
        <div className="h-6 w-48 bg-zinc-700 rounded-full mb-2" />
        <div className="h-4 w-32 bg-zinc-800 rounded-full mb-6" />
        <div className="grid grid-cols-2 gap-3 mt-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-zinc-800 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
});

// ─── Stat Chip (Memoized) ─────────────────────────────────────────────────────
const StatChip = memo(function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <motion.div
      variants={fadeUp}
      className="flex flex-col gap-1 bg-zinc-800/60 border border-zinc-700/50 rounded-xl px-4 py-3"
    >
      <span className="text-zinc-400 text-[11px] uppercase tracking-widest font-semibold">{label}</span>
      <span className="text-zinc-100 text-[15px] font-medium truncate">{value}</span>
    </motion.div>
  );
});

// ─── InfoRow (Memoized) ───────────────────────────────────────────────────────
const InfoRow = memo(function InfoRow({
  icon, label, value, mono = false,
}: {
  icon: React.ReactNode; label: string; value: string; mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 bg-zinc-900/50 border border-zinc-800/50 rounded-xl px-4 py-3.5">
      {icon}
      <div className="flex flex-col min-w-0">
        <span className="text-zinc-500 text-[11px] uppercase tracking-widest font-semibold">{label}</span>
        <span className={`text-zinc-200 text-[14px] mt-0.5 truncate ${mono ? 'font-mono text-[12px] text-zinc-400' : ''}`}>
          {value}
        </span>
      </div>
    </div>
  );
});

// ─── Main Page ────────────────────────────────────────────────────────────────
export function ProfilePage() {
  const { authenticated } = useAuth();
  const navigate = useNavigate();
  const { userId } = useParams();

  const {
    profile: myProfile,
    loading: myLoading,
    avatarUrl: myAvatarUrl,
    fullName: myFullName,
    updateProfile,
    uploadAvatar,
    isAvatarUpdating,
  } = useProfile();

  const [otherProfile, setOtherProfile] = useState<ProfileData | null>(null);
  const [otherLoading, setOtherLoading] = useState(false);
  const [otherError, setOtherError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const isOwner = !userId || (myProfile?.userId && userId === myProfile.userId);

  useEffect(() => {
    if (!authenticated) {
      navigate('/', { replace: true });
      return;
    }

    if (userId && myProfile?.userId && userId !== myProfile.userId) {
      setOtherLoading(true);
      setOtherError(null);

      (async () => {
        try {
          await keycloak.updateToken(30).catch(() => {});
          const headers: Record<string, string> = {};
          if (keycloak.token) headers['Authorization'] = `Bearer ${keycloak.token}`;

          const res = await fetch(`/profile/users/user/${encodeURIComponent(userId)}`, { headers });
          if (!res.ok) {
            setOtherError('Không tìm thấy thông tin người dùng.');
            return;
          }
          const data = await res.json();
          if (data.code === 1000) {
            setOtherProfile(data.result as ProfileData);
          } else {
            setOtherError(data.message || 'Không thể tải thông tin người dùng.');
          }
        } catch {
          setOtherError('Lỗi kết nối máy chủ khi tải hồ sơ.');
        } finally {
          setOtherLoading(false);
        }
      })();
    } else {
      setOtherProfile(null);
      setOtherError(null);
    }
  }, [authenticated, navigate, userId, myProfile?.userId]);

  const activeProfile = isOwner ? myProfile : otherProfile;
  const activeLoading = isOwner ? myLoading : otherLoading;
  const activeError = isOwner ? null : otherError;

  const activeAvatarUrl = isOwner
    ? myAvatarUrl
    : activeProfile?.avatar || (activeProfile?.userId ? `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(activeProfile.userId)}&size=150` : 'https://i.pravatar.cc/150?img=11');

  const activeFullName = isOwner
    ? myFullName
    : activeProfile
      ? `${activeProfile.firstName ?? ''} ${activeProfile.lastName ?? ''}`.trim() || activeProfile.username
      : '';

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await uploadAvatar(file);
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-100 font-[Outfit,system-ui,sans-serif]">

      {/* ── Ambient background ── */}
      <div
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
        style={{
          backgroundImage: `
            radial-gradient(circle 50vw at 15% 0%, rgba(30, 58, 138, 0.18) 0%, transparent 70%),
            radial-gradient(circle 40vw at 85% 65%, rgba(39, 39, 42, 0.15) 0%, transparent 65%)
          `,
        }}
      />

      {/* ── Top bar ────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-zinc-950/95 border-b border-zinc-800/60 z-40 flex items-center px-4 gap-4 shadow-lg shadow-black/30">
        <Link
          to="/feed"
          className="flex items-center gap-2 group"
        >
          <img src="/favicon.svg" alt="Markie logo" className="w-7 h-7 group-hover:scale-110 transition-transform duration-200" />
          <span className="font-bold text-[16px] text-white tracking-tight hidden sm:block">Markie</span>
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 text-zinc-400">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">
            {isOwner ? 'Hồ sơ cá nhân' : `Trang của ${activeFullName || 'người dùng'}`}
          </span>
        </div>
        <div className="flex-1" />
        <div className="w-[88px]" />
      </header>

      {/* ── Main ───────────────────────────────────────────── */}
      <main className="relative z-10 pt-14 flex flex-col items-center px-4 pb-20">
        <div className="w-full max-w-[720px]">

          <AnimatePresence mode="wait">
            {activeLoading ? (
              <motion.div
                key="skeleton"
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="mt-6"
              >
                <ProfileSkeleton />
              </motion.div>
            ) : activeError ? (
              <motion.div
                key="error"
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="mt-20 flex flex-col items-center gap-4 text-center"
              >
                <Article className="w-12 h-12 text-zinc-600" />
                <p className="text-zinc-400">{activeError}</p>
                <button
                  onClick={() => navigate('/feed')}
                  className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Quay lại Bảng tin
                </button>
              </motion.div>
            ) : activeProfile ? (
              <motion.div
                key={activeProfile.userId}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="mt-6"
              >
                {/* Cover photo */}
                <motion.div
                  variants={fadeIn}
                  className="w-full h-52 rounded-2xl overflow-hidden relative"
                >
                  <img
                    src={`https://picsum.photos/seed/${activeProfile.userId}/800/300`}
                    alt="Cover"
                    loading="eager"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/60 to-transparent pointer-events-none" />
                </motion.div>

                {/* Avatar + name row */}
                <motion.div
                  variants={fadeUp}
                  className="flex flex-col sm:flex-row sm:items-end gap-4 px-6 -mt-12 mb-6"
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0 group/avatar">
                    <div
                      className={`w-24 h-24 rounded-2xl overflow-hidden border-4 border-zinc-950 shadow-xl relative ${
                        isOwner && !isAvatarUpdating
                          ? 'cursor-pointer hover:scale-[1.03] active:scale-[0.98] transition-transform duration-200 ease-out'
                          : ''
                      }`}
                      onClick={() => isOwner && !isAvatarUpdating && document.getElementById('avatar-upload')?.click()}
                    >
                      <img
                        src={activeAvatarUrl}
                        alt={activeFullName}
                        loading="eager"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                      {/* Upload overlay only for owner */}
                      {isOwner && (
                        <div
                          className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-200 ${
                            isAvatarUpdating
                              ? 'bg-black/60 opacity-100 backdrop-blur-[2px]'
                              : 'bg-black/50 opacity-0 group-hover/avatar:opacity-100'
                          }`}
                        >
                          {isAvatarUpdating ? (
                            <div className="flex flex-col items-center gap-1">
                              <ArrowClockwise className="w-6 h-6 text-blue-400 animate-spin" />
                              <span className="text-[10px] font-semibold text-zinc-200">Đang lưu...</span>
                            </div>
                          ) : (
                            <Camera className="w-6 h-6 text-white" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Hidden file input for owner */}
                    {isOwner && (
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        disabled={isAvatarUpdating}
                      />
                    )}

                    {/* Status badge */}
                    {isOwner && isAvatarUpdating ? (
                      <span className="absolute bottom-1 right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-zinc-950 flex items-center justify-center shadow-md shadow-blue-500/50">
                        <ArrowClockwise className="w-2.5 h-2.5 text-white animate-spin" />
                      </span>
                    ) : (
                      <span className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-zinc-950 animate-pulse" />
                    )}
                  </div>

                  {/* Name block */}
                  <div className="flex-1 pb-1">
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-100 leading-tight">
                      {activeFullName}
                    </h1>
                    <p className="text-zinc-400 text-sm mt-0.5">@{activeProfile.username}</p>
                  </div>

                  {/* Action buttons */}
                  {isOwner ? (
                    <button
                      type="button"
                      onClick={() => setEditOpen(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 rounded-xl text-sm font-medium text-zinc-200 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                      Chỉnh sửa hồ sơ
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-[#0866FF] hover:bg-[#0866FF]/90 rounded-xl text-sm font-semibold text-white transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4" />
                        Thêm bạn bè
                      </button>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 px-3.5 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 rounded-xl text-sm font-medium text-zinc-200 transition-all cursor-pointer"
                      >
                        <ChatCircleText className="w-4 h-4" />
                        Nhắn tin
                      </button>
                    </div>
                  )}
                </motion.div>

                {/* ── Info grid ── */}
                <motion.div
                  variants={fadeUp}
                  className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-3 px-6"
                >
                  <InfoRow icon={<Envelope className="w-5 h-5 text-blue-400 flex-shrink-0" />} label="Email" value={activeProfile.email ?? '—'} />
                  <InfoRow icon={<MapPin className="w-5 h-5 text-rose-400 flex-shrink-0" />} label="Địa chỉ" value={activeProfile.address ?? 'Chưa cập nhật'} />
                  <InfoRow icon={<Calendar className="w-5 h-5 text-amber-400 flex-shrink-0" />} label="Ngày sinh" value={formatDob(activeProfile.dob)} />
                  <InfoRow icon={<UserCircle className="w-5 h-5 text-violet-400 flex-shrink-0" />} label="Profile ID" value={activeProfile.profileId} mono />
                </motion.div>

                {/* ── Stat chips ── */}
                <motion.div
                  variants={containerVariants}
                  className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 mt-6"
                >
                  <StatChip label="Bài viết" value="—" />
                  <StatChip label="Bạn bè" value="—" />
                  <StatChip label="Đang theo dõi" value="—" />
                  <StatChip label="Người theo dõi" value="—" />
                </motion.div>

                {/* ── Edit Modal only for owner ── */}
                <AnimatePresence>
                  {isOwner && editOpen && activeProfile && (
                    <EditProfileModal
                      profile={activeProfile}
                      onClose={() => setEditOpen(false)}
                      onSaved={(updated) => {
                        updateProfile(updated);
                        setEditOpen(false);
                      }}
                    />
                  )}
                </AnimatePresence>

              </motion.div>
            ) : null}
          </AnimatePresence>

        </div>
      </main>
    </div>
  );
}

// ─── EditProfileModal ─────────────────────────────────────────────────────────
interface EditModalProps {
  profile: ProfileData;
  onClose: () => void;
  onSaved: (updated: ProfileData) => void;
}

function EditProfileModal({ profile, onClose, onSaved }: EditModalProps) {
  const [form, setForm] = useState({
    email: profile.email ?? '',
    firstName: profile.firstName ?? '',
    lastName: profile.lastName ?? '',
    dob: profile.dob ?? '',
    address: profile.address ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    try {
      await keycloak.updateToken(30);
    } catch { /* ignore */ }

    try {
      const res = await fetch('/profile/users/my-profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${keycloak.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: form.email || null,
          firstName: form.firstName || null,
          lastName: form.lastName || null,
          dob: form.dob || null,
          address: form.address || null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.code === 1000) {
        setSuccess(true);
        setTimeout(() => onSaved(data.result as ProfileData), 700);
      } else {
        setSaveError(data.message ?? 'Cập nhật thất bại');
      }
    } catch {
      setSaveError('Không thể kết nối đến máy chủ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="edit-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => !saving && onClose()}
        className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50"
      />

      {/* Modal */}
      <motion.div
        key="edit-modal"
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
      >
        <form
          onSubmit={handleSubmit}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-[480px] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
            <h2 className="text-zinc-100 font-semibold text-[16px] tracking-tight">Chỉnh sửa hồ sơ</h2>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Họ" name="firstName" value={form.firstName} onChange={handleChange} placeholder="Nguyễn" />
              <Field label="Tên" name="lastName" value={form.lastName} onChange={handleChange} placeholder="Toàn" />
            </div>
            <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" />
            <Field label="Ngày sinh" name="dob" type="date" value={form.dob} onChange={handleChange} />
            <Field label="Địa chỉ" name="address" value={form.address} onChange={handleChange} placeholder="123 Lê Lợi, TP.HCM" />

            {saveError && (
              <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-950/30 border border-rose-900/50 rounded-lg px-3 py-2.5">
                <Warning className="w-4 h-4 flex-shrink-0" />
                {saveError}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer
                ${success
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
            >
              {saving ? (
                <><ArrowClockwise className="w-4 h-4 animate-spin" /> Đang lưu...</>
              ) : success ? (
                <><Check className="w-4 h-4" /> Đã lưu</>
              ) : (
                'Lưu thay đổi'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({
  label, name, value, onChange, placeholder, type = 'text',
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-zinc-400 text-[12px] font-medium uppercase tracking-wider">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-zinc-800 border border-zinc-700/60 text-zinc-100 placeholder-zinc-600 rounded-xl px-3.5 py-2.5 text-[14px] outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/30 transition-all"
      />
    </div>
  );
}

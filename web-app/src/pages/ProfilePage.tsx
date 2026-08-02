import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, MapPin, Envelope, Calendar, Pencil,
  Article, UserCircle, ArrowClockwise, X, Check, Warning
} from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import keycloak from '../keycloak';

interface ProfileData {
  profileId: string;
  userId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  dob: string | null;
  address: string | null;
}

// ─── Animation Variants ───────────────────────────────────────────────────────
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 20 } },
};
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4 } },
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
function ProfileSkeleton() {
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
}

// ─── Stat Chip ────────────────────────────────────────────────────────────────
function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <motion.div
      variants={fadeUp}
      className="flex flex-col gap-1 bg-zinc-800/60 border border-zinc-700/50 rounded-xl px-4 py-3"
    >
      <span className="text-zinc-400 text-[11px] uppercase tracking-widest font-semibold">{label}</span>
      <span className="text-zinc-100 text-[15px] font-medium truncate">{value}</span>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function ProfilePage() {
  const { authenticated } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!authenticated) { navigate('/', { replace: true }); return; }

    const fetchProfile = async () => {
      setLoading(true);
      try {
        await keycloak.updateToken(30);
      } catch { /* ignore */ }

      try {
        const res = await fetch('/profile/users/my-profile', {
          headers: { Authorization: `Bearer ${keycloak.token}` },
        });
        if (!res.ok) { setError('Không thể tải thông tin hồ sơ.'); return; }
        const data = await res.json();
        if (data.code === 1000) setProfile(data.result);
        else setError(data.message ?? 'Lỗi không xác định.');
      } catch {
        setError('Không thể kết nối đến máy chủ.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [authenticated, navigate]);

  const fullName = profile
    ? `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() || profile.username
    : '';

  const avatarSeed = profile?.userId
    ? profile.userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 70 + 1
    : 11;

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-100 font-[Outfit,system-ui,sans-serif]">

      {/* ── Ambient background ─────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-[25%] left-[10%] w-[60vw] h-[60vw] rounded-full bg-blue-950/30 blur-[130px]" />
        <div className="absolute top-[50%] right-[5%] w-[40vw] h-[40vw] rounded-full bg-zinc-800/20 blur-[120px]" />
      </div>

      {/* ── Top bar ────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/60 z-40 flex items-center px-4 gap-4">
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
          <span className="text-sm font-medium">Hồ sơ cá nhân</span>
        </div>
        <div className="flex-1" />
        <div className="w-[88px]" />
      </header>

      {/* ── Main ───────────────────────────────────────────── */}
      <main className="relative z-10 pt-14 flex flex-col items-center px-4 pb-20">
        <div className="w-full max-w-[720px]">

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="skeleton" {...fadeIn} className="mt-6">
                <ProfileSkeleton />
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                {...fadeIn}
                className="mt-20 flex flex-col items-center gap-4 text-center"
              >
                <Article className="w-12 h-12 text-zinc-600" />
                <p className="text-zinc-400">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <ArrowClockwise className="w-4 h-4" /> Thử lại
                </button>
              </motion.div>
            ) : profile ? (
              <motion.div
                key="profile"
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
                    src={`https://picsum.photos/seed/${profile.userId}/800/300`}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                  {/* subtle vignette */}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/60 to-transparent" />
                </motion.div>

                {/* Avatar + name row */}
                <motion.div
                  variants={fadeUp}
                  className="flex flex-col sm:flex-row sm:items-end gap-4 px-6 -mt-12 mb-6"
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <motion.div
                      whileHover={{ scale: 1.04 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                      className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-zinc-950 shadow-xl"
                    >
                      <img
                        src={`https://i.pravatar.cc/150?img=${avatarSeed}`}
                        alt={fullName}
                        className="w-full h-full object-cover"
                      />
                    </motion.div>
                    {/* online pulse */}
                    <span className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-zinc-950 animate-pulse" />
                  </div>

                  {/* Name block */}
                  <div className="flex-1 pb-1">
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-100 leading-tight">
                      {fullName}
                    </h1>
                    <p className="text-zinc-400 text-sm mt-0.5">@{profile.username}</p>
                  </div>

                  {/* Edit button */}
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setEditOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 rounded-xl text-sm font-medium text-zinc-200 transition-colors cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                    Chỉnh sửa hồ sơ
                  </motion.button>
                </motion.div>

                {/* ── Info grid (asymmetric 3-col → 1-col mobile) ── */}
                <motion.div
                  variants={fadeUp}
                  className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-3 px-6"
                >
                  <InfoRow icon={<Envelope className="w-5 h-5 text-blue-400 flex-shrink-0" />} label="Email" value={profile.email ?? '—'} />
                  <InfoRow icon={<MapPin className="w-5 h-5 text-rose-400 flex-shrink-0" />} label="Địa chỉ" value={profile.address ?? 'Chưa cập nhật'} />
                  <InfoRow icon={<Calendar className="w-5 h-5 text-amber-400 flex-shrink-0" />} label="Ngày sinh" value={formatDob(profile.dob)} />
                  <InfoRow icon={<UserCircle className="w-5 h-5 text-violet-400 flex-shrink-0" />} label="Profile ID" value={profile.profileId} mono />
                </motion.div>

                {/* ── Stat chips ─────────────────────────────────── */}
                <motion.div
                  variants={containerVariants}
                  className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 mt-6"
                >
                  <StatChip label="Bài viết" value="—" />
                  <StatChip label="Bạn bè" value="—" />
                  <StatChip label="Đang theo dõi" value="—" />
                  <StatChip label="Người theo dõi" value="—" />
                </motion.div>

                {/* ── Edit Modal ─────────────────────────────────── */}
                <AnimatePresence>
                  {editOpen && (
                    <EditProfileModal
                      profile={profile}
                      onClose={() => setEditOpen(false)}
                      onSaved={(updated) => {
                        setProfile(updated);
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

// ─── InfoRow ──────────────────────────────────────────────────────────────────
function InfoRow({
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
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
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
            <motion.button
              type="submit"
              disabled={saving}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer
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
            </motion.button>
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


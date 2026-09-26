import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  Users,
  MagnifyingGlass,
  ArrowClockwise,
  ArrowRight,
  User,
  MapPin,
  Envelope,
  UserCircle,
} from '@phosphor-icons/react';
import { Header } from '../components/feed/Header';
import { FriendActionButton } from '../components/social/FriendActionButton';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { getAllUsers } from '../services/socialApi';
import type { FriendProfile } from '../types/socialTypes';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export function FriendsPage() {
  const { authenticated } = useAuth();
  const { profile: myProfile } = useProfile();
  const navigate = useNavigate();

  const [users, setUsers] = useState<FriendProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authenticated) {
      navigate('/', { replace: true });
    }
  }, [authenticated, navigate]);

  const loadSuggestedUsers = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError(null);

    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách đề xuất';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSuggestedUsers();
  }, [loadSuggestedUsers]);

  // Exclude current logged in user from recommendations
  const filteredUsers = useMemo(() => {
    const currentId = myProfile?.userId;
    const list = currentId ? users.filter((u) => u.userId !== currentId) : users;

    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;

    return list.filter((u) => {
      const fullName = `${u.firstName ?? ''} ${u.lastName ?? ''}`.toLowerCase();
      const username = (u.username ?? '').toLowerCase();
      const email = (u.email ?? '').toLowerCase();
      const address = (u.address ?? '').toLowerCase();
      return (
        fullName.includes(q) ||
        username.includes(q) ||
        email.includes(q) ||
        address.includes(q)
      );
    });
  }, [users, myProfile?.userId, searchQuery]);

  const getAvatarUrl = (user: FriendProfile) => {
    if (user.avatar) return user.avatar;
    return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(
      user.userId
    )}&size=100`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-[Outfit,system-ui,sans-serif] selection:bg-blue-500/20 selection:text-blue-300">
      {/* ── Fixed Navigation Header ── */}
      <Header />

      {/* ── Ambient Subtle Background (Minimalist depth) ── */}
      <div
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
        style={{
          backgroundImage: `
            radial-gradient(circle 50vw at 20% 0%, rgba(30, 58, 138, 0.08) 0%, transparent 65%),
            radial-gradient(circle 40vw at 80% 80%, rgba(39, 39, 42, 0.08) 0%, transparent 60%)
          `,
        }}
      />

      {/* ── Main Content Area ── */}
      <main className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-22 pb-24">
        {/* ── Editorial Header Section ── */}
        <section className="mb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pb-6 border-b border-zinc-800/80">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[11px] font-mono font-semibold uppercase tracking-wider text-blue-400 mb-2">
                <Users weight="bold" className="w-3.5 h-3.5" />
                <span>Mạng lưới kết nối</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
                Đề xuất bạn bè
              </h1>
              <p className="text-sm text-zinc-400 mt-1 max-w-xl leading-relaxed">
                Khám phá các thành viên trong cộng đồng Markie và mở rộng vòng kết nối của bạn.
              </p>
            </div>

            {/* Actions & Search */}
            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-72">
                <MagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên, username..."
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all"
                />
              </div>

              <button
                type="button"
                onClick={() => loadSuggestedUsers(true)}
                disabled={loading || refreshing}
                className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors active:scale-[0.98] cursor-pointer disabled:opacity-50"
                title="Làm mới danh sách"
              >
                <ArrowClockwise
                  className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-400' : ''}`}
                />
              </button>
            </div>
          </div>

          {/* Results Summary Bar */}
          <div className="flex items-center justify-between mt-4 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="font-mono text-zinc-300 font-medium">
                {filteredUsers.length}
              </span>
              <span>người dùng được đề xuất</span>
            </div>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-blue-400 hover:text-blue-300 underline cursor-pointer"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        </section>

        {/* ── Content Grid ── */}
        {loading ? (
          // Skeleton Loading Grid
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 animate-pulse space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-zinc-800 rounded w-3/4" />
                    <div className="h-3 bg-zinc-800/60 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-9 bg-zinc-800/60 rounded-xl w-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          // Error State
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-3 bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8">
            <p className="text-zinc-300 text-sm font-medium">{error}</p>
            <p className="text-xs text-zinc-500">
              Có thể máy chủ tạm thời không phản hồi. Hãy thử tải lại trang.
            </p>
            <button
              type="button"
              onClick={() => loadSuggestedUsers(false)}
              className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer"
            >
              Thử lại ngay
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          // Empty State
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-3 bg-zinc-900/20 border border-zinc-800/60 rounded-2xl p-8">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
              <User className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-zinc-200">
              {searchQuery ? 'Không tìm thấy người dùng phù hợp' : 'Chưa có đề xuất bạn bè mới'}
            </p>
            <p className="text-xs text-zinc-500 max-w-sm leading-relaxed">
              {searchQuery
                ? 'Hãy thử tìm kiếm với từ khóa khác hoặc kiểm tra lại chính tả.'
                : 'Mọi người dùng khả dụng đã được kết nối hoặc danh sách tạm thời trống.'}
            </p>
          </div>
        ) : (
          // Suggestions Cards Grid
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <AnimatePresence>
              {filteredUsers.map((user) => {
                const fullName =
                  `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() ||
                  user.username;

                return (
                  <motion.div
                    key={user.userId}
                    variants={cardVariants}
                    className="group relative flex flex-col justify-between p-5 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700/80 transition-all duration-200 shadow-sm"
                  >
                    <div>
                      {/* Top User Info */}
                      <div className="flex items-start gap-3.5 mb-4">
                        <div
                          onClick={() =>
                            navigate(`/profile/${encodeURIComponent(user.userId)}`)
                          }
                          className="relative w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 bg-zinc-800 border border-zinc-700/60 group-hover:border-blue-500/50 transition-colors cursor-pointer"
                        >
                          <img
                            src={getAvatarUrl(user)}
                            alt={fullName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h2
                            onClick={() =>
                              navigate(`/profile/${encodeURIComponent(user.userId)}`)
                            }
                            className="text-base font-semibold text-zinc-100 group-hover:text-blue-400 transition-colors truncate cursor-pointer leading-snug"
                          >
                            {fullName}
                          </h2>
                          <p className="text-xs text-zinc-400 font-mono truncate mt-0.5">
                            @{user.username}
                          </p>

                          {user.address && (
                            <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-2 truncate">
                              <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400" />
                              <span className="truncate">{user.address}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Meta badge */}
                      <div className="flex flex-wrap items-center gap-2 mb-4 pt-1 border-t border-zinc-800/50">
                        {user.email && (
                          <div className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-400 truncate max-w-full">
                            <Envelope className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                            <span className="truncate">{user.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/60">
                      <div className="flex-1">
                        <FriendActionButton
                          targetUserId={user.userId}
                          targetUsername={user.username}
                          targetName={fullName}
                          className="w-full"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/profile/${encodeURIComponent(user.userId)}`)
                        }
                        className="px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium border border-zinc-700/60 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1"
                        title="Xem trang cá nhân"
                      >
                        <UserCircle className="w-4 h-4" />
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </main>
    </div>
  );
}

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
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-500/20 selection:text-indigo-700 dark:selection:text-indigo-300 transition-colors duration-200">
      {/* Fixed Navigation Header */}
      <Header />

      {/* Ambient Subtle Background */}
      <div
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
        style={{
          backgroundImage: `
            radial-gradient(circle 50vw at 20% 0%, rgba(99, 102, 241, 0.04) 0%, transparent 65%),
            radial-gradient(circle 40vw at 80% 80%, rgba(148, 163, 184, 0.05) 0%, transparent 60%)
          `,
        }}
      />

      {/* Main Content Area */}
      <main className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-22 pb-24">
        {/* Editorial Header Section */}
        <section className="mb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pb-6 border-b border-slate-200 dark:border-slate-800/80">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-600/10 border border-indigo-200/80 dark:border-indigo-500/20 text-[11px] font-code font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">
                <Users weight="bold" className="w-3.5 h-3.5" />
                <span>Mạng lưới kết nối</span>
              </div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Đề xuất bạn bè
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
                Khám phá các thành viên trong cộng đồng GenV và mở rộng vòng kết nối của bạn.
              </p>
            </div>

            {/* Actions & Search */}
            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-72">
                <MagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên, username..."
                  className="w-full bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 dark:focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/15 transition-all shadow-2xs"
                />
              </div>

              <button
                type="button"
                onClick={() => loadSuggestedUsers(true)}
                disabled={loading || refreshing}
                className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors active:scale-[0.98] cursor-pointer disabled:opacity-50 shadow-2xs"
                title="Làm mới danh sách"
              >
                <ArrowClockwise
                  className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`}
                />
              </button>
            </div>
          </div>

          {/* Results Summary Bar */}
          <div className="flex items-center justify-between mt-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-code text-slate-700 dark:text-slate-300 font-medium">
                {filteredUsers.length}
              </span>
              <span>người dùng được đề xuất</span>
            </div>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 underline cursor-pointer"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        </section>

        {/* Content Grid */}
        {loading ? (
          // Skeleton Loading Grid
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl genv-card animate-pulse space-y-4 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-200 dark:bg-slate-800/80 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                    <div className="h-3 bg-slate-200/60 dark:bg-slate-800/60 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-9 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl w-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          // Error State
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-3 genv-card rounded-2xl p-8 shadow-xs">
            <p className="text-slate-800 dark:text-slate-300 text-sm font-medium">{error}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Có thể máy chủ tạm thời không phản hồi. Hãy thử tải lại trang.
            </p>
            <button
              type="button"
              onClick={() => loadSuggestedUsers(false)}
              className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer shadow-sm shadow-indigo-600/20"
            >
              Thử lại ngay
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          // Empty State
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-3 genv-card rounded-2xl p-8 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
              <User className="w-6 h-6" />
            </div>
            <p className="text-sm font-heading font-semibold text-slate-800 dark:text-slate-200">
              {searchQuery ? 'Không tìm thấy người dùng phù hợp' : 'Chưa có đề xuất bạn bè mới'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
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
                    className="genv-card group relative flex flex-col justify-between p-5 rounded-2xl transition-all duration-200 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-500/40"
                  >
                    <div>
                      {/* Top User Info */}
                      <div className="flex items-start gap-3.5 mb-4">
                        <div
                          onClick={() =>
                            navigate(`/profile/${encodeURIComponent(user.userId)}`)
                          }
                          className="relative w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 group-hover:border-indigo-500/50 transition-colors cursor-pointer"
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
                            className="font-heading text-base font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate cursor-pointer leading-snug"
                          >
                            {fullName}
                          </h2>
                          <p className="font-code text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            @{user.username}
                          </p>

                          {user.address && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-2 truncate">
                              <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-slate-400 dark:text-slate-500" />
                              <span className="truncate">{user.address}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Meta badge */}
                      <div className="flex flex-wrap items-center gap-2 mb-4 pt-2 border-t border-slate-100 dark:border-slate-800/50">
                        {user.email && (
                          <div className="inline-flex items-center gap-1 text-[11px] font-code text-slate-500 dark:text-slate-400 truncate max-w-full">
                            <Envelope className="w-3 h-3 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                            <span className="truncate">{user.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="flex items-center gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/60">
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
                        className="px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-medium border border-slate-200 dark:border-slate-700/60 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1"
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

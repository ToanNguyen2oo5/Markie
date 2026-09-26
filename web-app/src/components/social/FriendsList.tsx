import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  UsersThree,
  MagnifyingGlass,
  ArrowRight,
  Spinner,
  User,
} from '@phosphor-icons/react';
import type { FriendProfile } from '../../types/socialTypes';
import { getFriends } from '../../services/socialApi';

interface FriendsListProps {
  userId: string;
  isOwner?: boolean;
  onTotalFriendsChange?: (count: number) => void;
  className?: string;
}

const PAGE_SIZE = 12;

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
  },
};

export function FriendsList({
  userId,
  onTotalFriendsChange,
  className = '',
}: FriendsListProps) {
  const navigate = useNavigate();
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchFriendsList = useCallback(
    async (pageNum: number, isInitial = false) => {
      if (!userId) return;
      if (isInitial) setLoading(true);
      else setLoadingMore(true);

      setError(null);

      try {
        const result = await getFriends(userId, pageNum, PAGE_SIZE);
        if (isInitial) {
          setFriends(result);
          onTotalFriendsChange?.(result.length);
        } else {
          setFriends((prev) => {
            // Deduplicate by userId
            const existingIds = new Set(prev.map((f) => f.userId));
            const newItems = result.filter((f) => !existingIds.has(f.userId));
            const combined = [...prev, ...newItems];
            onTotalFriendsChange?.(combined.length);
            return combined;
          });
        }

        if (result.length < PAGE_SIZE) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
      } catch (err: unknown) {
        console.error('Failed to load friends list:', err);
        setError('Không thể tải danh sách bạn bè.');
      } finally {
        if (isInitial) setLoading(false);
        else setLoadingMore(false);
      }
    },
    [userId, onTotalFriendsChange]
  );

  useEffect(() => {
    setPage(0);
    setHasMore(true);
    fetchFriendsList(0, true);
  }, [userId, fetchFriendsList]);

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchFriendsList(nextPage, false);
  };

  const filteredFriends = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return friends;

    return friends.filter((f) => {
      const fullName = `${f.firstName ?? ''} ${f.lastName ?? ''}`.toLowerCase();
      const username = (f.username ?? '').toLowerCase();
      return fullName.includes(q) || username.includes(q);
    });
  }, [friends, filterQuery]);

  const getAvatarUrl = (friend: FriendProfile) => {
    if (friend.avatar) return friend.avatar;
    return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(
      friend.userId
    )}&size=80`;
  };

  return (
    <div
      className={`w-full bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-6 shadow-xl shadow-black/20 ${className}`}
    >
      {/* ── Section Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-800/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <UsersThree className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-zinc-100">Bạn bè</h2>
              {!loading && (
                <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700/60 text-xs font-medium text-zinc-300">
                  {friends.length}
                  {hasMore ? '+' : ''}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Danh sách những người dùng đã kết nối
            </p>
          </div>
        </div>

        {/* Filter input */}
        {friends.length > 0 && (
          <div className="relative w-full sm:w-56">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Tìm bạn bè..."
              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40 transition-all"
            />
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className="pt-5">
        {loading ? (
          // Skeleton loading grid
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/40 border border-zinc-800/60 animate-pulse"
              >
                <div className="w-11 h-11 rounded-full bg-zinc-700/50 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-zinc-700/60 rounded w-2/3" />
                  <div className="h-3 bg-zinc-700/40 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          // Error state
          <div className="py-8 flex flex-col items-center justify-center text-center text-zinc-400 space-y-2">
            <p className="text-sm">{error}</p>
            <button
              type="button"
              onClick={() => fetchFriendsList(0, true)}
              className="text-xs text-blue-400 hover:text-blue-300 underline cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        ) : filteredFriends.length === 0 ? (
          // Empty state
          <div className="py-10 flex flex-col items-center justify-center text-center space-y-2.5">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center text-zinc-500">
              <User className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-zinc-300">
              {filterQuery ? 'Không tìm thấy bạn bè phù hợp' : 'Chưa có bạn bè nào'}
            </p>
            <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
              {filterQuery
                ? 'Hãy thử tìm kiếm với tên hoặc username khác.'
                : 'Kết nối với những người dùng khác để cùng chia sẻ bài viết và tương tác.'}
            </p>
          </div>
        ) : (
          // Friends list grid
          <>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
            >
              <AnimatePresence>
                {filteredFriends.map((friend) => {
                  const fullName =
                    `${friend.firstName ?? ''} ${friend.lastName ?? ''}`.trim() ||
                    friend.username;

                  return (
                    <motion.div
                      key={friend.userId}
                      variants={cardVariants}
                      whileHover={{ scale: 1.015 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() =>
                        navigate(`/profile/${encodeURIComponent(friend.userId)}`)
                      }
                      className="group flex items-center gap-3 p-3 rounded-xl bg-zinc-950/40 hover:bg-zinc-800/60 border border-zinc-800/70 hover:border-zinc-700/80 transition-all duration-200 cursor-pointer shadow-sm"
                    >
                      {/* Avatar */}
                      <div className="relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-zinc-800 border border-zinc-700/50 group-hover:ring-2 group-hover:ring-blue-500/40 transition-all">
                        <img
                          src={getAvatarUrl(friend)}
                          alt={fullName}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-200 group-hover:text-white truncate transition-colors">
                          {fullName}
                        </p>
                        <p className="text-xs text-zinc-400 truncate">
                          @{friend.username}
                        </p>
                      </div>

                      <div className="text-zinc-600 group-hover:text-zinc-300 transition-colors pr-1">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>

            {/* Load more button */}
            {hasMore && !filterQuery && (
              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 text-xs font-semibold text-zinc-300 hover:text-white active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                >
                  {loadingMore ? (
                    <Spinner className="w-3.5 h-3.5 animate-spin" />
                  ) : null}
                  <span>{loadingMore ? 'Đang tải...' : 'Xem thêm bạn bè'}</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

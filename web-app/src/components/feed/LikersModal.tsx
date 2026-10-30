import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { X, Heart, ArrowClockwise } from '@phosphor-icons/react';
import { getPostLikers } from '../../services/postInteractionApi';
import type { LikerData } from '../../types/postTypes';
import { useProfile } from '../../context/ProfileContext';

interface LikersModalProps {
  postId: string;
  onClose: () => void;
}

function getFallbackAvatar(userId: string): string {
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(userId)}&size=40`;
}

export const LikersModal = memo(function LikersModal({ postId, onClose }: LikersModalProps) {
  const { profile, avatarUrl: myAvatarUrl } = useProfile();
  const [likers, setLikers] = useState<LikerData[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false);

  const loadLikers = useCallback(
    async (currentCursor: string | null) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      try {
        const page = await getPostLikers(postId, currentCursor, 20);
        setLikers((prev) => (currentCursor ? [...prev, ...page.data] : page.data));
        setCursor(page.nextCursor ?? null);
        setHasNext(page.hasNext);
      } catch (err) {
        console.error('Failed to load likers', err);
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [postId]
  );

  useEffect(() => {
    loadLikers(null);
  }, [loadLikers]);

  const resolveAvatar = (item: LikerData) => {
    if (profile?.userId === item.userId) return myAvatarUrl;
    if (item.avatar) return item.avatar;
    return getFallbackAvatar(item.userId);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl w-full max-w-[420px] flex flex-col max-h-[75vh] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500" weight="fill" />
            <h3 className="font-heading font-bold text-slate-900 dark:text-slate-100 text-base">
              Người đã thích
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" weight="bold" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {loading ? (
            <div className="flex justify-center py-10">
              <ArrowClockwise className="w-6 h-6 animate-spin text-rose-500" />
            </div>
          ) : likers.length === 0 ? (
            <div className="text-center text-slate-500 dark:text-slate-400 py-10 text-sm">
              Chưa có lượt thích nào
            </div>
          ) : (
            likers.map((item) => (
              <div
                key={item.userId}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={resolveAvatar(item)}
                    alt={item.username ?? 'user'}
                    className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-800 flex-shrink-0"
                  />
                  <span className="font-heading font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                    {item.username ?? 'Người dùng'}
                  </span>
                </div>
                <Heart className="w-4 h-4 text-rose-500 flex-shrink-0" weight="fill" />
              </div>
            ))
          )}

          {hasNext && !loading && (
            <button
              type="button"
              onClick={() => loadLikers(cursor)}
              className="w-full py-2 font-heading text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Xem thêm
            </button>
          )}
        </div>
      </div>
    </div>
  );
});


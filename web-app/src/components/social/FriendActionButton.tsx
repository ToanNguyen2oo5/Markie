import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus,
  UserCheck,
  UserMinus,
  Check,
  X,
  Spinner,
  CaretDown,
  Clock,
  WarningCircle,
} from '@phosphor-icons/react';
import { useToast } from '../../context/ToastContext';
import {
  type FriendshipState,
  resolveFriendshipState,
} from '../../types/socialTypes';
import {
  getRelationshipStatus,
  sendFriendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  unfriend,
} from '../../services/socialApi';

interface FriendActionButtonProps {
  targetUserId: string;
  targetUsername?: string;
  targetName?: string;
  initialState?: FriendshipState;
  onRelationshipChange?: (state: FriendshipState) => void;
  className?: string;
}

export function FriendActionButton({
  targetUserId,
  targetUsername,
  targetName,
  initialState,
  onRelationshipChange,
  className = '',
}: FriendActionButtonProps) {
  const toast = useToast();
  const [friendState, setFriendState] = useState<FriendshipState>(initialState ?? 'NONE');
  const [fetching, setFetching] = useState(initialState === undefined);
  const [actionLoading, setActionLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmUnfriendOpen, setConfirmUnfriendOpen] = useState(false);
  const [cancelHovered, setCancelHovered] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [menuOpen]);

  // Fetch initial relationship status if not provided or when targetUserId changes
  useEffect(() => {
    if (!targetUserId) return;
    let isCancelled = false;

    const loadStatus = async () => {
      setFetching(true);
      try {
        const status = await getRelationshipStatus(targetUserId);
        if (!isCancelled) {
          const resolved = resolveFriendshipState(status);
          setFriendState(resolved);
        }
      } catch (err) {
        console.error('Failed to load relationship status:', err);
      } finally {
        if (!isCancelled) setFetching(false);
      }
    };

    loadStatus();

    return () => {
      isCancelled = true;
    };
  }, [targetUserId]);

  const updateState = useCallback(
    (newState: FriendshipState) => {
      setFriendState(newState);
      onRelationshipChange?.(newState);
    },
    [onRelationshipChange]
  );

  // ── Actions ──────────────────────────────────────────────────────────

  const handleSendRequest = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await sendFriendRequest(targetUserId);
      updateState('REQUEST_SENT');
      toast.success(
        `Đã gửi lời mời kết bạn đến ${targetName || targetUsername || 'người dùng'}.`,
        'Đã gửi lời mời'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể gửi lời mời.';
      toast.error(msg, 'Thao tác thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await cancelFriendRequest(targetUserId);
      updateState('NONE');
      toast.info('Đã hủy lời mời kết bạn.', 'Đã hủy');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể hủy lời mời.';
      toast.error(msg, 'Thao tác thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await acceptFriendRequest(targetUserId);
      updateState('FRIENDS');
      toast.success(
        `Bạn và ${targetName || targetUsername || 'người dùng'} đã trở thành bạn bè!`,
        'Chấp nhận thành công'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể chấp nhận lời mời.';
      toast.error(msg, 'Thao tác thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await rejectFriendRequest(targetUserId);
      updateState('NONE');
      toast.info('Đã từ chối lời mời kết bạn.', 'Đã từ chối');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể từ chối lời mời.';
      toast.error(msg, 'Thao tác thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnfriendConfirm = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await unfriend(targetUserId);
      updateState('NONE');
      setConfirmUnfriendOpen(false);
      setMenuOpen(false);
      toast.info(
        `Đã hủy kết bạn với ${targetName || targetUsername || 'người dùng'}.`,
        'Đã hủy kết bạn'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể hủy kết bạn.';
      toast.error(msg, 'Thao tác thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Render Loading Skeleton ──────────────────────────────────────────
  if (fetching) {
    return (
      <div
        className={`h-10 w-32 rounded-xl bg-zinc-800/80 animate-pulse border border-zinc-700/40 ${className}`}
      />
    );
  }

  // ── State 1: REQUEST_RECEIVED (2 buttons: Chấp nhận & Từ chối) ────────
  if (friendState === 'REQUEST_RECEIVED') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          type="button"
          onClick={handleAcceptRequest}
          disabled={actionLoading}
          className="flex items-center gap-1.5 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-blue-600/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {actionLoading ? (
            <Spinner className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4 stroke-[2.5]" />
          )}
          <span>Chấp nhận</span>
        </button>

        <button
          type="button"
          onClick={handleRejectRequest}
          disabled={actionLoading}
          className="flex items-center gap-1.5 px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 hover:text-rose-400 active:scale-[0.98] border border-zinc-700/60 text-zinc-300 rounded-xl text-sm font-medium transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          title="Từ chối lời mời"
        >
          <X className="w-4 h-4" />
          <span>Từ chối</span>
        </button>
      </div>
    );
  }

  // ── State 2: REQUEST_SENT (Interactive hover to cancel) ──────────────
  if (friendState === 'REQUEST_SENT') {
    return (
      <div className={`relative ${className}`}>
        <button
          type="button"
          onClick={handleCancelRequest}
          onMouseEnter={() => setCancelHovered(true)}
          onMouseLeave={() => setCancelHovered(false)}
          disabled={actionLoading}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.98] cursor-pointer disabled:opacity-50 ${
            cancelHovered
              ? 'bg-rose-950/40 border border-rose-500/50 text-rose-300 shadow-sm shadow-rose-900/30'
              : 'bg-zinc-800/90 hover:bg-zinc-800 border border-zinc-700/70 text-zinc-300'
          }`}
        >
          {actionLoading ? (
            <Spinner className="w-4 h-4 animate-spin" />
          ) : cancelHovered ? (
            <X className="w-4 h-4 text-rose-400" />
          ) : (
            <Clock className="w-4 h-4 text-amber-400" />
          )}
          <span>{cancelHovered ? 'Hủy lời mời' : 'Đã gửi lời mời'}</span>
        </button>
      </div>
    );
  }

  // ── State 3: FRIENDS (Badge with menu to unfriend) ───────────────────
  if (friendState === 'FRIENDS') {
    return (
      <div ref={menuRef} className={`relative ${className}`}>
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          disabled={actionLoading}
          className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700/90 active:scale-[0.98] border border-zinc-700/70 rounded-xl text-sm font-medium text-zinc-100 transition-all cursor-pointer"
        >
          {actionLoading ? (
            <Spinner className="w-4 h-4 animate-spin text-zinc-400" />
          ) : (
            <UserCheck className="w-4 h-4 text-emerald-400" />
          )}
          <span>Bạn bè</span>
          <CaretDown
            className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
              menuOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Dropdown menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute right-0 mt-2 w-48 py-1.5 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-xl shadow-xl shadow-black/50 z-30 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmUnfriendOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors text-left cursor-pointer"
              >
                <UserMinus className="w-4 h-4 text-rose-400" />
                <span>Hủy kết bạn</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Unfriend confirmation modal */}
        <AnimatePresence>
          {confirmUnfriendOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.18 }}
                className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl shadow-black/70 space-y-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center flex-shrink-0 text-rose-400">
                    <WarningCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-100 text-base">
                      Hủy kết bạn?
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      Bạn có chắc muốn hủy kết bạn với{' '}
                      <span className="text-zinc-200 font-medium">
                        {targetName || targetUsername || 'người dùng này'}
                      </span>
                      ? Họ sẽ không còn nằm trong danh sách bạn bè của bạn.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmUnfriendOpen(false)}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={handleUnfriendConfirm}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-rose-600/30 cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading && <Spinner className="w-3.5 h-3.5 animate-spin" />}
                    <span>Xác nhận hủy</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── State 4: NONE (Primary "Thêm bạn bè" button) ──────────────────────
  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={handleSendRequest}
        disabled={actionLoading}
        className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] rounded-xl text-sm font-semibold text-white transition-all shadow-md shadow-blue-600/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {actionLoading ? (
          <Spinner className="w-4 h-4 animate-spin" />
        ) : (
          <UserPlus className="w-4 h-4 stroke-[2]" />
        )}
        <span>Thêm bạn bè</span>
      </button>
    </div>
  );
}

import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import {
  X,
  PaperPlaneTilt,
  ArrowClockwise,
  ChatCircleDots,
  Heart,
  PencilSimple,
  Trash,
  Check,
} from '@phosphor-icons/react';
import keycloak from '../../keycloak';
import { useProfile } from '../../context/ProfileContext';
import { useToast } from '../../context/ToastContext';
import {
  likeComment,
  unlikeComment,
  updateComment as apiUpdateComment,
  deleteComment as apiDeleteComment,
} from '../../services/postInteractionApi';
import type { CommentData } from '../../types/postTypes';

export type { CommentData };

interface CommentModalProps {
  postId: string;
  postOwnerId?: string;
  onCommentCountChange?: (delta: number) => void;
  onClose: () => void;
}

interface CommentWithReplies extends CommentData {
  replies: CommentData[];
  replyCursor: string | null;
  hasMoreReplies: boolean;
  showReplies: boolean;
}

const MAX_COMMENT_LENGTH = 2000;

function getAvatarUrl(userId: string): string {
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(userId)}&size=36`;
}

const dateCache = new Map<string, string>();
function formatCommentTime(iso: string): string {
  if (dateCache.has(iso)) return dateCache.get(iso)!;
  const result = new Date(iso).toLocaleDateString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
  dateCache.set(iso, result);
  return result;
}

export const CommentModal = memo(function CommentModal({
  postId,
  postOwnerId,
  onCommentCountChange,
  onClose,
}: CommentModalProps) {
  const { profile, avatarUrl: myAvatarUrl } = useProfile();
  const toast = useToast();
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(true);
  const loadingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const likeInFlightRef = useRef<Set<string>>(new Set());

  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const myUserId = profile?.userId;
  const isPostOwner = Boolean(myUserId && postOwnerId && myUserId === postOwnerId);

  const resolveAvatar = useMemo(
    () => (userId: string) => (myUserId === userId ? myAvatarUrl : getAvatarUrl(userId)),
    [myUserId, myAvatarUrl]
  );

  const fetchComments = useCallback(
    async (currentCursor: string | null) => {
      if (loadingRef.current) return;
      loadingRef.current = true;

      try {
        await keycloak.updateToken(30);
        const params = new URLSearchParams({ limit: '10' });
        if (currentCursor) params.set('cursor', currentCursor);

        const res = await fetch(`/post/comment/post/${postId}?${params}`, {
          headers: { Authorization: `Bearer ${keycloak.token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.code === 1000) {
            const page = data.result;
            const newComments: CommentWithReplies[] = (page.data as CommentData[]).map((c) => ({
              ...c,
              replyCount: c.replyCount ?? 0,
              likeCount: c.likeCount ?? 0,
              likedByMe: Boolean(c.likedByMe),
              edited: Boolean(c.edited),
              replies: [],
              replyCursor: null,
              hasMoreReplies: (c.replyCount ?? 0) > 0,
              showReplies: false,
            }));
            setComments((prev) => (currentCursor ? [...prev, ...newComments] : newComments));
            setCursor(page.nextCursor ?? null);
            setHasNext(page.hasNext);
          }
        }
      } catch (error) {
        console.error('Failed to fetch comments', error);
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [postId]
  );

  useEffect(() => {
    fetchComments(null);
  }, [fetchComments]);

  const fetchReplies = async (parentId: string) => {
    const comment = comments.find((c) => c.id === parentId);
    const replyCursor = comment?.replyCursor ?? null;

    try {
      await keycloak.updateToken(30);
      const params = new URLSearchParams({ limit: '5' });
      if (replyCursor) params.set('cursor', replyCursor);

      const res = await fetch(`/post/comment/replies/${parentId}?${params}`, {
        headers: { Authorization: `Bearer ${keycloak.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.code === 1000) {
          const page = data.result;
          const incoming = (page.data as CommentData[]).map((r) => ({
            ...r,
            likeCount: r.likeCount ?? 0,
            likedByMe: Boolean(r.likedByMe),
            edited: Boolean(r.edited),
          }));
          setComments((prev) =>
            prev.map((c) => {
              if (c.id !== parentId) return c;
              const existingIds = new Set(c.replies.map((r) => r.id));
              const merged = replyCursor
                ? [...c.replies, ...incoming.filter((r) => !existingIds.has(r.id))]
                : incoming;
              return {
                ...c,
                replies: merged,
                replyCursor: page.nextCursor ?? null,
                hasMoreReplies: page.hasNext,
                showReplies: true,
              };
            })
          );
        }
      }
    } catch (error) {
      console.error('Failed to fetch replies', error);
    }
  };

  const handleSubmit = async () => {
    const trimmed = newComment.trim();
    if (!trimmed || submitting) return;
    if (trimmed.length > MAX_COMMENT_LENGTH) {
      toast.error(`Bình luận tối đa ${MAX_COMMENT_LENGTH} ký tự`);
      return;
    }

    setSubmitting(true);
    try {
      await keycloak.updateToken(30);
      const body: Record<string, string> = { content: trimmed };
      if (replyingTo) {
        body.parentId = replyingTo.id;
      }

      const res = await fetch(`/post/comment/create/${postId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${keycloak.token}`,
        },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.code === 1000) {
          const created = data.result as CommentData;
          if (replyingTo) {
            const rootId = created.parentId || replyingTo.id;
            setComments((prev) =>
              prev.map((c) => {
                if (c.id !== rootId) return c;
                return {
                  ...c,
                  replyCount: (c.replyCount ?? 0) + 1,
                  replies: [created, ...c.replies],
                  showReplies: true,
                };
              })
            );
          } else {
            setComments((prev) => [
              {
                ...created,
                replyCount: 0,
                likeCount: 0,
                likedByMe: false,
                edited: false,
                replies: [],
                replyCursor: null,
                hasMoreReplies: false,
                showReplies: false,
              },
              ...prev,
            ]);
          }
          onCommentCountChange?.(1);
          setNewComment('');
          setReplyingTo(null);
        }
      }
    } catch (error) {
      console.error('Failed to post comment', error);
      toast.error('Không thể gửi bình luận');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleCommentLike = async (target: CommentData) => {
    if (likeInFlightRef.current.has(target.id)) return;
    likeInFlightRef.current.add(target.id);

    const prevLiked = Boolean(target.likedByMe);
    const prevCount = target.likeCount ?? 0;
    const nextLiked = !prevLiked;
    const nextCount = Math.max(0, prevCount + (nextLiked ? 1 : -1));

    const applyUpdate = (id: string, liked: boolean, likeCount: number) => {
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === id) return { ...c, likedByMe: liked, likeCount };
          if (c.replies.some((r) => r.id === id)) {
            return {
              ...c,
              replies: c.replies.map((r) => (r.id === id ? { ...r, likedByMe: liked, likeCount } : r)),
            };
          }
          return c;
        })
      );
    };

    applyUpdate(target.id, nextLiked, nextCount);
    try {
      const res = nextLiked ? await likeComment(target.id) : await unlikeComment(target.id);
      applyUpdate(target.id, res.liked, res.likeCount);
    } catch (err) {
      applyUpdate(target.id, prevLiked, prevCount);
      toast.error(err instanceof Error ? err.message : 'Thao tác thất bại');
    } finally {
      likeInFlightRef.current.delete(target.id);
    }
  };

  const startEdit = (item: CommentData) => {
    setEditingId(item.id);
    setEditingText(item.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  const saveEdit = async (commentId: string) => {
    const trimmed = editingText.trim();
    if (!trimmed || savingEdit) return;
    if (trimmed.length > MAX_COMMENT_LENGTH) {
      toast.error(`Bình luận tối đa ${MAX_COMMENT_LENGTH} ký tự`);
      return;
    }

    setSavingEdit(true);
    try {
      const updated = await apiUpdateComment(commentId, trimmed);
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            return { ...c, content: updated.content, edited: true, updatedAt: updated.updatedAt };
          }
          if (c.replies.some((r) => r.id === commentId)) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r.id === commentId
                  ? { ...r, content: updated.content, edited: true, updatedAt: updated.updatedAt }
                  : r
              ),
            };
          }
          return c;
        })
      );
      cancelEdit();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể sửa bình luận');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (target: CommentData, isRoot: boolean) => {
    try {
      await apiDeleteComment(target.id);
      if (isRoot) {
        const rootObj = comments.find((c) => c.id === target.id);
        const removedCount = 1 + Math.max(rootObj?.replyCount ?? 0, rootObj?.replies.length ?? 0);
        setComments((prev) => prev.filter((c) => c.id !== target.id));
        onCommentCountChange?.(-removedCount);
      } else {
        setComments((prev) =>
          prev.map((c) => {
            if (c.id !== target.parentId) return c;
            return {
              ...c,
              replyCount: Math.max(0, (c.replyCount ?? 1) - 1),
              replies: c.replies.filter((r) => r.id !== target.id),
            };
          })
        );
        onCommentCountChange?.(-1);
      }
      if (editingId === target.id) cancelEdit();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể xóa bình luận');
    }
  };

  const handleReplyClick = (rootCommentId: string, username: string) => {
    setReplyingTo({ id: rootCommentId, username });
    inputRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const renderCommentActions = (item: CommentData, rootId: string, isRoot: boolean) => {
    const isMine = Boolean(myUserId && item.userId === myUserId);
    const canDelete = isMine || isPostOwner;

    return (
      <div className="flex items-center gap-3 mt-1.5 px-2 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
        <span className="font-code text-slate-500 dark:text-slate-400">
          {formatCommentTime(item.createdAt)}
        </span>
        {item.edited && <span className="italic text-slate-400 dark:text-slate-500">(đã chỉnh sửa)</span>}
        <span>·</span>
        <button
          type="button"
          onClick={() => handleToggleCommentLike(item)}
          className={`inline-flex items-center gap-1 font-heading font-medium transition-colors cursor-pointer ${
            item.likedByMe
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
          }`}
        >
          <Heart className="w-3.5 h-3.5" weight={item.likedByMe ? 'fill' : 'regular'} />
          <span>Thích{item.likeCount > 0 ? ` (${item.likeCount})` : ''}</span>
        </button>
        <span>·</span>
        <button
          type="button"
          onClick={() => handleReplyClick(rootId, item.username ?? 'Người dùng')}
          className="font-heading font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline cursor-pointer"
        >
          Phản hồi
        </button>
        {isMine && editingId !== item.id && (
          <>
            <span>·</span>
            <button
              type="button"
              onClick={() => startEdit(item)}
              className="inline-flex items-center gap-1 font-heading font-medium text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
            >
              <PencilSimple className="w-3 h-3" />
              <span>Sửa</span>
            </button>
          </>
        )}
        {canDelete && (
          <>
            <span>·</span>
            <button
              type="button"
              onClick={() => handleDelete(item, isRoot)}
              className="inline-flex items-center gap-1 font-heading font-medium text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
            >
              <Trash className="w-3 h-3" />
              <span>Xóa</span>
            </button>
          </>
        )}
      </div>
    );
  };

  const renderBubbleContent = (item: CommentData, textSizeClass: string) => {
    if (editingId === item.id) {
      return (
        <div className="space-y-2 min-w-[220px]">
          <textarea
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            rows={2}
            maxLength={MAX_COMMENT_LENGTH}
            className="w-full rounded-lg px-2.5 py-1.5 text-sm bg-white dark:bg-slate-900 border border-indigo-400 dark:border-indigo-500 focus:outline-none text-slate-900 dark:text-slate-100"
          />
          <div className="flex items-center justify-end gap-2 text-xs">
            <button
              type="button"
              onClick={cancelEdit}
              className="px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700/60 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={!editingText.trim() || savingEdit}
              onClick={() => saveEdit(item.id)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Lưu</span>
            </button>
          </div>
        </div>
      );
    }

    return (
      <p className={`font-sans ${textSizeClass} text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed`}>
        {item.content}
      </p>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl w-full max-w-[660px] flex flex-col max-h-[85vh] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <ChatCircleDots className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-heading font-bold text-slate-900 dark:text-slate-100 text-base">
              Bình luận bài viết
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

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <ArrowClockwise className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center text-slate-500 dark:text-slate-400 py-12 flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/40 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3">
                <ChatCircleDots className="w-6 h-6" />
              </div>
              <p className="font-heading font-semibold text-slate-800 dark:text-slate-200 text-sm">
                Chưa có bình luận nào
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Hãy là người đầu tiên chia sẻ góc nhìn của bạn.
              </p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="space-y-2">
                {/* Root comment */}
                <div className="flex gap-3">
                  <img
                    src={resolveAvatar(comment.userId)}
                    alt="avatar"
                    className="w-8 h-8 rounded-xl object-cover border border-slate-200 dark:border-slate-800 flex-shrink-0"
                  />
                  <div className="flex flex-col flex-1 max-w-[calc(100%-2.5rem)]">
                    <div className="bg-slate-100/80 dark:bg-slate-800/60 rounded-xl px-3.5 py-2.5 border border-slate-200/70 dark:border-slate-700/40 w-fit max-w-full">
                      <span className="font-heading font-semibold text-xs text-slate-900 dark:text-slate-100 block mb-1">
                        {comment.username ?? 'Người dùng'}
                      </span>
                      {renderBubbleContent(comment, 'text-sm')}
                    </div>

                    {renderCommentActions(comment, comment.id, true)}
                  </div>
                </div>

                {/* Toggle replies */}
                {!comment.showReplies && (comment.replyCount ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => fetchReplies(comment.id)}
                    className="font-heading text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-semibold ml-11 transition-colors cursor-pointer"
                  >
                    Xem {comment.replyCount} phản hồi
                  </button>
                )}

                {/* Nested Replies */}
                {comment.showReplies && comment.replies.length > 0 && (
                  <div className="ml-11 space-y-2.5 border-l border-slate-200 dark:border-slate-700/60 pl-3">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="flex gap-2.5">
                        <img
                          src={resolveAvatar(reply.userId)}
                          alt="avatar"
                          className="w-7 h-7 rounded-lg object-cover border border-slate-200 dark:border-slate-800 flex-shrink-0"
                        />
                        <div className="flex flex-col flex-1 max-w-[calc(100%-2.25rem)]">
                          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl px-3 py-2 border border-slate-200/60 dark:border-slate-700/30 w-fit max-w-full">
                            <span className="font-heading font-semibold text-xs text-slate-900 dark:text-slate-100 block mb-0.5">
                              {reply.username ?? 'Người dùng'}
                            </span>
                            {renderBubbleContent(reply, 'text-xs')}
                          </div>
                          {renderCommentActions(reply, comment.id, false)}
                        </div>
                      </div>
                    ))}

                    {comment.hasMoreReplies && (
                      <button
                        type="button"
                        onClick={() => fetchReplies(comment.id)}
                        className="font-heading text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-semibold cursor-pointer"
                      >
                        Xem thêm phản hồi
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}

          {hasNext && !loading && (
            <button
              type="button"
              onClick={() => fetchComments(cursor)}
              className="font-heading text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-xs font-semibold ml-11 transition-colors cursor-pointer"
            >
              Xem thêm bình luận
            </button>
          )}
        </div>

        {/* Replying Banner */}
        {replyingTo && (
          <div className="px-5 py-2 bg-indigo-50 dark:bg-indigo-950/30 border-t border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
            <span>
              Đang phản hồi{' '}
              <strong className="font-heading text-indigo-700 dark:text-indigo-300 font-semibold">
                {replyingTo.username}
              </strong>
            </span>
            <button
              type="button"
              onClick={cancelReply}
              className="font-heading font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:underline cursor-pointer"
            >
              Hủy
            </button>
          </div>
        )}

        {/* Comment Input */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-white dark:bg-slate-900/60">
          <img
            src={myAvatarUrl}
            alt="my-avatar"
            className="w-8 h-8 rounded-xl object-cover border border-slate-200 dark:border-slate-800 flex-shrink-0"
          />
          <div className="flex-1 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center px-3.5 py-1.5 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 transition-all">
            <input
              ref={inputRef}
              type="text"
              maxLength={MAX_COMMENT_LENGTH}
              placeholder={
                replyingTo ? `Phản hồi ${replyingTo.username}...` : 'Viết bình luận của bạn...'
              }
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              className="flex-1 bg-transparent border-none focus:outline-none text-slate-900 dark:text-slate-100 text-sm placeholder-slate-400 dark:placeholder-slate-500"
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!newComment.trim() || submitting}
              className="ml-2 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all cursor-pointer shadow-xs active:scale-[0.98]"
              title="Gửi bình luận"
            >
              {submitting ? (
                <ArrowClockwise className="w-4 h-4 animate-spin" />
              ) : (
                <PaperPlaneTilt className="w-4 h-4" weight="fill" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

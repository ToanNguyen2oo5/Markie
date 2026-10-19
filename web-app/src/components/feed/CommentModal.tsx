import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { X, PaperPlaneTilt, ArrowClockwise, ChatCircleDots } from '@phosphor-icons/react';
import keycloak from '../../keycloak';
import { useProfile } from '../../context/ProfileContext';

interface CommentModalProps {
  postId: string;
  onClose: () => void;
}

export interface CommentData {
  id: string;
  postId: string;
  userId: string;
  username: string | null;
  parentId: string | null;
  content: string;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
}

interface CommentWithReplies extends CommentData {
  replies: CommentData[];
  replyCursor: string | null;
  hasMoreReplies: boolean;
  showReplies: boolean;
}

function getAvatarUrl(userId: string): string {
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(userId)}&size=36`;
}

const dateCache = new Map<string, string>();
function formatCommentTime(iso: string): string {
  if (dateCache.has(iso)) return dateCache.get(iso)!;
  const result = new Date(iso).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
  dateCache.set(iso, result);
  return result;
}

export const CommentModal = memo(function CommentModal({ postId, onClose }: CommentModalProps) {
  const { profile, avatarUrl: myAvatarUrl } = useProfile();
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(true);
  const loadingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);

  const resolveAvatar = useMemo(
    () => (userId: string) => profile?.userId === userId ? myAvatarUrl : getAvatarUrl(userId),
    [profile?.userId, myAvatarUrl]
  );

  const fetchComments = useCallback(async (currentCursor: string | null) => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      await keycloak.updateToken(30);
      const params = new URLSearchParams({ limit: '10' });
      if (currentCursor) params.set('cursor', currentCursor);

      const res = await fetch(`/post/comment/post/${postId}?${params}`, {
        headers: { Authorization: `Bearer ${keycloak.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.code === 1000) {
          const page = data.result;
          const newComments: CommentWithReplies[] = (page.data as CommentData[]).map(c => ({
            ...c,
            replies: [],
            replyCursor: null,
            hasMoreReplies: true,
            showReplies: false,
          }));
          setComments(prev => currentCursor ? [...prev, ...newComments] : newComments);
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
  }, [postId]);

  useEffect(() => {
    fetchComments(null);
  }, [fetchComments]);

  const fetchReplies = async (parentId: string) => {
    const comment = comments.find(c => c.id === parentId);
    const replyCursor = comment?.replyCursor ?? null;

    try {
      await keycloak.updateToken(30);
      const params = new URLSearchParams({ limit: '5' });
      if (replyCursor) params.set('cursor', replyCursor);

      const res = await fetch(`/post/comment/replies/${parentId}?${params}`, {
        headers: { Authorization: `Bearer ${keycloak.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.code === 1000) {
          const page = data.result;
          setComments(prev => prev.map(c => {
            if (c.id !== parentId) return c;
            return {
              ...c,
              replies: replyCursor ? [...c.replies, ...page.data] : page.data,
              replyCursor: page.nextCursor ?? null,
              hasMoreReplies: page.hasNext,
              showReplies: true,
            };
          }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch replies', error);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      await keycloak.updateToken(30);
      const body: Record<string, string> = { content: newComment.trim() };
      if (replyingTo) {
        body.parentId = replyingTo.id;
      }

      const res = await fetch(`/post/comment/create/${postId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${keycloak.token}`
        },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.code === 1000) {
          const created = data.result as CommentData;
          if (replyingTo) {
            setComments(prev => prev.map(c => {
              if (c.id !== replyingTo.id) return c;
              return { ...c, replies: [created, ...c.replies], showReplies: true };
            }));
          } else {
            setComments(prev => [{
              ...created,
              replies: [],
              replyCursor: null,
              hasMoreReplies: true,
              showReplies: false,
            }, ...prev]);
          }
          setNewComment('');
          setReplyingTo(null);
        }
      }
    } catch (error) {
      console.error('Failed to post comment', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplyClick = (commentId: string, username: string) => {
    setReplyingTo({ id: commentId, username });
    inputRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl w-full max-w-[660px] flex flex-col max-h-[85vh] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <ChatCircleDots className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-heading font-bold text-slate-900 dark:text-slate-100 text-base">Bình luận bài viết</h3>
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
              <p className="font-heading font-semibold text-slate-800 dark:text-slate-200 text-sm">Chưa có bình luận nào</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Hãy là người đầu tiên chia sẻ góc nhìn của bạn.</p>
            </div>
          ) : (
            comments.map(comment => (
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
                      <p className="font-sans text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {comment.content}
                      </p>
                    </div>

                    {/* Metadata & Reply trigger */}
                    <div className="flex items-center gap-3 mt-1.5 px-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-code text-slate-500 dark:text-slate-400">
                        {formatCommentTime(comment.createdAt)}
                      </span>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => handleReplyClick(comment.id, comment.username ?? 'Người dùng')}
                        className="font-heading font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline cursor-pointer"
                      >
                        Phản hồi
                      </button>
                    </div>
                  </div>
                </div>

                {/* Toggle replies */}
                {!comment.showReplies && (
                  <button
                    type="button"
                    onClick={() => fetchReplies(comment.id)}
                    className="font-heading text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-semibold ml-11 transition-colors cursor-pointer"
                  >
                    Xem phản hồi
                  </button>
                )}

                {/* Nested Replies */}
                {comment.showReplies && comment.replies.length > 0 && (
                  <div className="ml-11 space-y-2.5 border-l border-slate-200 dark:border-slate-700/60 pl-3">
                    {comment.replies.map(reply => (
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
                            <p className="font-sans text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                              {reply.content}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mt-1 px-2 text-[10px] text-slate-500 dark:text-slate-400">
                            <span className="font-code">
                              {formatCommentTime(reply.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {comment.hasMoreReplies && (
                      <button
                        type="button"
                        onClick={() => fetchReplies(comment.id)}
                        className="font-heading text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-semibold"
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
              Đang phản hồi <strong className="font-heading text-indigo-700 dark:text-indigo-300 font-semibold">{replyingTo.username}</strong>
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
              placeholder={replyingTo ? `Phản hồi ${replyingTo.username}...` : "Viết bình luận của bạn..."}
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

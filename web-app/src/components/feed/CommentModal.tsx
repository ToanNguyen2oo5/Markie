import { useState, useEffect, useRef, useCallback } from 'react';
import { X, PaperPlaneRight, ArrowClockwise } from '@phosphor-icons/react';
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

// Each root comment can hold its own replies
interface CommentWithReplies extends CommentData {
  replies: CommentData[];
  replyCursor: string | null;
  hasMoreReplies: boolean;
  showReplies: boolean;
}

function getAvatarUrl(userId: string): string {
  const num = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 70 + 1;
  return `https://i.pravatar.cc/150?img=${num}`;
}

export function CommentModal({ postId, onClose }: CommentModalProps) {
  const { profile, avatarUrl: myAvatarUrl } = useProfile();
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(true);
  const loadingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Track which comment we're replying to
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);

  // Resolve avatar: use context avatar for current user, hash-based for others
  const resolveAvatar = (userId: string) =>
    profile?.userId === userId ? myAvatarUrl : getAvatarUrl(userId);

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

  // Fetch replies for a specific root comment
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
            // Add reply under its parent
            setComments(prev => prev.map(c => {
              if (c.id !== replyingTo.id) return c;
              return { ...c, replies: [created, ...c.replies], showReplies: true };
            }));
          } else {
            // Add as a new root comment
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="bg-[#242526] rounded-xl w-full max-w-[700px] flex flex-col max-h-[85vh] border border-[#393A3B] shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#3E4042]">
          <h3 className="text-xl font-bold text-[#E4E6EB] flex-1 text-center">Bình luận bài viết</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#3A3B3C] flex items-center justify-center hover:bg-[#4E4F50] transition-colors text-[#E4E6EB] absolute right-6"
          >
            <X className="w-5 h-5" weight="bold" />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="flex justify-center py-10">
              <ArrowClockwise className="w-8 h-8 animate-spin text-[#0866FF]" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center text-[#B0B3B8] py-12 flex flex-col items-center">
              <span className="text-4xl mb-3">💬</span>
              <p className="font-medium text-[15px]">Chưa có bình luận nào.</p>
              <p className="text-[13px] mt-1">Hãy là người đầu tiên bình luận!</p>
            </div>
          ) : (
            comments.map(comment => (
              <div key={comment.id}>
                {/* Root comment */}
                <div className="flex gap-2.5 group">
                  <img
                    src={resolveAvatar(comment.userId)}
                    alt="avatar"
                    className="w-9 h-9 rounded-full object-cover shadow-sm"
                  />
                  <div className="flex flex-col max-w-[calc(100%-3rem)]">
                    <div className="bg-[#3A3B3C] rounded-2xl px-3.5 py-2 w-fit shadow-sm">
                      <span className="font-semibold text-[13px] text-[#E4E6EB] mr-2">
                        {comment.username ?? 'Người dùng ẩn danh'}
                      </span>
                      <p className="text-[15px] text-[#E4E6EB] whitespace-pre-wrap leading-snug mt-0.5">
                        {comment.content}
                      </p>
                    </div>
                    <div className="flex gap-4 mt-1.5 px-3 text-[12px] text-[#B0B3B8] font-bold">
                      <span className="cursor-pointer hover:underline transition-all">Thích</span>
                      <span
                        className="cursor-pointer hover:underline transition-all"
                        onClick={() => handleReplyClick(comment.id, comment.username ?? 'Người dùng')}
                      >
                        Phản hồi
                      </span>
                      <span className="font-normal text-[#8A8D91]">
                        {new Date(comment.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Toggle replies */}
                {!comment.showReplies && (
                  <button
                    onClick={() => fetchReplies(comment.id)}
                    className="text-[#B0B3B8] hover:underline text-[13px] font-semibold ml-[48px] mt-2"
                  >
                    Xem phản hồi
                  </button>
                )}

                {/* Replies - indented */}
                {comment.showReplies && comment.replies.length > 0 && (
                  <div className="ml-12 mt-3 space-y-3 border-l-2 border-[#3E4042] pl-3">
                    {comment.replies.map(reply => (
                      <div key={reply.id} className="flex gap-2 group">
                        <img
                          src={resolveAvatar(reply.userId)}
                          alt="avatar"
                          className="w-7 h-7 rounded-full object-cover shadow-sm"
                        />
                        <div className="flex flex-col max-w-[calc(100%-2.5rem)]">
                          <div className="bg-[#3A3B3C] rounded-2xl px-3 py-1.5 w-fit shadow-sm">
                            <span className="font-semibold text-[12px] text-[#E4E6EB] mr-2">
                              {reply.username ?? 'Người dùng ẩn danh'}
                            </span>
                            <p className="text-[14px] text-[#E4E6EB] whitespace-pre-wrap leading-snug mt-0.5">
                              {reply.content}
                            </p>
                          </div>
                          <div className="flex gap-4 mt-1 px-3 text-[11px] text-[#B0B3B8] font-bold">
                            <span className="cursor-pointer hover:underline transition-all">Thích</span>
                            <span className="font-normal text-[#8A8D91]">
                              {new Date(reply.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {comment.hasMoreReplies && (
                      <button
                        onClick={() => fetchReplies(comment.id)}
                        className="text-[#B0B3B8] hover:underline text-[12px] font-semibold ml-[36px]"
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
              onClick={() => fetchComments(cursor)}
              className="text-[#B0B3B8] hover:underline text-[14px] font-semibold ml-[46px]"
            >
              Xem thêm bình luận
            </button>
          )}
        </div>

        {/* Reply indicator */}
        {replyingTo && (
          <div className="px-4 pt-2 flex items-center gap-2 text-[13px] text-[#B0B3B8]">
            <span>Đang phản hồi <strong className="text-[#E4E6EB]">{replyingTo.username}</strong></span>
            <button onClick={cancelReply} className="text-[#0866FF] hover:underline font-semibold ml-1">Hủy</button>
          </div>
        )}

        {/* Comment Input */}
        <div className="p-4 border-t border-[#3E4042] flex items-center gap-2">
          <img
            src={myAvatarUrl}
            alt="my-avatar"
            className="w-9 h-9 rounded-full object-cover"
          />
          <div className="flex-1 bg-[#3A3B3C] rounded-full flex items-center px-4 py-2 focus-within:ring-2 focus-within:ring-[#0866FF]/50 transition-shadow">
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
              className="flex-1 bg-transparent border-none focus:outline-none text-[#E4E6EB] text-[15px] placeholder-[#B0B3B8] max-h-32"
            />
            <button
              onClick={handleSubmit}
              disabled={!newComment.trim() || submitting}
              className="ml-2 p-1.5 rounded-full hover:bg-[#4E4F50] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-[#0866FF]"
            >
              {submitting ? (
                <ArrowClockwise className="w-5 h-5 animate-spin" />
              ) : (
                <PaperPlaneRight className="w-5 h-5" weight="fill" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

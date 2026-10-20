import { useState, memo } from 'react';
import { ChatCircle, Copy, Check, PaperPlaneTilt } from '@phosphor-icons/react';
import type { PostData } from '../../pages/NewsFeedPage';
import { CommentModal } from './CommentModal';
import { useProfile } from '../../context/ProfileContext';
import { useChat } from '../../context/ChatContext';

interface PostCardProps {
  post: PostData;
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getAvatarUrl(userId: string): string {
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(userId)}&size=40`;
}

export const PostCard = memo(function PostCard({ post }: PostCardProps) {
  const { profile, avatarUrl: myAvatarUrl } = useProfile();
  const { openChat } = useChat();
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const isMyPost = profile?.userId === post.userId;
  const postAvatarUrl = isMyPost ? myAvatarUrl : getAvatarUrl(post.userId);
  const displayName = post.username ?? 'Người dùng';
  const timeAgo = formatTime(post.createdDate);

  const handleCopyLink = async () => {
    const postUrl = `${window.location.origin}/feed#post-${post.id}`;
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <article
      id={`post-${post.id}`}
      className="w-full genv-card rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800/80 flex flex-col transition-all hover:border-slate-300 dark:hover:border-slate-700 shadow-xs"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <img
            src={postAvatarUrl}
            alt={displayName}
            className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-800"
          />
          <div className="flex flex-col">
            <h4 className="font-heading text-slate-900 dark:text-slate-100 font-semibold text-[15px] leading-snug">
              {displayName}
            </h4>
            <span className="font-code text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {timeAgo}
            </span>
          </div>
        </div>

        {/* Copy Link Action */}
        <button
          type="button"
          onClick={handleCopyLink}
          title="Sao chép liên kết bài viết"
          className="relative px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900/80 hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-code text-emerald-600 dark:text-emerald-400 font-medium">Đã chép</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span className="hidden sm:inline font-heading text-slate-600 dark:text-slate-400">Liên kết</span>
            </>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="pt-3.5 pb-2">
        <p className="font-sans text-slate-800 dark:text-slate-200 text-[15px] whitespace-pre-wrap leading-relaxed">
          {post.content}
        </p>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-100 dark:border-slate-800/80 mt-3 pt-3 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Comment Action Button */}
          <button
            type="button"
            onClick={() => setIsCommentModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-all text-xs font-heading font-medium cursor-pointer"
          >
            <ChatCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Bình luận</span>
          </button>

          {/* Quick Chat Button */}
          <button
            type="button"
            onClick={() => {
              const targetId = post.userId || post.username;
              if (targetId) {
                openChat(targetId, {
                  name: post.username ? `@${post.username}` : 'Tác giả',
                  role: post.username ? `@${post.username}` : 'Người dùng',
                  avatar: `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(targetId)}&size=80`,
                });
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-all text-xs font-heading font-medium cursor-pointer"
          >
            <PaperPlaneTilt className="w-3.5 h-3.5 text-indigo-500" />
            <span>Nhắn tin nhanh</span>
          </button>
        </div>

        <span className="font-code text-[11px] text-slate-400 dark:text-slate-600">
          ID: {post.id.slice(0, 8)}
        </span>
      </div>

      {/* Comment Modal */}
      {isCommentModalOpen && (
        <CommentModal 
          postId={post.id} 
          onClose={() => setIsCommentModalOpen(false)} 
        />
      )}
    </article>
  );
});

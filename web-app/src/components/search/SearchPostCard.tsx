import { memo, useEffect, useState } from 'react';
import { GlobeHemisphereWest, ThumbsUp, ChatCircle } from '@phosphor-icons/react';
import type { SearchPostResult } from '../../types/searchTypes';
import { CommentModal } from '../feed/CommentModal';
import { LikersModal } from '../feed/LikersModal';
import { ImageLightbox } from '../feed/ImageLightbox';
import type { PostFile } from '../../types/postTypes';

interface SearchPostCardProps {
  post: SearchPostResult;
  keyword: string;
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

function isImageAttachment(file: PostFile): boolean {
  return file.contentType?.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(file.originalName ?? '');
}

/** Highlight keyword in text */
function HighlightedText({ text, keyword }: { text: string; keyword: string }) {
  if (!keyword.trim()) return <span>{text}</span>;
  const parts = text.split(new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === keyword.toLowerCase() ? (
          <mark key={i} className="bg-yellow-500/30 text-yellow-900 dark:text-yellow-200 rounded-sm px-0.5 not-italic">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

export const SearchPostCard = memo(function SearchPostCard({ post, keyword }: SearchPostCardProps) {
  const [showLikers, setShowLikers] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [imageIndex, setImageIndex] = useState<number | null>(null);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  useEffect(() => setCommentCount(post.commentCount), [post.commentCount]);
  const images = (post.files ?? []).filter(isImageAttachment);
  const documents = (post.files ?? []).filter((file) => !isImageAttachment(file));
  const displayName = post.username ?? 'Người dùng';
  const timeAgo = formatTime(post.createdDate);
  const avatarUrl = post.avatar || getAvatarUrl(post.userId);

  // Truncate long content for preview, with fallback for attachment-only posts
  const safeContent = post.content?.trim() || 'Bài viết có tệp đính kèm';
  const previewContent = safeContent.length > 300
    ? safeContent.slice(0, 300) + '...'
    : safeContent;

  return (
    <article className="w-full bg-white dark:bg-[#242526] rounded-xl shadow-sm border border-slate-200 dark:border-[#393A3B]/30 flex flex-col hover:border-slate-300 dark:hover:border-[#393A3B]/80 transition-all duration-200 group">
      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-3">
        <div className="flex items-center gap-2.5">
          <img
            src={avatarUrl}
            onError={(event) => {
              const fallback = getAvatarUrl(post.userId);
              if (event.currentTarget.src !== fallback) event.currentTarget.src = fallback;
            }}
            alt={displayName}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
          <div className="flex flex-col leading-tight">
            <h4 className="text-slate-900 dark:text-[#E4E6EB] font-semibold text-[15px] hover:underline cursor-pointer">
              <HighlightedText text={displayName} keyword={keyword} />
            </h4>
            <div className="flex items-center gap-1 text-slate-500 dark:text-[#B0B3B8] text-[13px] mt-0.5">
              <span>{timeAgo}</span>
              <span>·</span>
              <GlobeHemisphereWest className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-4">
        <p className="text-slate-900 dark:text-[#E4E6EB] text-[15px] whitespace-pre-wrap leading-relaxed">
          <HighlightedText text={previewContent} keyword={keyword} />
        </p>
      </div>

      {images.length > 0 && (
        <div className={`px-4 pb-4 grid gap-2 ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {images.map((file, index) => (
            <button
              key={file.fileId || file.url}
              type="button"
              onClick={() => setImageIndex(index)}
              aria-label={`Xem ảnh ${index + 1}: ${file.originalName}`}
              className="overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900 cursor-zoom-in focus-visible:outline-2 focus-visible:outline-indigo-500"
            >
              <img
                src={file.url}
                alt={file.originalName}
                loading="lazy"
                className={`w-full ${images.length === 1 ? 'max-h-[520px] object-contain' : 'h-60 object-cover'}`}
              />
            </button>
          ))}
        </div>
      )}
      {documents.length > 0 && (
        <div className="px-4 pb-4 flex flex-col gap-2">
          {documents.map((file) => (
            <a key={file.fileId || file.url} href={file.url} download={file.originalName}
              target="_blank" rel="noopener noreferrer"
              className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 text-indigo-600 dark:text-indigo-400 hover:underline break-all">
              {file.originalName}
            </a>
          ))}
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-slate-200 dark:border-[#3E4042] mx-4" />

      {/* Stats */}
      <div className="px-4 py-2.5 flex items-center gap-4 text-slate-500 dark:text-[#B0B3B8] text-[13px]">
        <button type="button" onClick={() => setShowLikers(true)}
          aria-label="Xem người đã thích bài viết"
          className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline cursor-pointer">
          <ThumbsUp className="w-4 h-4 text-[#0866FF]" weight="fill" />
          <span>{post.likeCount ?? '—'}</span>
        </button>
        <button type="button" onClick={() => setShowComments(true)}
          aria-label="Xem bình luận bài viết"
          className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline cursor-pointer">
          <ChatCircle className="w-4 h-4" />
          <span>{commentCount ?? '—'} bình luận</span>
        </button>
      </div>
      {showLikers && <LikersModal postId={post.id} onClose={() => setShowLikers(false)} />}
      {showComments && (
        <CommentModal postId={post.id} postOwnerId={post.userId}
          onCommentCountChange={(delta) => setCommentCount((count) => Math.max(0, (count ?? 0) + delta))}
          onClose={() => setShowComments(false)} />
      )}
      {imageIndex !== null && (
        <ImageLightbox images={images} currentIndex={imageIndex}
          onIndexChange={setImageIndex} onClose={() => setImageIndex(null)} />
      )}
    </article>
  );
});

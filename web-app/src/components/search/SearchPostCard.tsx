import { memo } from 'react';
import { GlobeHemisphereWest, ThumbsUp, ChatCircle } from '@phosphor-icons/react';
import type { SearchPostResult } from '../../types/searchTypes';

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

/** Highlight keyword in text */
function HighlightedText({ text, keyword }: { text: string; keyword: string }) {
  if (!keyword.trim()) return <span>{text}</span>;
  const parts = text.split(new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === keyword.toLowerCase() ? (
          <mark key={i} className="bg-yellow-500/30 text-yellow-200 rounded-sm px-0.5 not-italic">
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
  const displayName = post.username ?? 'Người dùng';
  const timeAgo = formatTime(post.createdDate);
  const avatarUrl = getAvatarUrl(post.userId);

  // Truncate long content for preview
  const previewContent = post.content.length > 300
    ? post.content.slice(0, 300) + '...'
    : post.content;

  return (
    <article className="w-full bg-[#242526] rounded-xl shadow-sm border border-[#393A3B]/30 flex flex-col hover:border-[#393A3B]/80 transition-all duration-200 group">
      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-3">
        <div className="flex items-center gap-2.5">
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
          <div className="flex flex-col leading-tight">
            <h4 className="text-[#E4E6EB] font-semibold text-[15px] hover:underline cursor-pointer">
              <HighlightedText text={displayName} keyword={keyword} />
            </h4>
            <div className="flex items-center gap-1 text-[#B0B3B8] text-[13px] mt-0.5">
              <span>{timeAgo}</span>
              <span>·</span>
              <GlobeHemisphereWest className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-4">
        <p className="text-[#E4E6EB] text-[15px] whitespace-pre-wrap leading-relaxed">
          <HighlightedText text={previewContent} keyword={keyword} />
        </p>
      </div>

      {/* Divider */}
      <div className="border-t border-[#3E4042] mx-4" />

      {/* Stats */}
      <div className="px-4 py-2.5 flex items-center gap-4 text-[#B0B3B8] text-[13px]">
        <div className="flex items-center gap-1.5">
          <ThumbsUp className="w-4 h-4 text-[#0866FF]" weight="fill" />
          <span>{post.likeCount ?? 0}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ChatCircle className="w-4 h-4" />
          <span>{post.commentCount ?? 0} bình luận</span>
        </div>
      </div>
    </article>
  );
});

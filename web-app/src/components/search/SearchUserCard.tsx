import { memo } from 'react';
import { EnvelopeSimple, User } from '@phosphor-icons/react';
import type { SearchUserResult } from '../../types/searchTypes';

interface SearchUserCardProps {
  user: SearchUserResult;
  keyword: string;
}

function getAvatarUrl(userId: string, avatar: string | null): string {
  if (avatar) return avatar;
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(userId)}&size=80`;
}

/** Highlight keyword in text */
function HighlightedText({ text, keyword }: { text: string; keyword: string }) {
  if (!keyword.trim() || !text) return <span>{text}</span>;
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

export const SearchUserCard = memo(function SearchUserCard({ user, keyword }: SearchUserCardProps) {
  const avatarUrl = getAvatarUrl(user.userId, user.avatar);
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');

  return (
    <article className="w-full bg-[#242526] rounded-xl shadow-sm border border-[#393A3B]/30 flex items-center gap-4 p-4 hover:border-[#393A3B]/80 hover:bg-[#2D2E30] transition-all duration-200 group">
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <img
          src={avatarUrl}
          alt={user.username}
          className="w-16 h-16 rounded-full object-cover ring-2 ring-[#393A3B] group-hover:ring-[#0866FF]/40 transition-all"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        {/* Name & username */}
        <div className="flex flex-col gap-0.5">
          {fullName && (
            <h4 className="text-[#E4E6EB] font-semibold text-[16px] leading-tight truncate">
              <HighlightedText text={fullName} keyword={keyword} />
            </h4>
          )}
          <p className="text-[#B0B3B8] text-[14px] truncate">
            @<HighlightedText text={user.username} keyword={keyword} />
          </p>
        </div>

        {/* Email */}
        {user.email && (
          <div className="flex items-center gap-1.5 mt-2 text-[#B0B3B8] text-[13px]">
            <EnvelopeSimple className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">
              <HighlightedText text={user.email} keyword={keyword} />
            </span>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="flex-shrink-0">
        <button className="flex items-center gap-1.5 bg-[#0866FF]/10 hover:bg-[#0866FF]/20 text-[#0866FF] font-semibold text-[13px] px-3 py-1.5 rounded-lg transition-colors cursor-pointer border border-[#0866FF]/20">
          <User className="w-4 h-4" />
          <span>Xem trang</span>
        </button>
      </div>
    </article>
  );
});

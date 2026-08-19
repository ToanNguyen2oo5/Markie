import { memo } from 'react';
import { MagnifyingGlass, User, Article, ArrowRight, Spinner } from '@phosphor-icons/react';
import type { SearchPostResult, SearchUserResult } from '../../types/searchTypes';

interface SearchSuggestionDropdownProps {
  keyword: string;
  users: SearchUserResult[];
  posts: SearchPostResult[];
  loading: boolean;
  onSelectKeyword: (kw: string) => void;
  onSelectUser: (user: SearchUserResult) => void;
  onSelectPost: (post: SearchPostResult) => void;
}

function getAvatarUrl(userId: string, avatar: string | null): string {
  if (avatar) return avatar;
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(userId)}&size=40`;
}

function Highlight({ text, keyword }: { text: string; keyword: string }) {
  if (!keyword.trim() || !text) return <span>{text}</span>;
  const parts = text.split(new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === keyword.toLowerCase() ? (
          <span key={i} className="text-[#0866FF] font-semibold">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

export const SearchSuggestionDropdown = memo(function SearchSuggestionDropdown({
  keyword,
  users,
  posts,
  loading,
  onSelectKeyword,
  onSelectUser,
  onSelectPost,
}: SearchSuggestionDropdownProps) {
  const hasResults = users.length > 0 || posts.length > 0;

  return (
    <div className="absolute top-[calc(100%+8px)] left-0 w-[360px] bg-[#242526]/95 backdrop-blur-xl border border-[#393A3B] rounded-2xl shadow-2xl z-50 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-150">
      {/* ── Search action item ── */}
      <button
        type="button"
        onClick={() => onSelectKeyword(keyword)}
        className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-[#3A3B3C]/80 transition-colors text-left group cursor-pointer"
      >
        <div className="w-9 h-9 rounded-full bg-[#0866FF]/15 flex items-center justify-center flex-shrink-0 group-hover:bg-[#0866FF] transition-colors">
          <MagnifyingGlass className="w-5 h-5 text-[#0866FF] group-hover:text-white transition-colors" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] text-[#E4E6EB] truncate">
            Tìm kiếm <span className="font-semibold text-white">"{keyword}"</span>
          </p>
          <span className="text-[12px] text-[#B0B3B8]">Xem tất cả kết quả</span>
        </div>
        <ArrowRight className="w-4 h-4 text-[#B0B3B8] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </button>

      {/* ── Loading indicator ── */}
      {loading && (
        <div className="px-4 py-3 flex items-center justify-center gap-2 text-[#B0B3B8] text-[13px] border-t border-[#393A3B]/40">
          <Spinner className="w-4 h-4 animate-spin text-[#0866FF]" />
          <span>Đang tìm kiếm gợi ý...</span>
        </div>
      )}

      {/* ── Users section ── */}
      {users.length > 0 && (
        <div className="border-t border-[#393A3B]/40 pt-2 mt-1">
          <div className="px-3.5 py-1 flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-[#B0B3B8] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#0866FF]" />
              Mọi người
            </span>
          </div>
          <div className="space-y-0.5 mt-1">
            {users.map((user) => {
              const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
              const avatar = getAvatarUrl(user.userId, user.avatar);
              return (
                <button
                  key={user.userId}
                  type="button"
                  onClick={() => onSelectUser(user)}
                  className="w-full px-3.5 py-2 flex items-center gap-3 hover:bg-[#3A3B3C]/80 transition-colors text-left cursor-pointer group"
                >
                  <img
                    src={avatar}
                    alt={user.username}
                    className="w-9 h-9 rounded-full object-cover ring-1 ring-[#393A3B] flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-[#E4E6EB] leading-tight truncate">
                      {fullName ? (
                        <Highlight text={fullName} keyword={keyword} />
                      ) : (
                        <Highlight text={user.username} keyword={keyword} />
                      )}
                    </p>
                    <p className="text-[12px] text-[#B0B3B8] truncate mt-0.5">
                      @{user.username}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Posts section ── */}
      {posts.length > 0 && (
        <div className="border-t border-[#393A3B]/40 pt-2 mt-1">
          <div className="px-3.5 py-1 flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-[#B0B3B8] flex items-center gap-1.5">
              <Article className="w-3.5 h-3.5 text-[#0866FF]" />
              Bài viết
            </span>
          </div>
          <div className="space-y-0.5 mt-1">
            {posts.map((post) => (
              <button
                key={post.id}
                type="button"
                onClick={() => onSelectPost(post)}
                className="w-full px-3.5 py-2 flex items-start gap-3 hover:bg-[#3A3B3C]/80 transition-colors text-left cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-[#3A3B3C] flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-[#0866FF]/20 transition-colors">
                  <Article className="w-4 h-4 text-[#B0B3B8] group-hover:text-[#0866FF] transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[#E4E6EB] line-clamp-2 leading-snug">
                    <Highlight text={post.content} keyword={keyword} />
                  </p>
                  <p className="text-[11px] text-[#B0B3B8] mt-0.5 truncate">
                    Bởi {post.username ?? 'Người dùng'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !hasResults && keyword.trim().length > 0 && (
        <div className="px-4 py-4 text-center border-t border-[#393A3B]/40">
          <p className="text-[13px] text-[#B0B3B8]">
            Không tìm thấy gợi ý trực tiếp
          </p>
          <p className="text-[12px] text-[#0866FF] mt-1 font-medium">
            Nhấn Enter để tìm kiếm chi tiết
          </p>
        </div>
      )}

      {/* ── Footer shortcut hint ── */}
      <div className="border-t border-[#393A3B]/40 px-3.5 py-1.5 bg-[#1C1D1E]/60 flex items-center justify-between text-[11px] text-[#B0B3B8] mt-1">
        <span>Gợi ý tự động</span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-[#3A3B3C] text-zinc-300 rounded font-mono text-[10px]">Enter</kbd>
          để tìm kiếm
        </span>
      </div>
    </div>
  );
});

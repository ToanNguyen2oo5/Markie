import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MagnifyingGlass, Article, Users, SquaresFour, ArrowClockwise } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/feed/Header';
import { SearchPostCard } from '../components/search/SearchPostCard';
import { SearchUserCard } from '../components/search/SearchUserCard';
import keycloak from '../keycloak';
import type {
  SearchPostResult,
  SearchUserResult,
  SearchPageResponse,
  SearchApiResponse,
  SearchFilter,
} from '../types/searchTypes';

// ── Skeleton components ──────────────────────────────────────────────────────

function PostSkeleton() {
  return (
    <div className="w-full bg-[#242526] rounded-xl p-4 border border-[#393A3B]/30 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-[#3A3B3C] flex-shrink-0" />
        <div className="flex flex-col gap-2 flex-1">
          <div className="h-3 w-28 bg-[#3A3B3C] rounded-full" />
          <div className="h-2 w-20 bg-[#3A3B3C] rounded-full" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-[#3A3B3C] rounded-full" />
        <div className="h-3 bg-[#3A3B3C] rounded-full w-4/5" />
        <div className="h-3 bg-[#3A3B3C] rounded-full w-3/5" />
      </div>
    </div>
  );
}

function UserSkeleton() {
  return (
    <div className="w-full bg-[#242526] rounded-xl p-4 border border-[#393A3B]/30 animate-pulse flex items-center gap-4">
      <div className="w-16 h-16 rounded-full bg-[#3A3B3C] flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-32 bg-[#3A3B3C] rounded-full" />
        <div className="h-3 w-24 bg-[#3A3B3C] rounded-full" />
        <div className="h-2.5 w-40 bg-[#3A3B3C] rounded-full" />
      </div>
      <div className="w-20 h-8 bg-[#3A3B3C] rounded-lg flex-shrink-0" />
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ keyword }: { keyword: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-[#3A3B3C] flex items-center justify-center mb-4">
        <MagnifyingGlass className="w-8 h-8 text-[#B0B3B8]" />
      </div>
      <p className="text-[#E4E6EB] font-semibold text-lg">
        Không có kết quả cho "{keyword}"
      </p>
      <p className="text-[#B0B3B8] text-sm mt-1">
        Hãy thử từ khóa khác hoặc kiểm tra lại chính tả.
      </p>
    </div>
  );
}

// ── Filter tab button ─────────────────────────────────────────────────────────

interface FilterTabProps {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count?: number;
  onClick: () => void;
}

function FilterTab({ active, icon, label, count, onClick }: FilterTabProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[15px] font-medium transition-all duration-150 cursor-pointer ${
        active
          ? 'bg-[#0866FF]/15 text-[#0866FF]'
          : 'text-[#B0B3B8] hover:bg-[#3A3B3C] hover:text-[#E4E6EB]'
      }`}
    >
      <span className={`w-5 h-5 flex-shrink-0 ${active ? 'text-[#0866FF]' : ''}`}>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {count !== undefined && count > 0 && (
        <span
          className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
            active ? 'bg-[#0866FF]/20 text-[#0866FF]' : 'bg-[#3A3B3C] text-[#B0B3B8]'
          }`}
        >
          {count > 999 ? '999+' : count}
        </span>
      )}
    </button>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ title, total }: { title: string; total: number }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[#E4E6EB] font-bold text-lg">{title}</h2>
      <span className="text-[#B0B3B8] text-sm">{total} kết quả</span>
    </div>
  );
}

// ── Pagination button ─────────────────────────────────────────────────────────

function LoadMoreButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full py-3 rounded-xl bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB] font-medium text-[15px] transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <ArrowClockwise className="w-5 h-5 animate-spin" />
      ) : (
        'Xem thêm'
      )}
    </button>
  );
}

// ── Main SearchPage ───────────────────────────────────────────────────────────

export function SearchPage() {
  const { authenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialKeyword = searchParams.get('q') ?? '';
  const [inputValue, setInputValue] = useState(initialKeyword);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [filter, setFilter] = useState<SearchFilter>('all');

  // Posts state
  const [posts, setPosts] = useState<SearchPostResult[]>([]);
  const [postsPage, setPostsPage] = useState(0);
  const [postsMeta, setPostsMeta] = useState<SearchPageResponse<SearchPostResult> | null>(null);
  const [postsLoading, setPostsLoading] = useState(false);

  // Users state
  const [users, setUsers] = useState<SearchUserResult[]>([]);
  const [usersPage, setUsersPage] = useState(0);
  const [usersMeta, setUsersMeta] = useState<SearchPageResponse<SearchUserResult> | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Redirect if unauthenticated
  useEffect(() => {
    if (!authenticated) {
      navigate('/', { replace: true });
    }
  }, [authenticated, navigate]);

  // Sync keyword when URL search param 'q' changes
  useEffect(() => {
    const q = searchParams.get('q') ?? '';
    setInputValue(q);
    setKeyword(q);
  }, [searchParams]);

  // ── API helpers ──────────────────────────────────────────────────────────────

  const fetchPosts = useCallback(async (kw: string, page: number, append = false) => {
    if (!kw.trim()) return;
    setPostsLoading(true);
    try {
      try {
        await keycloak.updateToken(30);
      } catch {
        // ignore
      }
      const params = new URLSearchParams({ keyword: kw, page: String(page), size: '10' });
      const headers: Record<string, string> = {};
      if (keycloak.token) {
        headers['Authorization'] = `Bearer ${keycloak.token}`;
      }

      const res = await fetch(`/search/posts?${params}`, { headers });
      if (!res.ok) return;
      const data: SearchApiResponse<SearchPostResult> = await res.json();
      if (data.code === 1000) {
        setPosts((prev) => (append ? [...prev, ...data.result.items] : data.result.items));
        setPostsMeta(data.result);
      }
    } catch (err) {
      console.error('Search posts error:', err);
    } finally {
      setPostsLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async (kw: string, page: number, append = false) => {
    if (!kw.trim()) return;
    setUsersLoading(true);
    try {
      try {
        await keycloak.updateToken(30);
      } catch {
        // ignore
      }
      const params = new URLSearchParams({ keyword: kw, page: String(page), size: '10' });
      const headers: Record<string, string> = {};
      if (keycloak.token) {
        headers['Authorization'] = `Bearer ${keycloak.token}`;
      }

      const res = await fetch(`/search/users?${params}`, { headers });
      if (!res.ok) return;
      const data: SearchApiResponse<SearchUserResult> = await res.json();
      if (data.code === 1000) {
        setUsers((prev) => (append ? [...prev, ...data.result.items] : data.result.items));
        setUsersMeta(data.result);
      }
    } catch (err) {
      console.error('Search users error:', err);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // ── Trigger search when keyword or filter changes ────────────────────────────

  const runSearch = useCallback(
    (kw: string) => {
      if (!kw.trim()) {
        setPosts([]);
        setUsers([]);
        setPostsMeta(null);
        setUsersMeta(null);
        return;
      }
      setPosts([]);
      setUsers([]);
      setPostsPage(0);
      setUsersPage(0);
      setPostsMeta(null);
      setUsersMeta(null);

      if (filter === 'all' || filter === 'posts') fetchPosts(kw, 0);
      if (filter === 'all' || filter === 'users') fetchUsers(kw, 0);
    },
    [filter, fetchPosts, fetchUsers]
  );

  // Initial search on mount / keyword change
  useEffect(() => {
    if (authenticated && keyword) {
      runSearch(keyword);
    }
  }, [authenticated, keyword, filter, runSearch]);

  // ── Debounced input handler ──────────────────────────────────────────────────

  const handleInputChange = (value: string) => {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setKeyword(value);
      setSearchParams(value ? { q: value } : {});
    }, 400);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setKeyword(inputValue);
      setSearchParams(inputValue ? { q: inputValue } : {});
    }
  };

  // ── Load more handlers ───────────────────────────────────────────────────────

  const handleLoadMorePosts = () => {
    const nextPage = postsPage + 1;
    setPostsPage(nextPage);
    fetchPosts(keyword, nextPage, true);
  };

  const handleLoadMoreUsers = () => {
    const nextPage = usersPage + 1;
    setUsersPage(nextPage);
    fetchUsers(keyword, nextPage, true);
  };

  // ── Computed ─────────────────────────────────────────────────────────────────

  const isLoading = postsLoading || usersLoading;
  const hasKeyword = keyword.trim().length > 0;

  if (!authenticated) return null;

  return (
    <div className="min-h-screen bg-[#18191A] text-[#E4E6EB] flex flex-col">
      <Header />

      <div className="flex flex-1 pt-14 max-w-[1200px] mx-auto w-full px-4 gap-4">
        {/* ── Left Sidebar: Filters ───────────────────────────────────────────── */}
        <aside className="hidden md:flex flex-col w-[260px] flex-shrink-0 pt-6">
          <div className="bg-[#242526] rounded-xl border border-[#393A3B]/30 p-3 sticky top-[80px]">
            <h3 className="text-[#E4E6EB] font-bold text-[18px] px-2 mb-3">Kết quả tìm kiếm</h3>
            <div className="flex flex-col gap-1">
              <FilterTab
                active={filter === 'all'}
                icon={<SquaresFour weight={filter === 'all' ? 'fill' : 'regular'} />}
                label="Tất cả"
                onClick={() => setFilter('all')}
              />
              <FilterTab
                active={filter === 'posts'}
                icon={<Article weight={filter === 'posts' ? 'fill' : 'regular'} />}
                label="Bài viết"
                count={postsMeta?.totalElements}
                onClick={() => setFilter('posts')}
              />
              <FilterTab
                active={filter === 'users'}
                icon={<Users weight={filter === 'users' ? 'fill' : 'regular'} />}
                label="Người dùng"
                count={usersMeta?.totalElements}
                onClick={() => setFilter('users')}
              />
            </div>
          </div>
        </aside>

        {/* ── Main Content ────────────────────────────────────────────────────── */}
        <main className="flex-1 pt-6 pb-12 min-w-0">
          {/* Search input on page */}
          <div className="relative mb-6">
            <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B0B3B8] w-5 h-5 pointer-events-none" />
            <input
              id="search-page-input"
              type="text"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Nhập từ khóa tìm kiếm..."
              autoFocus
              className="w-full bg-[#3A3B3C] text-[#E4E6EB] placeholder-[#B0B3B8] h-12 rounded-xl pl-11 pr-4 outline-none focus:ring-2 focus:ring-[#0866FF]/50 transition-all text-[15px]"
            />
          </div>

          {/* Mobile filter pills */}
          <div className="flex md:hidden gap-2 mb-5 overflow-x-auto pb-1">
            {(
              [
                { key: 'all', label: 'Tất cả' },
                { key: 'posts', label: 'Bài viết' },
                { key: 'users', label: 'Người dùng' },
              ] as { key: SearchFilter; label: string }[]
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
                  filter === key
                    ? 'bg-[#0866FF] text-white'
                    : 'bg-[#3A3B3C] text-[#B0B3B8] hover:text-[#E4E6EB]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── No keyword state ── */}
          {!hasKeyword && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-full bg-[#3A3B3C] flex items-center justify-center mb-5">
                <MagnifyingGlass className="w-10 h-10 text-[#B0B3B8]" />
              </div>
              <p className="text-[#E4E6EB] font-semibold text-xl">Tìm kiếm trên Markie</p>
              <p className="text-[#B0B3B8] text-sm mt-2">Nhập từ khóa để tìm bài viết và người dùng.</p>
            </div>
          )}

          {/* ── Initial loading ── */}
          {hasKeyword && isLoading && posts.length === 0 && users.length === 0 && (
            <div className="space-y-4">
              {(filter === 'all' || filter === 'posts') && (
                <>
                  <PostSkeleton />
                  <PostSkeleton />
                  <PostSkeleton />
                </>
              )}
              {filter === 'users' && (
                <>
                  <UserSkeleton />
                  <UserSkeleton />
                  <UserSkeleton />
                </>
              )}
            </div>
          )}

          {/* ── Results ── */}
          {hasKeyword && !isLoading && posts.length === 0 && users.length === 0 && (
            <EmptyState keyword={keyword} />
          )}

          {/* All: posts section */}
          {hasKeyword && (filter === 'all' || filter === 'posts') && posts.length > 0 && (
            <section className="mb-8">
              <SectionHeader
                title="Bài viết"
                total={postsMeta?.totalElements ?? posts.length}
              />
              <div className="space-y-3">
                {posts.map((post) => (
                  <SearchPostCard key={post.id} post={post} keyword={keyword} />
                ))}
              </div>
              {postsMeta && !postsMeta.isLast && (
                <div className="mt-4">
                  <LoadMoreButton onClick={handleLoadMorePosts} loading={postsLoading} />
                </div>
              )}
            </section>
          )}

          {/* All: users section */}
          {hasKeyword && (filter === 'all' || filter === 'users') && users.length > 0 && (
            <section>
              <SectionHeader
                title="Người dùng"
                total={usersMeta?.totalElements ?? users.length}
              />
              <div className="space-y-3">
                {users.map((user) => (
                  <SearchUserCard key={user.userId} user={user} keyword={keyword} />
                ))}
              </div>
              {usersMeta && !usersMeta.isLast && (
                <div className="mt-4">
                  <LoadMoreButton onClick={handleLoadMoreUsers} loading={usersLoading} />
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

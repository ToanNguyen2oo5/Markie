import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MagnifyingGlass,
  House,
  Users,
  MonitorPlay,
  Storefront,
  UsersThree,
  List,
  MessengerLogo,
  Bell,
  User,
  SignOut,
} from '@phosphor-icons/react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfile } from '../../context/ProfileContext';
import { useAuth } from '../../context/AuthContext';
import { SearchSuggestionDropdown } from '../search/SearchSuggestionDropdown';
import keycloak from '../../keycloak';
import type { SearchPostResult, SearchUserResult, SearchApiResponse } from '../../types/searchTypes';

export function Header() {
  const { profile, avatarUrl, fullName } = useProfile();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestedUsers, setSuggestedUsers] = useState<SearchUserResult[]>([]);
  const [suggestedPosts, setSuggestedPosts] = useState<SearchPostResult[]>([]);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const location = useLocation();
  const isFeed = location.pathname === '/feed';
  const isFriends = location.pathname === '/friends';

  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(target)
      ) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSuggestedUsers([]);
      setSuggestedPosts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      try {
        await keycloak.updateToken(30);
      } catch {
        // ignore
      }

      const headers: Record<string, string> = {};
      if (keycloak.token) {
        headers['Authorization'] = `Bearer ${keycloak.token}`;
      }

      const [usersRes, postsRes] = await Promise.allSettled([
        fetch(`/search/users?keyword=${encodeURIComponent(query)}&page=0&size=4`, { headers }),
        fetch(`/search/posts?keyword=${encodeURIComponent(query)}&page=0&size=3`, { headers }),
      ]);

      if (usersRes.status === 'fulfilled' && usersRes.value.ok) {
        const data: SearchApiResponse<SearchUserResult> = await usersRes.value.json();
        if (data.code === 1000) {
          setSuggestedUsers(data.result.items || []);
        }
      }

      if (postsRes.status === 'fulfilled' && postsRes.value.ok) {
        const data: SearchApiResponse<SearchPostResult> = await postsRes.value.json();
        if (data.code === 1000) {
          setSuggestedPosts(data.result.items || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch search suggestions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setSearchValue(value);
    if (!value.trim()) {
      setIsOpen(false);
      setSuggestedUsers([]);
      setSuggestedPosts([]);
      return;
    }

    setIsOpen(true);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 250);
  };

  const handleSearch = (customQuery?: string) => {
    const queryToUse = (customQuery ?? searchValue).trim();
    if (queryToUse) {
      setIsOpen(false);
      navigate(`/search?q=${encodeURIComponent(queryToUse)}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelectUser = (user: SearchUserResult) => {
    setIsOpen(false);
    navigate(`/profile/${encodeURIComponent(user.userId)}`);
  };

  const handleSelectPost = (post: SearchPostResult) => {
    setIsOpen(false);
    navigate(`/search?q=${encodeURIComponent(post.content.slice(0, 30))}`);
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-[#242526] border-b border-[#393A3B] z-50 flex items-center px-4 justify-between shadow-sm">
      
      {/* Left Section: Logo & Search */}
      <div className="flex items-center gap-2 w-[320px]">
        <Link to="/feed" className="flex items-center gap-2 group">
          <img
            src="/favicon.svg"
            alt="Markie logo"
            className="w-8 h-8 flex-shrink-0 group-hover:scale-110 transition-transform duration-200"
          />
          <span className="font-bold text-[17px] text-white tracking-tight hidden sm:block">
            Markie
          </span>
        </Link>
        <div ref={searchContainerRef} className="relative hidden md:flex items-center">
          <button
            onClick={() => handleSearch()}
            className="absolute left-3 text-[#A8AB81] hover:text-[#E4E6EB] transition-colors cursor-pointer z-10"
            aria-label="Tìm kiếm"
          >
            <MagnifyingGlass className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => {
              if (searchValue.trim()) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Tìm kiếm trên Markie"
            className="bg-[#3A3B3C] text-[#E4E6EB] placeholder-[#A8AB81] h-10 w-[240px] rounded-full pl-10 pr-4 outline-none focus:w-[280px] focus:ring-2 focus:ring-[#0866FF]/40 transition-all duration-300"
          />

          {/* Search Suggestion Dropdown */}
          {isOpen && searchValue.trim().length > 0 && (
            <SearchSuggestionDropdown
              keyword={searchValue.trim()}
              users={suggestedUsers}
              posts={suggestedPosts}
              loading={loading}
              onSelectKeyword={(kw) => handleSearch(kw)}
              onSelectUser={handleSelectUser}
              onSelectPost={handleSelectPost}
            />
          )}
        </div>
      </div>

      {/* Center Section: Navigation Tabs */}
      <div className="hidden md:flex items-center justify-center h-full flex-1 max-w-[600px] gap-2">
        <NavTab
          icon={<House weight={isFeed ? 'fill' : 'regular'} />}
          active={isFeed}
          onClick={() => navigate('/feed')}
          title="Bảng tin"
        />
        <NavTab
          icon={<Users weight={isFriends ? 'fill' : 'regular'} />}
          active={isFriends}
          onClick={() => navigate('/friends')}
          title="Đề xuất bạn bè"
        />
        <NavTab icon={<MonitorPlay />} title="Video" />
        <NavTab icon={<Storefront />} title="Marketplace" />
        <NavTab icon={<UsersThree />} title="Nhóm" />
      </div>

      {/* Right Section: Actions & Profile */}
      <div className="flex items-center justify-end gap-2 w-[320px]">
        <div className="hidden md:flex items-center gap-2">
           <IconButton icon={<List />} />
           <IconButton icon={<MessengerLogo weight="fill" />} />
           <IconButton icon={<Bell weight="fill" />} badge={3} />
        </div>
        {/* Profile Avatar & Dropdown Menu */}
        <div ref={profileMenuRef} className="relative ml-2">
          <button
            type="button"
            onClick={() => setProfileMenuOpen((prev) => !prev)}
            className={`w-10 h-10 rounded-full overflow-hidden transition-all duration-200 cursor-pointer block border ${
              profileMenuOpen
                ? 'ring-2 ring-blue-500 border-transparent shadow-lg shadow-blue-500/20'
                : 'border-zinc-700/60 hover:opacity-95 hover:ring-2 hover:ring-blue-500/50'
            }`}
            title="Tài khoản cá nhân"
            aria-expanded={profileMenuOpen}
          >
            <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
          </button>

          <AnimatePresence>
            {profileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute right-0 mt-2 w-64 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl p-2 shadow-2xl shadow-black/70 z-50 overflow-hidden"
              >
                {/* User quick profile banner */}
                <div
                  onClick={() => {
                    setProfileMenuOpen(false);
                    navigate('/profile');
                  }}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-800/80 transition-colors cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-zinc-800 border border-zinc-700/60 group-hover:ring-2 group-hover:ring-blue-500/40 transition-all">
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-100 group-hover:text-blue-400 truncate transition-colors">
                      {fullName || profile?.username || 'Người dùng'}
                    </p>
                    <p className="text-xs text-zinc-400 truncate">
                      @{profile?.username || 'user'}
                    </p>
                  </div>
                </div>

                <div className="my-1.5 border-t border-zinc-800/80" />

                {/* Actions */}
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    navigate('/profile');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800/60 rounded-xl transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4 text-blue-400" />
                  <span>Xem trang cá nhân</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer active:scale-[0.98]"
                >
                  <SignOut className="w-4 h-4 text-rose-400" />
                  <span>Đăng xuất</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

    </header>
  );
}

function NavTab({
  icon,
  active,
  onClick,
  title,
}: {
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`relative h-full w-[110px] flex items-center justify-center cursor-pointer group transition-colors ${
        active
          ? 'text-[#0866FF]'
          : 'text-[#B0B3B8] hover:bg-[#3A3B3C] hover:rounded-lg my-1'
      }`}
    >
      <div className="w-7 h-7 flex items-center justify-center">
        {icon}
      </div>
      {active && (
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#0866FF] rounded-t-md" />
      )}
    </button>
  );
}

function IconButton({ icon, badge }: { icon: React.ReactNode, badge?: number }) {
  return (
    <button className="w-10 h-10 rounded-full bg-[#3A3B3C] hover:bg-[#4E4F50] flex items-center justify-center text-[#E4E6EB] transition-colors relative cursor-pointer">
      <div className="w-5 h-5">
        {icon}
      </div>
      {badge && (
        <span className="absolute -top-1 -right-1 bg-[#E41E3F] text-white text-[11px] font-bold px-1.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
}

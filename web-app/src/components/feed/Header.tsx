import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MagnifyingGlass,
  House,
  Users,
  User,
  SignOut,
  Sparkle,
  Sun,
  Moon,
} from '@phosphor-icons/react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfile } from '../../context/ProfileContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { SearchSuggestionDropdown } from '../search/SearchSuggestionDropdown';
import keycloak from '../../keycloak';
import type { SearchPostResult, SearchUserResult, SearchApiResponse } from '../../types/searchTypes';

export function Header() {
  const { profile, avatarUrl, fullName } = useProfile();
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
    <header className="fixed top-0 left-0 right-0 h-14 bg-white/90 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800/80 z-50 flex items-center px-4 sm:px-6 justify-between shadow-[0_1px_3px_0_rgba(15,23,42,0.03)] dark:shadow-none transition-colors">
      
      {/* Left Section: Logo & Minimalist Search */}
      <div className="flex items-center gap-3 w-auto sm:w-[320px]">
        <Link to="/feed" className="flex items-center gap-2 group flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-600/15 border border-indigo-200/60 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-600/25 transition-colors shadow-xs">
            <Sparkle weight="fill" className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <span className="font-heading font-bold text-[17px] text-slate-900 dark:text-slate-100 tracking-tight hidden sm:flex items-center gap-1.5">
            GenV
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" title="Hệ thống trực tuyến" />
          </span>
        </Link>

        <div ref={searchContainerRef} className="relative hidden md:flex items-center">
          <button
            onClick={() => handleSearch()}
            className="absolute left-3 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer z-10"
            aria-label="Tìm kiếm"
          >
            <MagnifyingGlass className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => {
              if (searchValue.trim()) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Tìm kiếm bài viết, bạn bè..."
            className="bg-slate-100/90 dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 text-sm h-9 w-[220px] rounded-xl pl-9 pr-3 outline-none border border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 dark:focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/15 focus:w-[260px] transition-all duration-200"
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

      {/* Center Section: Core Functional Tabs (Feed & Friends) */}
      <nav className="flex items-center justify-center h-full gap-1">
        <NavTab
          icon={<House weight={isFeed ? 'fill' : 'regular'} className="w-4 h-4" />}
          label="Bảng tin"
          active={isFeed}
          onClick={() => navigate('/feed')}
        />
        <NavTab
          icon={<Users weight={isFriends ? 'fill' : 'regular'} className="w-4 h-4" />}
          label="Đề xuất bạn bè"
          active={isFriends}
          onClick={() => navigate('/friends')}
        />
      </nav>

      {/* Right Section: Theme Toggle & User Profile */}
      <div className="flex items-center justify-end gap-2.5 w-auto sm:w-[320px]">
        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
          aria-label="Đổi giao diện sáng tối"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100/80 dark:bg-slate-900/80 hover:bg-slate-200/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-all cursor-pointer shadow-2xs"
        >
          {theme === 'dark' ? (
            <Sun weight="fill" className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" />
          ) : (
            <Moon weight="fill" className="w-4 h-4 text-indigo-600 transition-transform hover:-rotate-12" />
          )}
        </button>

        {/* Profile Avatar & Dropdown Menu */}
        <div ref={profileMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setProfileMenuOpen((prev) => !prev)}
            className={`w-9 h-9 rounded-xl overflow-hidden transition-all duration-200 cursor-pointer block border ${
              profileMenuOpen
                ? 'ring-2 ring-indigo-500 border-transparent shadow-sm shadow-indigo-500/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:ring-2 hover:ring-indigo-500/20'
            }`}
            title="Tài khoản cá nhân"
            aria-expanded={profileMenuOpen}
          >
            <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
          </button>

          <AnimatePresence>
            {profileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="absolute right-0 mt-2 w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-xl shadow-slate-900/10 dark:shadow-black/80 z-50 overflow-hidden"
              >
                {/* User quick profile banner */}
                <div
                  onClick={() => {
                    setProfileMenuOpen(false);
                    navigate('/profile');
                  }}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 group-hover:ring-2 group-hover:ring-indigo-500/30 transition-all">
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate transition-colors">
                      {fullName || profile?.username || 'Người dùng'}
                    </p>
                    <p className="font-code text-xs text-slate-500 dark:text-slate-400 truncate">
                      @{profile?.username || 'user'}
                    </p>
                  </div>
                </div>

                <div className="my-1.5 border-t border-slate-200 dark:border-slate-800" />

                {/* Quick Theme Switch inside menu */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    {theme === 'dark' ? (
                      <Sun className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Moon className="w-4 h-4 text-indigo-600" />
                    )}
                    <span>Giao diện: {theme === 'dark' ? 'Tối' : 'Sáng'}</span>
                  </span>
                  <span className="font-code text-[11px] text-slate-400 dark:text-slate-500">
                    Đổi
                  </span>
                </button>

                {/* Actions */}
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    navigate('/profile');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Trang cá nhân</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer active:scale-[0.98]"
                >
                  <SignOut className="w-4 h-4 text-rose-600 dark:text-rose-400" />
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
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative h-9 px-3.5 rounded-xl flex items-center gap-2 text-sm font-medium transition-all duration-200 cursor-pointer ${
        active
          ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-600/10 border border-indigo-200/80 dark:border-indigo-500/30 shadow-xs'
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent'
      }`}
    >
      {icon}
      <span className="hidden sm:inline font-heading text-[13px]">{label}</span>
    </button>
  );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import keycloak from '../keycloak';
import { Header } from '../components/feed/Header';
import { CreatePostCard } from '../components/feed/CreatePostCard';
import { PostCard } from '../components/feed/PostCard';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { ArrowClockwise, Article, Users, Compass } from '@phosphor-icons/react';

import type { PostData, FeedTab } from '../types/postTypes';
export type { PostData };

const postContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const postItemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
};

export function NewsFeedPage() {
  const { authenticated } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<FeedTab>('following');
  const [posts, setPosts] = useState<PostData[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const loadingRef = useRef(false);
  const requestIdRef = useRef(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Redirect to landing if not authenticated
  useEffect(() => {
    if (!authenticated) {
      navigate('/', { replace: true });
    }
  }, [authenticated, navigate]);

  const fetchPosts = useCallback(
    async (activeTab: FeedTab, currentCursor: string | null, force = false) => {
      if (loadingRef.current && !force) return;
      loadingRef.current = true;
      setLoading(true);
      const reqId = ++requestIdRef.current;

      try {
        await keycloak.updateToken(30);
      } catch {
        console.warn('Token refresh failed');
      }

      const params = new URLSearchParams({ tab: activeTab, limit: '5' });
      if (currentCursor) params.set('cursor', currentCursor);

      try {
        const res = await fetch(`/post/feed?${params}`, {
          headers: { Authorization: `Bearer ${keycloak.token}` },
        });

        if (reqId !== requestIdRef.current) return;

        if (!res.ok) {
          console.error('Fetch posts failed with status:', res.status);
          return;
        }

        const data = await res.json();
        if (reqId !== requestIdRef.current) return;

        if (data.code === 1000) {
          const page = data.result;
          setPosts((prev) => (currentCursor ? [...prev, ...page.data] : page.data));
          setCursor(page.nextCursor ?? null);
          setHasNext(page.hasNext);
        } else {
          console.error('Fetch posts error:', data.message);
        }
      } catch (err) {
        console.error('Network error:', err);
      } finally {
        if (reqId === requestIdRef.current) {
          loadingRef.current = false;
          setLoading(false);
          setInitialLoading(false);
        }
      }
    },
    []
  );

  // Initial load & reload on tab change
  useEffect(() => {
    if (authenticated) {
      setPosts([]);
      setCursor(null);
      setHasNext(true);
      setInitialLoading(true);
      fetchPosts(tab, null, true);
    }
  }, [authenticated, tab, fetchPosts]);

  // Infinite scroll sentinel
  useEffect(() => {
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNext && !loadingRef.current) {
          fetchPosts(tab, cursor);
        }
      },
      { threshold: 0.5 }
    );
    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }
    return () => observerRef.current?.disconnect();
  }, [tab, cursor, hasNext, fetchPosts]);

  const handlePostCreated = (newPost: PostData) => {
    if (tab === 'following') {
      setPosts((prev) => [newPost, ...prev]);
    } else {
      setTab('following');
    }
  };

  if (!authenticated) return null;

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-indigo-500/20 selection:text-indigo-700 dark:selection:text-indigo-300 transition-colors duration-200">
      <Header />

      {/* ================= MAIN WORKSPACE (BẢNG TIN + CHAT SERVICE BÊN PHẢI) ================= */}
      <div className="flex-1 flex relative max-w-[1600px] w-full mx-auto pt-14">
        {/* KHU VỰC GIỮA: BẢNG TIN (FEED) */}
        <main
          id="feed-container"
          className="flex-1 flex justify-center px-4 sm:px-6 pt-6 pb-24 transition-all duration-300"
        >
          <div className="w-full max-w-[640px] space-y-4">
            {/* Create Post Card */}
            <CreatePostCard onPostCreated={handlePostCreated} />

            {/* Feed Mode Tabs */}
            <div className="genv-card rounded-2xl p-1.5 border border-slate-200/90 dark:border-slate-800/80 grid grid-cols-2 gap-1.5 shadow-xs">
              <button
                type="button"
                onClick={() => setTab('following')}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-heading text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  tab === 'following'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Users className="w-4 h-4" weight={tab === 'following' ? 'fill' : 'regular'} />
                <span>Đang theo dõi</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('discover')}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-heading text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  tab === 'discover'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Compass className="w-4 h-4" weight={tab === 'discover' ? 'fill' : 'regular'} />
                <span>Khám phá</span>
              </button>
            </div>

            {/* Posts Feed */}
            {initialLoading ? (
              <div className="space-y-4">
                <PostCardSkeleton />
                <PostCardSkeleton />
                <PostCardSkeleton />
              </div>
            ) : posts.length === 0 ? (
              <div className="genv-card rounded-2xl p-12 text-center border border-slate-200/90 dark:border-slate-800/80 flex flex-col items-center justify-center shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3">
                  <Article className="w-6 h-6" />
                </div>
                {tab === 'following' ? (
                  <>
                    <h3 className="font-heading font-semibold text-slate-900 dark:text-slate-100 text-base">
                      Chưa có bài viết trong bảng tin theo dõi
                    </h3>
                    <p className="font-sans text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-sm">
                      Hãy đăng bài viết đầu tiên hoặc chuyển sang mục Khám phá để xem bài viết từ cộng đồng.
                    </p>
                    <button
                      type="button"
                      onClick={() => setTab('discover')}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-heading text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Compass className="w-4 h-4" weight="fill" />
                      <span>Khám phá ngay</span>
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className="font-heading font-semibold text-slate-900 dark:text-slate-100 text-base">
                      Chưa có bài viết khám phá nào
                    </h3>
                    <p className="font-sans text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-sm">
                      Hiện chưa có bài viết mới từ những người dùng khác trên hệ thống.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <motion.div
                variants={postContainerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                <AnimatePresence>
                  {posts.map((post) => (
                    <motion.div key={post.id} variants={postItemVariants}>
                      <PostCard post={post} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Infinite Scroll Trigger Sentinel */}
            <div ref={sentinelRef} className="h-2" />

            {loading && !initialLoading && (
              <div className="flex justify-center py-6">
                <ArrowClockwise className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-spin" />
              </div>
            )}

            {!hasNext && posts.length > 0 && (
              <div className="py-8 text-center">
                <span className="font-code text-xs text-slate-500 dark:text-slate-400 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/60">
                  Đã hiển thị toàn bộ bài viết
                </span>
              </div>
            )}
          </div>
        </main>

        {/* KHU VỰC CHAT SERVICE Ở BÊN PHẢI (RIGHT SIDEBAR) */}
        <ChatSidebar />
      </div>
    </div>
  );
}

function PostCardSkeleton() {
  return (
    <div className="genv-card rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800/80 animate-pulse space-y-4 shadow-xs">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-200/80 dark:bg-slate-800/80" />
        <div className="space-y-2 flex-1">
          <div className="h-3.5 w-32 bg-slate-200/80 dark:bg-slate-800/80 rounded" />
          <div className="h-2.5 w-20 bg-slate-200/50 dark:bg-slate-800/50 rounded" />
        </div>
      </div>
      <div className="space-y-2 pt-2">
        <div className="h-3 bg-slate-200/60 dark:bg-slate-800/60 rounded w-full" />
        <div className="h-3 bg-slate-200/60 dark:bg-slate-800/60 rounded w-4/5" />
        <div className="h-3 bg-slate-200/60 dark:bg-slate-800/60 rounded w-2/3" />
      </div>
      <div className="h-4 bg-slate-200/40 dark:bg-slate-800/40 rounded w-24 pt-2" />
    </div>
  );
}

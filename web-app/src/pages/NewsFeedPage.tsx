import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import keycloak from '../keycloak';
import { Header } from '../components/feed/Header';
import { CreatePostCard } from '../components/feed/CreatePostCard';
import { PostCard } from '../components/feed/PostCard';
import { ArrowClockwise, Article } from '@phosphor-icons/react';

export interface PostData {
  id: string;
  userId: string;
  username: string | null;
  content: string;
  createdDate: string;
  modifiedDate: string;
}

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
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export function NewsFeedPage() {
  const { authenticated } = useAuth();
  const navigate = useNavigate();

  const [posts, setPosts] = useState<PostData[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const loadingRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Redirect to landing if not authenticated
  useEffect(() => {
    if (!authenticated) {
      navigate('/', { replace: true });
    }
  }, [authenticated, navigate]);

  const fetchPosts = useCallback(async (currentCursor: string | null) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    try {
      await keycloak.updateToken(30);
    } catch {
      console.warn('Token refresh failed');
    }

    const params = new URLSearchParams({ limit: '5' });
    if (currentCursor) params.set('cursor', currentCursor);

    try {
      const res = await fetch(`/post/my-posts?${params}`, {
        headers: { Authorization: `Bearer ${keycloak.token}` },
      });

      if (!res.ok) {
        console.error('Fetch posts failed with status:', res.status);
        return;
      }

      const data = await res.json();
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
      loadingRef.current = false;
      setLoading(false);
      setInitialLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (authenticated) {
      fetchPosts(null);
    }
  }, [authenticated, fetchPosts]);

  // Infinite scroll sentinel
  useEffect(() => {
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNext && !loadingRef.current) {
          fetchPosts(cursor);
        }
      },
      { threshold: 0.5 }
    );
    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }
    return () => observerRef.current?.disconnect();
  }, [cursor, hasNext, fetchPosts]);

  const handlePostCreated = (newPost: PostData) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  if (!authenticated) return null;

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-indigo-500/20 selection:text-indigo-700 dark:selection:text-indigo-300 transition-colors duration-200">
      <Header />

      {/* Main Single-Column Feed */}
      <main className="flex-1 flex flex-col items-center pt-16 px-4">
        <div className="w-full max-w-[640px] py-6 space-y-4">

          {/* Create Post Card */}
          <CreatePostCard onPostCreated={handlePostCreated} />

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
              <h3 className="font-heading font-semibold text-slate-900 dark:text-slate-100 text-base">
                Chưa có bài viết nào
              </h3>
              <p className="font-sans text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-sm">
                Hãy là người đầu tiên chia sẻ góc nhìn hoặc bài viết của bạn với cộng đồng GenV.
              </p>
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

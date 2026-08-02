import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import keycloak from '../keycloak';
import { Header } from '../components/feed/Header';
import { CreatePostCard } from '../components/feed/CreatePostCard';
import { PostCard } from '../components/feed/PostCard';
import { ArrowClockwise } from '@phosphor-icons/react';

export interface PostData {
  id: string;
  userId: string;
  username: string | null;
  content: string;
  createdDate: string;
  modifiedDate: string;
}

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

    // Ensure token is fresh
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated]);

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
    <div className="min-h-screen bg-[#18191A] text-[#E4E6EB] flex flex-col">
      <Header />

      {/* Single-column centered feed */}
      <main className="flex-1 flex flex-col items-center pt-16 px-4">
        <div className="w-full max-w-[680px] py-6">

          {/* Create Post */}
          <CreatePostCard onPostCreated={handlePostCreated} />

          {/* Posts */}
          <div className="mt-4 space-y-4">
            {initialLoading ? (
              <>
                <PostCardSkeleton />
                <PostCardSkeleton />
                <PostCardSkeleton />
              </>
            ) : posts.length === 0 ? (
              <div className="bg-[#242526] rounded-xl p-12 text-center border border-[#393A3B]/30">
                <p className="text-[#B0B3B8] text-lg">Bạn chưa có bài viết nào 📝</p>
                <p className="text-[#B0B3B8] text-sm mt-2">Hãy chia sẻ điều gì đó đầu tiên!</p>
              </div>
            ) : (
              posts.map((post) => <PostCard key={post.id} post={post} />)
            )}

            {/* Infinite scroll trigger */}
            <div ref={sentinelRef} className="h-2" />

            {loading && !initialLoading && (
              <div className="flex justify-center py-6">
                <ArrowClockwise className="w-7 h-7 text-[#0866FF] animate-spin" />
              </div>
            )}

            {!hasNext && posts.length > 0 && (
              <p className="text-center text-[#B0B3B8] text-sm py-4 pb-8">
                ✅ Bạn đã xem hết tất cả bài viết
              </p>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}

function PostCardSkeleton() {
  return (
    <div className="bg-[#242526] rounded-xl p-4 border border-[#393A3B]/30 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-[#3A3B3C]" />
        <div className="flex flex-col gap-2">
          <div className="h-3 w-32 bg-[#3A3B3C] rounded-full" />
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

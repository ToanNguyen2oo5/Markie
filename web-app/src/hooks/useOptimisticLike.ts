import { useState, useRef, useEffect, useCallback } from 'react';
import type { LikeStatusResponse } from '../types/postTypes';

interface UseOptimisticLikeOptions {
  initialLiked: boolean;
  initialCount: number;
  onLike: () => Promise<LikeStatusResponse>;
  onUnlike: () => Promise<LikeStatusResponse>;
  onError?: (err: Error) => void;
}

export function useOptimisticLike({
  initialLiked,
  initialCount,
  onLike,
  onUnlike,
  onError,
}: UseOptimisticLikeOptions) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const inFlightRef = useRef(false);

  useEffect(() => {
    setLiked(initialLiked);
  }, [initialLiked]);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  const toggle = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    const prevLiked = liked;
    const prevCount = count;
    const nextLiked = !prevLiked;
    const nextCount = Math.max(0, prevCount + (nextLiked ? 1 : -1));

    setLiked(nextLiked);
    setCount(nextCount);

    try {
      const res = nextLiked ? await onLike() : await onUnlike();
      setLiked(res.liked);
      setCount(res.likeCount);
    } catch (e) {
      setLiked(prevLiked);
      setCount(prevCount);
      onError?.(e instanceof Error ? e : new Error('Thao tác thất bại'));
    } finally {
      inFlightRef.current = false;
    }
  }, [liked, count, onLike, onUnlike, onError]);

  return { liked, count, toggle };
}


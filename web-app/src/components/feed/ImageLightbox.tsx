import { useEffect, useCallback } from 'react';
import { X, CaretLeft, CaretRight, DownloadSimple } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PostFile } from '../../types/postTypes';

interface ImageLightboxProps {
  images: PostFile[];
  initialIndex?: number;
  currentIndex: number;
  onIndexChange: (newIndex: number) => void;
  onClose: () => void;
}

export function ImageLightbox({
  images,
  currentIndex,
  onIndexChange,
  onClose,
}: ImageLightboxProps) {
  const currentImage = images[currentIndex];

  const handleNext = useCallback(() => {
    if (images.length <= 1) return;
    onIndexChange((currentIndex + 1) % images.length);
  }, [currentIndex, images.length, onIndexChange]);

  const handlePrev = useCallback(() => {
    if (images.length <= 1) return;
    onIndexChange((currentIndex - 1 + images.length) % images.length);
  }, [currentIndex, images.length, onIndexChange]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleNext, handlePrev, onClose]);

  if (!currentImage) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/90 dark:bg-slate-950/95 backdrop-blur-md"
        />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-slate-950/80 to-transparent">
          <div className="flex items-center gap-3 text-white">
            <span className="font-heading font-semibold text-sm">
              {currentImage.originalName}
            </span>
            {images.length > 1 && (
              <span className="font-code text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300">
                {currentIndex + 1} / {images.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <a
              href={currentImage.url}
              download={currentImage.originalName}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              title="Tải ảnh về máy"
            >
              <DownloadSimple className="w-5 h-5" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              title="Đóng (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Previous Button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/25 active:scale-95 flex items-center justify-center text-white transition-all cursor-pointer backdrop-blur-sm"
            aria-label="Ảnh trước"
          >
            <CaretLeft weight="bold" className="w-6 h-6" />
          </button>
        )}

        {/* Image Content Container */}
        <motion.div
          key={currentImage.fileId || currentImage.url}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="relative max-w-[90vw] max-h-[85vh] z-10 flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={currentImage.url}
            alt={currentImage.originalName}
            className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl select-none"
          />
        </motion.div>

        {/* Next Button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/25 active:scale-95 flex items-center justify-center text-white transition-all cursor-pointer backdrop-blur-sm"
            aria-label="Ảnh tiếp theo"
          >
            <CaretRight weight="bold" className="w-6 h-6" />
          </button>
        )}
      </div>
    </AnimatePresence>
  );
}

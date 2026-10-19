import { useState, useRef } from 'react';
import { PencilSimpleLine, X, ArrowClockwise, PaperPlaneTilt } from '@phosphor-icons/react';
import keycloak from '../../keycloak';
import type { PostData } from '../../pages/NewsFeedPage';
import { AnimatePresence, motion } from 'framer-motion';
import { useProfile } from '../../context/ProfileContext';

interface CreatePostCardProps {
  onPostCreated: (post: PostData) => void;
}

export function CreatePostCard({ onPostCreated }: CreatePostCardProps) {
  const { avatarUrl, fullName, profile } = useProfile();
  const [modalOpen, setModalOpen] = useState(false);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    if (!content.trim() || submitting || content.length > 500) return;
    setSubmitting(true);
    setError(null);

    try {
      await keycloak.updateToken(30);
    } catch {
      console.warn('Token refresh skipped');
    }

    try {
      const res = await fetch('/post/create', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${keycloak.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: content.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.code === 1000) {
        onPostCreated(data.result as PostData);
        setContent('');
        setModalOpen(false);
      } else {
        setError(data.message || 'Đăng bài thất bại');
      }
    } catch {
      setError('Không thể kết nối đến máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Trigger Card - Dynamic Light/Dark Glassmorphism */}
      <div className="w-full genv-card rounded-2xl p-4 transition-all">
        <div className="flex items-center gap-3">
          <img
            src={avatarUrl}
            alt="Profile"
            className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-800 flex-shrink-0"
          />
          <button
            type="button"
            onClick={() => {
              setModalOpen(true);
              setTimeout(() => textareaRef.current?.focus(), 60);
            }}
            className="flex-1 bg-slate-50 dark:bg-slate-900/90 hover:bg-slate-100/90 dark:hover:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-left rounded-xl px-4 py-2.5 text-sm transition-all duration-200 cursor-pointer border border-slate-200/90 dark:border-slate-800/80 flex items-center justify-between group shadow-2xs"
          >
            <span>Chia sẻ suy nghĩ của bạn với cộng đồng...</span>
            <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 font-medium">
              <PencilSimpleLine className="w-4 h-4" />
              <span className="hidden sm:inline font-heading">Viết bài</span>
            </div>
          </button>
        </div>
      </div>

      {/* Create Post Modal */}
      <AnimatePresence>
        {modalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !submitting && setModalOpen(false)}
              className="fixed inset-0 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-sm z-50"
            />

            {/* Modal Box */}
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.95, y: -16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -16 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-[520px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden mx-4 text-slate-900 dark:text-slate-100"
            >
              {/* Modal Header */}
              <div className="relative flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                <h2 className="font-heading font-bold text-slate-900 dark:text-slate-100 text-[16px] tracking-tight">
                  Tạo bài viết mới
                </h2>
                <button
                  type="button"
                  onClick={() => !submitting && setModalOpen(false)}
                  className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors cursor-pointer"
                  aria-label="Đóng"
                >
                  <X weight="bold" className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Author Info */}
              <div className="flex items-center gap-3 px-5 pt-4">
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700/60"
                />
                <div className="flex flex-col">
                  <p className="font-heading text-slate-900 dark:text-slate-100 font-semibold text-sm">
                    {fullName || profile?.username || 'Người dùng'}
                  </p>
                  <span className="font-code text-xs text-slate-500 dark:text-slate-400">
                    @{profile?.username || 'user'}
                  </span>
                </div>
              </div>

              {/* Textarea */}
              <div className="p-5">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Bạn đang có ý tưởng hoặc chia sẻ gì mới?"
                  rows={5}
                  className="w-full bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-[15px] outline-none resize-none leading-relaxed"
                />
              </div>

              {/* Error Alert */}
              {error && (
                <div className="mx-5 mb-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs rounded-xl px-3.5 py-2.5">
                  {error}
                </div>
              )}

              {/* Footer: Character Count & Submit */}
              <div className="px-5 pb-5 pt-2 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800/60">
                <span
                  className={`font-code text-xs ${
                    content.length > 450
                      ? 'text-rose-600 dark:text-rose-400 font-semibold'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {content.length} / 500
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    disabled={submitting}
                    className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!content.trim() || submitting || content.length > 500}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-heading font-semibold text-sm rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm shadow-indigo-600/30 active:scale-[0.98]"
                  >
                    {submitting ? (
                      <>
                        <ArrowClockwise className="w-4 h-4 animate-spin" />
                        <span>Đang đăng...</span>
                      </>
                    ) : (
                      <>
                        <PaperPlaneTilt weight="fill" className="w-4 h-4" />
                        <span>Đăng bài</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

import { useState, useRef } from 'react';
import { VideoCamera, ImageSquare, Smiley, X, ArrowClockwise } from '@phosphor-icons/react';
import keycloak from '../../keycloak';
import type { PostData } from '../../pages/NewsFeedPage';
import { AnimatePresence, motion } from 'framer-motion';
import { useProfile } from '../../context/ProfileContext';

interface CreatePostCardProps {
  onPostCreated: (post: PostData) => void;
}

const postErrorMessages: Record<number, string> = {
  1015: 'Nội dung bài viết chưa phù hợp. Vui lòng chỉnh sửa và thử lại.',
  1016: 'Chưa thể kiểm duyệt bài viết. Vui lòng thử lại sau.',
  1017: 'Vui lòng nhập nội dung bài viết.',
  1018: 'Nội dung bài viết không được vượt quá 500 ký tự.',
};

export function CreatePostCard({ onPostCreated }: CreatePostCardProps) {
  const { avatarUrl, fullName } = useProfile();
  const [modalOpen, setModalOpen] = useState(false);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submittingRef = useRef(false);

  const handleSubmit = async () => {
    // Lock synchronously, before token refresh or React's next render.
    if (submittingRef.current) return;
    if (!content.trim() || content.length > 500) {
      setError(postErrorMessages[!content.trim() ? 1017 : 1018]);
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);

    try {
      try {
        await keycloak.updateToken(30);
      } catch {
        console.warn('Token refresh skipped');
      }

      const res = await fetch('/post/create', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${keycloak.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      let body: unknown;
      try {
        body = await res.json();
      } catch {
        setError('Phản hồi từ máy chủ không hợp lệ. Vui lòng thử lại sau.');
        return;
      }
      if (!body || typeof body !== 'object' || !('code' in body) || typeof body.code !== 'number') {
        setError('Phản hồi từ máy chủ không hợp lệ. Vui lòng thử lại sau.');
        return;
      }
      const data = body as { code: number; result?: PostData };
      if (res.ok && data.code === 1000 && data.result && typeof data.result.id === 'string') {
        onPostCreated(data.result);
        setContent('');
        setModalOpen(false);
      } else {
        setError(postErrorMessages[data.code] || 'Đăng bài thất bại. Vui lòng thử lại sau.');
      }
    } catch {
      setError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối và thử lại.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Trigger Card */}
      <div className="w-full bg-[#242526] rounded-xl shadow-sm border border-[#393A3B]/30 p-4">
        <div className="flex items-center gap-3">
          <img src={avatarUrl} alt="Profile" className="w-10 h-10 rounded-full object-cover cursor-pointer hover:opacity-90 transition-opacity" />
          <button
            onClick={() => { setModalOpen(true); setTimeout(() => textareaRef.current?.focus(), 50); }}
            className="flex-1 bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#B0B3B8] text-left rounded-full px-4 py-2.5 text-[15px] transition-colors cursor-pointer outline-none"
          >
            Bạn đang nghĩ gì thế?
          </button>
        </div>

        <div className="border-b border-[#3E4042] my-3" />

        <div className="flex items-center justify-between gap-1">
          <ActionButton icon={<VideoCamera className="w-6 h-6 text-[#F3425F]" weight="fill" />} text="Video trực tiếp" onClick={() => setModalOpen(true)} />
          <ActionButton icon={<ImageSquare className="w-6 h-6 text-[#45BD62]" weight="fill" />} text="Ảnh/video" onClick={() => setModalOpen(true)} />
          <ActionButton icon={<Smiley className="w-6 h-6 text-[#F7B928]" weight="fill" />} text="Cảm xúc" onClick={() => setModalOpen(true)} />
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
              onClick={() => !submittingRef.current && setModalOpen(false)}
              className="fixed inset-0 bg-black/70 z-50"
            />

            {/* Modal */}
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-[500px] bg-[#242526] rounded-xl shadow-2xl border border-[#393A3B]"
            >
              {/* Modal Header */}
              <div className="relative flex items-center justify-center py-4 border-b border-[#3E4042]">
                <h2 className="text-[#E4E6EB] font-bold text-[17px]">Tạo bài viết</h2>
                <button
                  onClick={() => !submittingRef.current && setModalOpen(false)}
                  disabled={submitting}
                  aria-label="Đóng"
                  className="absolute right-4 w-9 h-9 rounded-full bg-[#3A3B3C] hover:bg-[#4E4F50] flex items-center justify-center text-[#E4E6EB] transition-colors cursor-pointer"
                >
                  <X weight="bold" className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Author */}
              <div className="flex items-center gap-3 p-4">
                <img src={avatarUrl} alt="Profile" className="w-10 h-10 rounded-full object-cover" />
                <div>
                  <p className="text-[#E4E6EB] font-semibold text-[15px]">{fullName || 'Người dùng'}</p>
                  <span className="text-xs bg-[#3A3B3C] text-[#E4E6EB] font-medium px-2 py-0.5 rounded-md">🌍 Công khai</span>
                </div>
              </div>

              {/* Textarea */}
              <div className="px-4 pb-4">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => { if (!submittingRef.current) setContent(e.target.value); }}
                  disabled={submitting}
                  placeholder="Bạn đang nghĩ gì thế?"
                  rows={5}
                  className="w-full bg-transparent text-[#E4E6EB] placeholder-[#B0B3B8] text-[18px] outline-none resize-none leading-relaxed"
                />
              </div>

              {/* Error message */}
              {error && (
                <div role="alert" className="mx-4 mb-3 bg-red-900/30 border border-red-800 text-red-300 text-sm rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              {/* Character count & Submit */}
              <div className="p-4 pt-0 flex items-center justify-between gap-3">
                <span className={`text-sm ${content.length > 450 ? 'text-red-400' : 'text-[#B0B3B8]'}`}>
                  {content.length} / 500
                </span>
                <button
                  onClick={handleSubmit}
                  disabled={!content.trim() || submitting || content.length > 500}
                  className="flex-1 py-2.5 bg-[#0866FF] hover:bg-[#0756d6] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-[15px] rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <ArrowClockwise className="w-4 h-4 animate-spin" />
                      Đang kiểm duyệt…
                    </>
                  ) : 'Đăng'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function ActionButton({ icon, text, onClick }: { icon: React.ReactNode, text: string, onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex-1 flex items-center justify-center gap-2 py-2 px-1 hover:bg-[#3A3B3C] rounded-lg transition-colors cursor-pointer">
      {icon}
      <span className="text-[#B0B3B8] font-medium text-[15px] hidden sm:block">{text}</span>
    </button>
  );
}

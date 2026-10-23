import { useState, memo, useMemo } from 'react';
import {
  ChatCircle,
  Copy,
  Check,
  PaperPlaneTilt,
  DownloadSimple,
  FilePdf,
  FileDoc,
  FileArchive,
  FileCode,
  FileText,
  File,
} from '@phosphor-icons/react';
import type { PostData, PostFile } from '../../types/postTypes';
import { CommentModal } from './CommentModal';
import { ImageLightbox } from './ImageLightbox';
import { useProfile } from '../../context/ProfileContext';
import { useChat } from '../../context/ChatContext';
import { formatFileSize } from '../../services/fileApi';

interface PostCardProps {
  post: PostData;
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getAvatarUrl(userId: string): string {
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(userId)}&size=40`;
}

function isImageAttachment(file: PostFile): boolean {
  if (file.contentType && file.contentType.startsWith('image/')) return true;
  const ext = file.originalName?.split('.').pop()?.toLowerCase();
  return ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp' || ext === 'gif';
}

function getDocumentIcon(filename: string) {
  const ext = filename?.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return <FilePdf className="w-5 h-5 text-rose-500 flex-shrink-0" weight="fill" />;
    case 'docx':
    case 'doc':
      return <FileDoc className="w-5 h-5 text-blue-500 flex-shrink-0" weight="fill" />;
    case 'xlsx':
    case 'xls':
    case 'csv':
      return <FileText className="w-5 h-5 text-emerald-500 flex-shrink-0" weight="fill" />;
    case 'zip':
    case 'rar':
    case '7z':
      return <FileArchive className="w-5 h-5 text-amber-500 flex-shrink-0" weight="fill" />;
    case 'txt':
    case 'json':
    case 'js':
    case 'ts':
      return <FileCode className="w-5 h-5 text-cyan-500 flex-shrink-0" weight="fill" />;
    default:
      return <File className="w-5 h-5 text-slate-400 flex-shrink-0" weight="fill" />;
  }
}

export const PostCard = memo(function PostCard({ post }: PostCardProps) {
  const { profile, avatarUrl: myAvatarUrl } = useProfile();
  const { openChat } = useChat();
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const isMyPost = profile?.userId === post.userId;
  const postAvatarUrl = isMyPost ? myAvatarUrl : getAvatarUrl(post.userId);
  const displayName = post.username ?? 'Người dùng';
  const timeAgo = formatTime(post.createdDate);

  const { images, documents } = useMemo(() => {
    const imgs: PostFile[] = [];
    const docs: PostFile[] = [];
    if (post.files && Array.isArray(post.files)) {
      post.files.forEach((file) => {
        if (isImageAttachment(file)) {
          imgs.push(file);
        } else {
          docs.push(file);
        }
      });
    }
    return { images: imgs, documents: docs };
  }, [post.files]);

  const handleCopyLink = async () => {
    const postUrl = `${window.location.origin}/feed#post-${post.id}`;
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const openImageAt = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <>
      <article
        id={`post-${post.id}`}
        className="w-full genv-card rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800/80 flex flex-col transition-all hover:border-slate-300 dark:hover:border-slate-700 shadow-xs"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <img
              src={postAvatarUrl}
              alt={displayName}
              className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-800"
            />
            <div className="flex flex-col">
              <h4 className="font-heading text-slate-900 dark:text-slate-100 font-semibold text-[15px] leading-snug">
                {displayName}
              </h4>
              <span className="font-code text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {timeAgo}
              </span>
            </div>
          </div>

          {/* Copy Link Action */}
          <button
            type="button"
            onClick={handleCopyLink}
            title="Sao chép liên kết bài viết"
            className="relative px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900/80 hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="font-code text-emerald-600 dark:text-emerald-400 font-medium">Đã chép</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span className="hidden sm:inline font-heading text-slate-600 dark:text-slate-400">Liên kết</span>
              </>
            )}
          </button>
        </div>

        {/* Content */}
        {post.content && post.content.trim().length > 0 && (
          <div className="pt-3.5 pb-2">
            <p className="font-sans text-slate-800 dark:text-slate-200 text-[15px] whitespace-pre-wrap leading-relaxed">
              {post.content}
            </p>
          </div>
        )}

        {/* ================= ATTACHED IMAGES GALLERY ================= */}
        {images.length > 0 && (
          <div className="mt-2.5 mb-2 overflow-hidden rounded-xl">
            {images.length === 1 && (
              <div
                onClick={() => openImageAt(0)}
                className="w-full max-h-[440px] overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900 cursor-pointer group"
              >
                <img
                  src={images[0].url}
                  alt={images[0].originalName}
                  loading="lazy"
                  className="w-full h-full max-h-[440px] object-cover group-hover:scale-[1.01] transition-transform duration-200"
                />
              </div>
            )}

            {images.length === 2 && (
              <div className="grid grid-cols-2 gap-2 h-64 sm:h-72">
                {images.map((img, idx) => (
                  <div
                    key={img.fileId || idx}
                    onClick={() => openImageAt(idx)}
                    className="w-full h-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900 cursor-pointer group"
                  >
                    <img
                      src={img.url}
                      alt={img.originalName}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                    />
                  </div>
                ))}
              </div>
            )}

            {images.length === 3 && (
              <div className="grid grid-cols-2 gap-2 h-72 sm:h-80">
                <div
                  onClick={() => openImageAt(0)}
                  className="row-span-2 w-full h-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900 cursor-pointer group"
                >
                  <img
                    src={images[0].url}
                    alt={images[0].originalName}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                  />
                </div>
                <div
                  onClick={() => openImageAt(1)}
                  className="w-full h-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900 cursor-pointer group"
                >
                  <img
                    src={images[1].url}
                    alt={images[1].originalName}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                  />
                </div>
                <div
                  onClick={() => openImageAt(2)}
                  className="w-full h-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900 cursor-pointer group"
                >
                  <img
                    src={images[2].url}
                    alt={images[2].originalName}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                  />
                </div>
              </div>
            )}

            {images.length >= 4 && (
              <div className="grid grid-cols-2 gap-2 h-72 sm:h-80">
                {images.slice(0, 4).map((img, idx) => {
                  const isFourth = idx === 3;
                  const remaining = images.length - 4;
                  return (
                    <div
                      key={img.fileId || idx}
                      onClick={() => openImageAt(idx)}
                      className="relative w-full h-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900 cursor-pointer group"
                    >
                      <img
                        src={img.url}
                        alt={img.originalName}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                      />
                      {isFourth && remaining > 0 && (
                        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center text-white font-heading font-bold text-2xl group-hover:bg-slate-950/70 transition-colors">
                          +{remaining}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= ATTACHED DOCUMENTS ================= */}
        {documents.length > 0 && (
          <div className="mt-2 space-y-2">
            {documents.map((doc, idx) => (
              <div
                key={doc.fileId || idx}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                  {getDocumentIcon(doc.originalName)}
                  <div className="flex flex-col min-w-0">
                    <span
                      className="text-sm font-sans font-medium text-slate-800 dark:text-slate-200 truncate"
                      title={doc.originalName}
                    >
                      {doc.originalName}
                    </span>
                    <span className="text-[11px] font-code text-slate-500 dark:text-slate-400">
                      {formatFileSize(doc.size)}
                    </span>
                  </div>
                </div>

                <a
                  href={doc.url}
                  download={doc.originalName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-heading text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer flex-shrink-0"
                  title="Tải tệp về máy"
                >
                  <DownloadSimple className="w-4 h-4" />
                  <span className="hidden sm:inline">Tải về</span>
                </a>
              </div>
            ))}
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-slate-100 dark:border-slate-800/80 mt-3 pt-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Comment Action Button */}
            <button
              type="button"
              onClick={() => setIsCommentModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-all text-xs font-heading font-medium cursor-pointer"
            >
              <ChatCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Bình luận</span>
            </button>

            {/* Quick Chat Button */}
            <button
              type="button"
              onClick={() => {
                const targetId = post.userId || post.username;
                if (targetId) {
                  openChat(targetId, {
                    name: post.username ? `@${post.username}` : 'Tác giả',
                    role: post.username ? `@${post.username}` : 'Người dùng',
                    avatar: `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(targetId)}&size=80`,
                  });
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-all text-xs font-heading font-medium cursor-pointer"
            >
              <PaperPlaneTilt className="w-3.5 h-3.5 text-indigo-500" />
              <span>Nhắn tin nhanh</span>
            </button>
          </div>

          <span className="font-code text-[11px] text-slate-400 dark:text-slate-600">
            ID: {post.id ? post.id.slice(0, 8) : ''}
          </span>
        </div>

        {/* Comment Modal */}
        {isCommentModalOpen && (
          <CommentModal 
            postId={post.id} 
            onClose={() => setIsCommentModalOpen(false)} 
          />
        )}
      </article>

      {/* Image Lightbox Modal */}
      {lightboxOpen && images.length > 0 && (
        <ImageLightbox
          images={images}
          currentIndex={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
});

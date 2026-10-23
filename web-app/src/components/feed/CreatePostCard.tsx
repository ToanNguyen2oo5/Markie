import { useState, useRef, useEffect, useCallback } from 'react';
import {
  PencilSimpleLine,
  X,
  ArrowClockwise,
  PaperPlaneTilt,
  Images,
  Paperclip,
  FilePdf,
  FileDoc,
  FileArchive,
  FileCode,
  FileText,
  File,
  ArrowCounterClockwise,
} from '@phosphor-icons/react';
import keycloak from '../../keycloak';
import type { PostData, PostFile } from '../../types/postTypes';
import { uploadAttachmentFile, deleteTemporaryAttachment, formatFileSize, toPostFile } from '../../services/fileApi';
import { AnimatePresence, motion } from 'framer-motion';
import { useProfile } from '../../context/ProfileContext';

interface CreatePostCardProps {
  onPostCreated: (post: PostData) => void;
}

interface AttachmentItem {
  localId: string;
  file: File;
  objectUrl: string;
  isImage: boolean;
  status: 'queued' | 'uploading' | 'uploaded' | 'error';
  progress: number;
  error?: string;
  serverMetadata?: PostFile;
  abortController?: AbortController;
}

const MAX_FILES = 10;
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MiB

function isImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp' || ext === 'gif';
}

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return <FilePdf className="w-5 h-5 text-rose-500" weight="fill" />;
    case 'docx':
    case 'doc':
      return <FileDoc className="w-5 h-5 text-blue-500" weight="fill" />;
    case 'xlsx':
    case 'xls':
    case 'csv':
      return <FileText className="w-5 h-5 text-emerald-500" weight="fill" />;
    case 'zip':
    case 'rar':
    case '7z':
      return <FileArchive className="w-5 h-5 text-amber-500" weight="fill" />;
    case 'txt':
    case 'json':
    case 'js':
    case 'ts':
      return <FileCode className="w-5 h-5 text-cyan-500" weight="fill" />;
    default:
      return <File className="w-5 h-5 text-slate-400" weight="fill" />;
  }
}

export function CreatePostCard({ onPostCreated }: CreatePostCardProps) {
  const { avatarUrl, fullName, profile } = useProfile();
  const [modalOpen, setModalOpen] = useState(false);
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentsRef = useRef<AttachmentItem[]>([]);
  attachmentsRef.current = attachments;

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach((att) => {
        if (att.objectUrl) URL.revokeObjectURL(att.objectUrl);
        if (att.abortController) att.abortController.abort();
      });
    };
  }, []);

  // Process upload queue with max 3 concurrent uploads
  const uploadQueueRunning = useRef(false);

  const processUploadQueue = useCallback(async () => {
    if (uploadQueueRunning.current) return;
    uploadQueueRunning.current = true;

    try {
      const activeCount = attachmentsRef.current.filter((a) => a.status === 'uploading').length;
      const queuedItems = attachmentsRef.current.filter((a) => a.status === 'queued');

      const toStart = queuedItems.slice(0, Math.max(0, 3 - activeCount));
      for (const item of toStart) {
        startUpload(item);
      }
    } finally {
      uploadQueueRunning.current = false;
    }
  }, []);

  const startUpload = async (item: AttachmentItem) => {
    const controller = new AbortController();

    setAttachments((prev) =>
      prev.map((a) =>
        a.localId === item.localId
          ? { ...a, status: 'uploading', progress: 0, abortController: controller, error: undefined }
          : a
      )
    );

    try {
      const result = await uploadAttachmentFile(
        item.file,
        (progress) => {
          setAttachments((prev) =>
            prev.map((a) => (a.localId === item.localId ? { ...a, progress } : a))
          );
        },
        controller.signal
      );

      setAttachments((prev) =>
        prev.map((a) =>
          a.localId === item.localId
            ? {
                ...a,
                status: 'uploaded',
                progress: 100,
                serverMetadata: toPostFile(result),
                abortController: undefined,
              }
            : a
        )
      );
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return; // Upload was canceled, ignore error state
      }
      const message = err instanceof Error ? err.message : 'Tải lên thất bại';
      setAttachments((prev) =>
        prev.map((a) =>
          a.localId === item.localId
            ? { ...a, status: 'error', error: message, abortController: undefined }
            : a
        )
      );
    }
  };

  useEffect(() => {
    const hasQueued = attachments.some((a) => a.status === 'queued');
    const uploadingCount = attachments.filter((a) => a.status === 'uploading').length;
    if (hasQueued && uploadingCount < 3) {
      processUploadQueue();
    }
  }, [attachments, processUploadQueue]);

  const addFiles = (selectedFiles: FileList | File[]) => {
    setError(null);
    const filesArray = Array.from(selectedFiles);
    if (!filesArray.length) return;

    if (attachments.length + filesArray.length > MAX_FILES) {
      setError(`Bạn chỉ có thể đính kèm tối đa ${MAX_FILES} tệp cho mỗi bài viết`);
      return;
    }

    const newItems: AttachmentItem[] = [];
    for (const file of filesArray) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`Tệp "${file.name}" vượt quá kích thước tối đa cho phép (25MB)`);
        continue;
      }
      const isImg = isImageFile(file);
      const objectUrl = isImg ? URL.createObjectURL(file) : '';
      newItems.push({
        localId: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        objectUrl,
        isImage: isImg,
        status: 'queued',
        progress: 0,
      });
    }

    if (newItems.length > 0) {
      setAttachments((prev) => [...prev, ...newItems]);
    }
  };

  const removeAttachment = async (localId: string) => {
    const item = attachments.find((a) => a.localId === localId);
    if (!item) return;

    if (item.abortController) {
      item.abortController.abort();
    }
    if (item.objectUrl) {
      URL.revokeObjectURL(item.objectUrl);
    }
    if (item.status === 'uploaded' && item.serverMetadata?.fileId) {
      deleteTemporaryAttachment(item.serverMetadata.fileId);
    }

    setAttachments((prev) => prev.filter((a) => a.localId !== localId));
  };

  const retryUpload = (localId: string) => {
    setAttachments((prev) =>
      prev.map((a) => (a.localId === localId ? { ...a, status: 'queued', error: undefined } : a))
    );
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const uploadingCount = attachments.filter((a) => a.status === 'uploading' || a.status === 'queued').length;
  const errorCount = attachments.filter((a) => a.status === 'error').length;
  const uploadedFiles = attachments
    .filter((a) => a.status === 'uploaded' && a.serverMetadata)
    .map((a) => a.serverMetadata!);

  const canSubmit =
    (content.trim().length > 0 || uploadedFiles.length > 0) &&
    content.length <= 500 &&
    uploadingCount === 0 &&
    errorCount === 0 &&
    !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      await keycloak.updateToken(30);
    } catch {
      console.warn('Token refresh skipped');
    }

    const clientRequestId = crypto.randomUUID();
    const fileIds = uploadedFiles.map((f) => f.fileId);

    try {
      const res = await fetch('/post/create', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${keycloak.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
          fileIds,
          clientRequestId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.code === 1000) {
        onPostCreated(data.result as PostData);
        // Clear state and close
        attachments.forEach((a) => {
          if (a.objectUrl) URL.revokeObjectURL(a.objectUrl);
        });
        setContent('');
        setAttachments([]);
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

  const openModalWithAction = (action?: 'image' | 'file') => {
    setModalOpen(true);
    setTimeout(() => {
      textareaRef.current?.focus();
      if (action === 'image') {
        imageInputRef.current?.click();
      } else if (action === 'file') {
        fileInputRef.current?.click();
      }
    }, 100);
  };

  return (
    <>
      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.xlsx,.pptx,.txt,.csv,.zip,application/pdf,application/zip,text/plain,text/csv"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Trigger Card */}
      <div className="w-full genv-card rounded-2xl p-4 transition-all space-y-3">
        <div className="flex items-center gap-3">
          <img
            src={avatarUrl}
            alt="Profile"
            className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-800 flex-shrink-0"
          />
          <button
            type="button"
            onClick={() => openModalWithAction()}
            className="flex-1 bg-slate-50 dark:bg-slate-900/90 hover:bg-slate-100/90 dark:hover:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-left rounded-xl px-4 py-2.5 text-sm transition-all duration-200 cursor-pointer border border-slate-200/90 dark:border-slate-800/80 flex items-center justify-between group shadow-2xs"
          >
            <span>Chia sẻ suy nghĩ hoặc tệp của bạn với cộng đồng...</span>
            <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 font-medium">
              <PencilSimpleLine className="w-4 h-4" />
              <span className="hidden sm:inline font-heading">Viết bài</span>
            </div>
          </button>
        </div>

        {/* Quick Attachment Triggers */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
          <button
            type="button"
            onClick={() => openModalWithAction('image')}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-xs font-heading font-medium cursor-pointer"
          >
            <Images className="w-4 h-4 text-emerald-500" />
            <span>Ảnh</span>
          </button>
          <button
            type="button"
            onClick={() => openModalWithAction('file')}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-xs font-heading font-medium cursor-pointer"
          >
            <Paperclip className="w-4 h-4 text-indigo-500" />
            <span>Đính kèm tệp</span>
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
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-[560px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border transition-colors overflow-hidden mx-4 text-slate-900 dark:text-slate-100 max-h-[90vh] flex flex-col ${
                isDragging
                  ? 'border-indigo-500 ring-4 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* Modal Header */}
              <div className="relative flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
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

              {/* Scrollable Content Body */}
              <div className="overflow-y-auto flex-1 p-5 space-y-4">
                {/* Author Info */}
                <div className="flex items-center gap-3">
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
                <div>
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Bạn đang có ý tưởng hoặc chia sẻ gì mới?"
                    rows={4}
                    className="w-full bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-[15px] outline-none resize-none leading-relaxed"
                  />
                </div>

                {/* Attachments Section */}
                {attachments.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-heading">
                      <span>Tệp đính kèm ({attachments.length}/{MAX_FILES})</span>
                      {uploadingCount > 0 && (
                        <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                          <ArrowClockwise className="w-3.5 h-3.5 animate-spin" />
                          Đang tải lên ({uploadingCount})...
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {attachments.map((item) => (
                        <div
                          key={item.localId}
                          className="relative group rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-2 overflow-hidden flex flex-col justify-between min-h-[90px]"
                        >
                          {/* Image preview */}
                          {item.isImage && item.objectUrl ? (
                            <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 mb-1.5">
                              <img
                                src={item.objectUrl}
                                alt={item.file.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="flex items-start gap-2 mb-1.5">
                              {getFileIcon(item.file.name)}
                              <span className="text-xs font-sans text-slate-800 dark:text-slate-200 font-medium truncate flex-1" title={item.file.name}>
                                {item.file.name}
                              </span>
                            </div>
                          )}

                          {/* Footer info: size & status */}
                          <div className="flex items-center justify-between text-[11px] font-code text-slate-500 dark:text-slate-400">
                            <span>{formatFileSize(item.file.size)}</span>
                            {item.status === 'uploading' && (
                              <span className="text-indigo-600 dark:text-indigo-400">{item.progress}%</span>
                            )}
                            {item.status === 'uploaded' && (
                              <span className="text-emerald-600 dark:text-emerald-400">✓ Đã tải</span>
                            )}
                            {item.status === 'error' && (
                              <button
                                type="button"
                                onClick={() => retryUpload(item.localId)}
                                className="text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                                title="Thử lại"
                              >
                                <ArrowCounterClockwise className="w-3 h-3" />
                                <span>Thử lại</span>
                              </button>
                            )}
                          </div>

                          {/* Progress bar */}
                          {item.status === 'uploading' && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-700">
                              <div
                                className="h-full bg-indigo-600 transition-all duration-150"
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                          )}

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => removeAttachment(item.localId)}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                            title="Xóa tệp"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Drag and drop hint overlay */}
                {isDragging && (
                  <div className="rounded-xl border-2 border-dashed border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 p-6 text-center text-indigo-600 dark:text-indigo-400 text-sm font-heading font-medium">
                    Thả tệp vào đây để tải lên
                  </div>
                )}

                {/* Error Alert */}
                {error && (
                  <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs rounded-xl px-3.5 py-2.5">
                    {error}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-3 flex-shrink-0 bg-slate-50/40 dark:bg-slate-900/40">
                {/* Media action buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={attachments.length >= MAX_FILES}
                    className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 cursor-pointer"
                    title="Thêm ảnh"
                  >
                    <Images className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={attachments.length >= MAX_FILES}
                    className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 cursor-pointer"
                    title="Đính kèm tệp"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <span
                    className={`font-code text-xs ml-2 ${
                      content.length > 450
                        ? 'text-rose-600 dark:text-rose-400 font-semibold'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {content.length} / 500
                  </span>
                </div>

                {/* Submit & Cancel */}
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
                    disabled={!canSubmit}
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

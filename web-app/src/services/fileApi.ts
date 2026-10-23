import keycloak from '../keycloak';
import type { PostFile } from '../types/postTypes';

export interface AttachmentUploadResult {
  fileId: string;
  originalName: string;
  contentType: string;
  size: number;
  previewUrl: string | null;
  expiresAt: string;
}

export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export async function uploadAttachmentFile(
  file: File,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<AttachmentUploadResult> {
  try {
    await keycloak.updateToken(30);
  } catch {
    console.warn('Token update skipped or failed');
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (abortSignal) {
      if (abortSignal.aborted) {
        return reject(new DOMException('Upload aborted', 'AbortError'));
      }
      abortSignal.addEventListener('abort', () => {
        xhr.abort();
        reject(new DOMException('Upload aborted', 'AbortError'));
      });
    }

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(Math.min(percent, 99)); // Keep 99 until server responds
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.code === 1000 && res.result) {
            if (onProgress) onProgress(100);
            resolve(res.result as AttachmentUploadResult);
          } else {
            reject(new Error(res.message || 'Tải tệp lên thất bại'));
          }
        } catch {
          reject(new Error('Phản hồi từ máy chủ không hợp lệ'));
        }
      } else {
        try {
          const res = JSON.parse(xhr.responseText);
          reject(new Error(res.message || `Lỗi tải lên (${xhr.status})`));
        } catch {
          reject(new Error(`Lỗi tải lên (${xhr.status})`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Lỗi kết nối khi tải tệp'));
    });

    xhr.addEventListener('abort', () => {
      reject(new DOMException('Upload aborted', 'AbortError'));
    });

    const formData = new FormData();
    formData.append('file', file);

    xhr.open('POST', '/file/media/upload?purpose=POST_ATTACHMENT', true);
    if (keycloak.token) {
      xhr.setRequestHeader('Authorization', `Bearer ${keycloak.token}`);
    }
    // Do NOT set Content-Type header manually; browser will set boundary for multipart
    xhr.send(formData);
  });
}

export async function deleteTemporaryAttachment(fileId: string): Promise<void> {
  try {
    await keycloak.updateToken(30);
  } catch {
    // continue with current token
  }

  try {
    await fetch(`/file/media/${encodeURIComponent(fileId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: keycloak.token ? `Bearer ${keycloak.token}` : '',
      },
    });
  } catch (err) {
    console.warn(`Failed to delete temporary attachment ${fileId}:`, err);
  }
}

export function toPostFile(result: AttachmentUploadResult): PostFile {
  return {
    fileId: result.fileId,
    url: `/file/media/download/${result.fileId}`,
    originalName: result.originalName,
    contentType: result.contentType,
    size: result.size,
  };
}

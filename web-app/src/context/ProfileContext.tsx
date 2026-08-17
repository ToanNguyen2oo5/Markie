import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import keycloak from '../keycloak';

export interface ProfileData {
  profileId: string;
  userId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  dob: string | null;
  address: string | null;
  avatar: string | null;
}

interface ProfileContextValue {
  profile: ProfileData | null;
  loading: boolean;
  avatarUrl: string;
  fullName: string;
  isAvatarUpdating: boolean;
  refreshProfile: () => Promise<void>;
  updateProfile: (updated: ProfileData) => void;
  uploadAvatar: (file: File) => Promise<{ success: boolean; message?: string }>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

function getFallbackAvatar(userId?: string): string {
  const seed = userId
    ? userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 70 + 1
    : 11;
  return `https://i.pravatar.cc/150?img=${seed}`;
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { authenticated } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAvatarUpdating, setIsAvatarUpdating] = useState(false);

  const pollingTimeoutRef = useRef<number | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);

    try {
      await keycloak.updateToken(30);
    } catch {
      /* ignore */
    }

    try {
      const res = await fetch('/profile/users/my-profile', {
        headers: { Authorization: `Bearer ${keycloak.token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.code === 1000) {
        setProfile(data.result as ProfileData);
      }
    } catch {
      // silent fail — pages can handle their own errors
    } finally {
      setLoading(false);
    }
  }, [authenticated]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, []);

  // Pessimistic UI: Giữ nguyên avatar cũ và bật loading, chỉ cập nhật avatar SAU KHI server xác nhận thành công
  const uploadAvatar = useCallback(
    async (file: File): Promise<{ success: boolean; message?: string }> => {
      // 1. Client validation
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        const msg = 'Ảnh đại diện không được vượt quá 5MB.';
        toast.error(msg, 'Kích thước không hợp lệ');
        return { success: false, message: msg };
      }
      if (!file.type.startsWith('image/')) {
        const msg = 'Vui lòng chọn tệp định dạng hình ảnh.';
        toast.error(msg, 'Định dạng không hợp lệ');
        return { success: false, message: msg };
      }

      // 2. Pessimistic UI: Bật trạng thái đang tải lên, KHÔNG đổi ảnh trước
      setIsAvatarUpdating(true);
      const previousAvatar = profile?.avatar;

      try {
        await keycloak.updateToken(30);
      } catch {
        /* ignore */
      }

      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/profile/users/avatar', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${keycloak.token}`,
          },
          body: formData,
        });

        const data = await res.json();

        if (!res.ok || data.code !== 1000) {
          throw new Error(data.message ?? 'Cập nhật avatar thất bại.');
        }

        // 3. Backend Saga đang xử lý. Polling /my-profile để chờ URL avatar mới từ server
        let attempts = 0;
        const maxAttempts = 12; // 12 * 1.5s = 18s max polling
        const pollInterval = 1500;

        const pollForUpdatedAvatar = async () => {
          attempts++;
          try {
            const checkRes = await fetch('/profile/users/my-profile', {
              headers: { Authorization: `Bearer ${keycloak.token}` },
            });
            if (checkRes.ok) {
              const checkData = await checkRes.json();
              if (checkData.code === 1000) {
                const currentProfile = checkData.result as ProfileData;

                // Khi server đã có avatar mới khác avatar ban đầu
                if (
                  currentProfile.avatar &&
                  currentProfile.avatar !== previousAvatar
                ) {
                  // Cập nhật avatar chính thức sau khi server xác nhận thành công (Pessimistic UI)
                  setProfile(currentProfile);
                  setIsAvatarUpdating(false);
                  toast.success(
                    'Ảnh đại diện của bạn đã được cập nhật thành công!',
                    'Hoàn tất'
                  );
                  return;
                }
              }
            }
          } catch {
            /* ignore polling network error */
          }

          if (attempts < maxAttempts) {
            pollingTimeoutRef.current = window.setTimeout(
              pollForUpdatedAvatar,
              pollInterval
            );
          } else {
            // Hết thời gian chờ: lấy dữ liệu mới nhất
            setIsAvatarUpdating(false);
            fetchProfile();
            toast.info(
              'Ảnh đại diện đã được gửi và đang được hệ thống xử lý.',
              'Đang xử lý'
            );
          }
        };

        // Bắt đầu poll sau 1.2s
        pollingTimeoutRef.current = window.setTimeout(pollForUpdatedAvatar, 1200);

        return { success: true };
      } catch (err: unknown) {
        setIsAvatarUpdating(false);
        const errorMsg =
          err instanceof Error
            ? err.message
            : 'Không thể kết nối đến máy chủ để cập nhật ảnh.';
        toast.error(errorMsg, 'Cập nhật thất bại');
        return { success: false, message: errorMsg };
      }
    },
    [profile?.avatar, toast, fetchProfile]
  );

  const avatarUrl = profile?.avatar
    ? profile.avatar
    : getFallbackAvatar(profile?.userId);

  const fullName = profile
    ? `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() || profile.username
    : '';

  const updateProfile = (updated: ProfileData) => {
    setProfile(updated);
  };

  return (
    <ProfileContext.Provider
      value={{
        profile,
        loading,
        avatarUrl,
        fullName,
        isAvatarUpdating,
        refreshProfile: fetchProfile,
        updateProfile,
        uploadAvatar,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used inside ProfileProvider');
  return ctx;
}

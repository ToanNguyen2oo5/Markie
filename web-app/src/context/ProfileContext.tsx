import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
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
  refreshProfile: () => Promise<void>;
  updateProfile: (updated: ProfileData) => void;
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
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);

    try {
      await keycloak.updateToken(30);
    } catch { /* ignore */ }

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
      value={{ profile, loading, avatarUrl, fullName, refreshProfile: fetchProfile, updateProfile }}
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

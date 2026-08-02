import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import keycloak from '../keycloak';
import { Spinner } from '@phosphor-icons/react';

interface AuthContextValue {
  authenticated: boolean;
  token: string | undefined;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    keycloak
      .init({ onLoad: 'check-sso', checkLoginIframe: false })
      .then((auth) => {
        setAuthenticated(auth);
        setReady(true);
      })
      .catch(() => {
        setReady(true);
      });
  }, []);

  const logout = () => keycloak.logout({ redirectUri: window.location.origin });

  if (!ready) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Spinner className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ authenticated, token: keycloak.token, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

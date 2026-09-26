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

  const logout = async () => {
    const redirectUri = window.location.origin;
    try {
      // OIDC logout in Keycloak:
      // If idToken is expired or rejected, keycloak-js sending it as id_token_hint causes
      // Keycloak error: "Invalid parameter: id_token_hint".
      // Clearing idToken ensures Keycloak relies on client_id and post_logout_redirect_uri.
      keycloak.idToken = undefined;
      keycloak.idTokenParsed = undefined;
      await keycloak.logout({ redirectUri });
    } catch {
      // Fallback: direct navigation to Keycloak logout endpoint with client_id & post_logout_redirect_uri
      const baseUrl = (keycloak.authServerUrl || 'http://localhost:8280').replace(/\/$/, '');
      const realm = keycloak.realm || 'markie';
      const clientId = keycloak.clientId || 'markie_webapp';
      const logoutUrl = `${baseUrl}/realms/${realm}/protocol/openid-connect/logout?client_id=${clientId}&post_logout_redirect_uri=${encodeURIComponent(redirectUri)}`;
      window.location.href = logoutUrl;
    }
  };

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

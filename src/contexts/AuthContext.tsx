import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

export interface Brand {
  name: string | null;
  logoUrl: string | null;
  primaryColor: string;
  bgColor: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'meta_partner' | 'partner' | 'tenant';
  tenantSlug: string;
  brand: Brand;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>(null!);

const TOKEN_KEY = 'sm-auth-token';
const USER_KEY = 'sm-auth-user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const userJson = localStorage.getItem(USER_KEY);
    if (token && userJson) {
      try {
        return { token, user: JSON.parse(userJson), loading: false };
      } catch { /* fall through */ }
    }
    return { token: null, user: null, loading: false };
  });

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(body.error || 'Login failed');
    }
    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setState({ token: data.token, user: data.user, loading: false });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setState({ token: null, user: null, loading: false });
  }, []);

  // Apply brand colors as CSS custom properties
  useEffect(() => {
    if (state.user?.brand) {
      document.documentElement.style.setProperty('--brand-primary', state.user.brand.primaryColor);
      document.documentElement.style.setProperty('--brand-bg', state.user.brand.bgColor);
    }
  }, [state.user?.brand]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

/** Fetch helper that auto-attaches Bearer token */
export function useAuthFetch() {
  const { token, logout } = useAuth();
  return useCallback(async (url: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const res = await fetch(url, { ...init, headers });
    if (res.status === 401) logout();
    return res;
  }, [token, logout]);
}

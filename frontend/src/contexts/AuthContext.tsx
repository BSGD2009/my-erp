import { createContext, useContext, useState, ReactNode } from 'react';
import type { AuthUser } from '../types/auth';

// ── Types ────────────────────────────────────────────────────────────────────
interface AuthContextValue {
  user:            AuthUser | null;
  token:           string   | null;
  isAuthenticated: boolean;
  login:           (token: string, user: AuthUser) => void;
  logout:          () => void;
}

// ── Storage keys ─────────────────────────────────────────────────────────────
const TOKEN_KEY = 'boxerp_token';
const USER_KEY  = 'boxerp_user';

// ── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialise from localStorage so the user stays logged in across page refreshes.
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY),
  );
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  });

  function login(newToken: string, newUser: AuthUser) {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated: !!token && !!user, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

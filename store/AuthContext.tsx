import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { User } from '../types/auth';
import { restoreSession, persistSession, clearSession } from '../services/session';

type AuthContextValue = {
  user: User | null;
  isLoggedIn: boolean;
  isRestoring: boolean;
  login: (user: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    restoreSession()
      .then((restored) => {
        if (restored) setUser(restored);
      })
      .finally(() => setIsRestoring(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoggedIn: !!user,
      isRestoring,
      login: (nextUser: User) => {
        setUser(nextUser);
        persistSession(nextUser.phone);
      },
      logout: () => {
        setUser(null);
        clearSession();
      },
    }),
    [user, isRestoring]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

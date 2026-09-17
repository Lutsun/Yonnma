import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';

// État d'accès à la console.
//   checking   : on vérifie la session au chargement
//   signed-out : personne n'est connecté
//   not-admin  : compte valide, mais absent de la table `admins`
//   admin      : accès accordé
export type AccessState = 'checking' | 'signed-out' | 'not-admin' | 'admin';

type AuthValue = {
  access: AccessState;
  email: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [access, setAccess] = useState<AccessState>('checking');
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    // Être connecté ne suffit pas : c'est `is_admin()` côté base qui décide,
    // et c'est elle aussi qui autorise réellement les écritures.
    async function evaluate(session: Session | null) {
      if (!session) {
        setEmail(null);
        setAccess('signed-out');
        return;
      }
      setEmail(session.user.email ?? null);
      const { data, error } = await supabase.rpc('is_admin');
      setAccess(!error && data === true ? 'admin' : 'not-admin');
    }

    supabase.auth.getSession().then(({ data }) => evaluate(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      evaluate(session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      access,
      email,
      signIn: async (mail, password) => {
        const { error } = await supabase.auth.signInWithPassword({
          email: mail.trim(),
          password,
        });
        if (error) {
          throw new Error(
            error.message.toLowerCase().includes('invalid')
              ? 'E-mail ou mot de passe incorrect.'
              : error.message
          );
        }
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [access, email]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return ctx;
}

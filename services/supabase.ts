import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase non configuré : renseigne EXPO_PUBLIC_SUPABASE_URL et ' +
      'EXPO_PUBLIC_SUPABASE_ANON_KEY dans un fichier .env (voir .env.example).'
  );
}

// Vraie authentification Supabase (téléphone + OTP) : la session (et son
// rafraîchissement automatique) est gérée par supabase-js lui-même, stockée
// via AsyncStorage — plus besoin de la persister à la main.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Supabase recommande de mettre en pause le rafraîchissement automatique du
// token quand l'app est en arrière-plan, pour ne pas consommer de requêtes
// inutiles, et de le relancer au retour au premier plan.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

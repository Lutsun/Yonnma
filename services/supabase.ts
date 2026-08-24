import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase non configuré : renseigne EXPO_PUBLIC_SUPABASE_URL et ' +
      'EXPO_PUBLIC_SUPABASE_ANON_KEY dans un fichier .env (voir .env.example).'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

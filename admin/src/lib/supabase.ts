import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Supabase non configuré : renseigne VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans admin/.env (voir .env.example).'
  );
}

// Clé publique uniquement. Les droits d'écriture de la console viennent des
// règles de supabase/admin.sql, pas d'une clé privilégiée.
export const supabase = createClient(url, anonKey);

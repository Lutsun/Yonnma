import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { toE164 } from '../utils/phone';

// Authentification par téléphone + code SMS, via le vrai système d'auth de
// Supabase (Authentication > Providers > Phone). En développement, on
// utilise les "Test Phone Numbers" de Supabase (numéros + code fixes,
// configurés dans le dashboard) pour ne pas dépendre d'un fournisseur SMS
// payant — voir supabase/schema.sql pour la marche à suivre.

export async function sendOtp(rawPhone: string): Promise<void> {
  const phone = toE164(rawPhone);
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) throw error;
}

export async function verifyOtp(
  rawPhone: string,
  code: string
): Promise<{ session: Session | null }> {
  const phone = toE164(rawPhone);
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token: code,
    type: 'sms',
  });
  if (error) throw error;
  return { session: data.session };
}

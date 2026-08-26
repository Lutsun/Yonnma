import { supabase } from './supabase';
import { User } from '../types/auth';

// Accès à la table `users` de Supabase — la persistance réelle des
// comptes Yonnma. Séparé de services/auth.ts, qui ne s'occupe que du
// mécanisme d'envoi/vérification du code SMS.

type UserRow = {
  id: string;
  phone: string;
  full_name: string;
  city: string | null;
  created_at: string;
};

function fromRow(row: UserRow): User {
  return {
    id: row.id,
    phone: row.phone,
    fullName: row.full_name,
    city: row.city ?? undefined,
    createdAt: row.created_at,
  };
}

export async function getUserByPhone(phone: string): Promise<User | undefined> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();

  if (error) throw error;
  return data ? fromRow(data) : undefined;
}

export async function createUser(
  phone: string,
  fullName: string,
  city?: string
): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .insert({ phone, full_name: fullName.trim(), city: city?.trim() || null })
    .select('*')
    .single();

  if (error) throw error;
  return fromRow(data);
}

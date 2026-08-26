import * as SecureStore from 'expo-secure-store';
import { getUserByPhone } from './users';
import { User } from '../types/auth';

// Garde l'utilisateur connecté d'une ouverture d'app à l'autre, et se
// souvient de son numéro même après une déconnexion volontaire (pour ne
// pas avoir à le retaper).

const SESSION_KEY = 'yonnma_session_phone';
const LAST_PHONE_KEY = 'yonnma_last_phone';

export async function restoreSession(): Promise<User | undefined> {
  const phone = await SecureStore.getItemAsync(SESSION_KEY);
  if (!phone) return undefined;
  try {
    return await getUserByPhone(phone);
  } catch {
    return undefined;
  }
}

export async function persistSession(phone: string): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, phone);
  await SecureStore.setItemAsync(LAST_PHONE_KEY, phone);
}

// Efface la session active mais garde le numéro en mémoire, pour que
// l'écran de connexion puisse le pré-remplir la prochaine fois.
export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export async function getLastPhone(): Promise<string | undefined> {
  const phone = await SecureStore.getItemAsync(LAST_PHONE_KEY);
  return phone ?? undefined;
}

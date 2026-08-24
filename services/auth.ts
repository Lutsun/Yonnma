import { User } from '../types/auth';
import { toE164 } from '../utils/phone';

// Service d'authentification par téléphone + code SMS (OTP).
//
// Implémentation actuelle : simulation en mémoire, sans coût et sans
// fournisseur externe — pratique pour développer et démontrer le parcours
// complet sans compte SMS payant. Les codes et les comptes créés ici sont
// perdus au redémarrage de l'app (pas de vraie base de données).
//
// Pour passer en production : remplacer le contenu de sendOtp/verifyOtp
// par un vrai fournisseur (ex: Firebase Phone Auth, ou un agrégateur SMS
// local) en gardant les mêmes signatures — aucun écran n'a besoin de changer.

const OTP_LENGTH = 6;
const OTP_TTL_MS = 5 * 60 * 1000;

type PendingOtp = { code: string; expiresAt: number };

const pendingOtps = new Map<string, PendingOtp>();
const users = new Map<string, User>(); // clé = numéro au format E.164

function generateCode(): string {
  return Math.floor(Math.random() * 10 ** OTP_LENGTH)
    .toString()
    .padStart(OTP_LENGTH, '0');
}

export async function sendOtp(rawPhone: string): Promise<{ devCode?: string }> {
  const phone = toE164(rawPhone);
  const code = generateCode();
  pendingOtps.set(phone, { code, expiresAt: Date.now() + OTP_TTL_MS });

  // TODO(prod): envoyer `code` par SMS via le fournisseur choisi.
  console.log(`[Yonnma][SMS simulé] Code pour ${phone} : ${code}`);

  return { devCode: __DEV__ ? code : undefined };
}

export async function verifyOtp(
  rawPhone: string,
  code: string
): Promise<{ success: boolean; isNewUser: boolean; user?: User }> {
  const phone = toE164(rawPhone);
  const pending = pendingOtps.get(phone);

  if (!pending || pending.expiresAt < Date.now() || pending.code !== code) {
    return { success: false, isNewUser: false };
  }

  pendingOtps.delete(phone);
  const existing = users.get(phone);
  return { success: true, isNewUser: !existing, user: existing };
}

export async function completeProfile(
  rawPhone: string,
  fullName: string,
  city?: string
): Promise<User> {
  const phone = toE164(rawPhone);
  const user: User = {
    id: phone,
    phone,
    fullName: fullName.trim(),
    city: city?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
  users.set(phone, user);
  return user;
}

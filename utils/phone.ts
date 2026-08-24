// Numéros mobiles sénégalais : 9 chiffres, préfixes Orange/Free/Expresso
// (70, 75, 76, 77, 78). On travaille en local (sans +221) dans les écrans,
// et on ajoute l'indicatif seulement au moment de contacter le service.

const SN_PHONE_REGEX = /^7[05678][0-9]{7}$/;

export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '').replace(/^221/, '');
}

export function isValidSenegalPhone(raw: string): boolean {
  return SN_PHONE_REGEX.test(normalizePhone(raw));
}

export function formatPhoneDisplay(raw: string): string {
  const digits = normalizePhone(raw);
  return digits.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}

export function toE164(raw: string): string {
  return `+221${normalizePhone(raw)}`;
}

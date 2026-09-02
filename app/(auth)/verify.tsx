import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import OtpInput from '../../components/auth/OtpInput';
import PrimaryButton from '../../components/ui/PrimaryButton';
import { Fonts, Radii, Spacing, Palette } from '../../constants/theme';
import { useColors } from '../../store/ThemeContext';
import { sendOtp, verifyOtp } from '../../services/auth';
import { getProfile } from '../../services/profile';
import { formatPhoneDisplay, toE164 } from '../../utils/phone';

const RESEND_COOLDOWN = 30;
const CODE_LENGTH = 6;

export default function VerifyScreen() {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);

  // Le code a déjà été envoyé par l'écran de connexion juste avant
  // d'arriver ici — on ne le renvoie pas une deuxième fois au montage
  // (Supabase limite le débit d'envoi d'OTP par numéro).

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleVerify = async (value: string) => {
    setError(undefined);
    setLoading(true);
    try {
      const { session } = await verifyOtp(phone, value);
      if (!session?.user) {
        setError('Code incorrect ou expiré');
        return;
      }
      const profile = await getProfile(session.user.id, session.user.phone ?? toE164(phone));
      if (profile) {
        router.replace('/(tabs)');
      } else {
        router.replace({ pathname: '/(auth)/complete-profile', params: { phone } });
      }
    } catch {
      setError('Code incorrect ou expiré');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (value: string) => {
    setCode(value);
    if (error) setError(undefined);
    if (value.length === CODE_LENGTH) handleVerify(value);
  };

  const handleResend = async () => {
    setCode('');
    setError(undefined);
    setCooldown(RESEND_COOLDOWN);
    try {
      await sendOtp(phone);
    } catch {
      setError("Impossible d'envoyer le code. Vérifie ta connexion.");
    }
  };

  const cooldownLabel = `00:${cooldown.toString().padStart(2, '0')}`;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.back}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="chevron-back" size={20} color={c.ink} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Vérification</Text>
        <Text style={styles.subtitle}>
          Entrez le code à {CODE_LENGTH} chiffres envoyé au{' '}
          <Text style={styles.phone}>+221 {formatPhoneDisplay(phone ?? '')}</Text>
        </Text>

        {__DEV__ && (
          <Text style={styles.devHint}>
            Astuce dev : utilise un numéro de test configuré dans Supabase
            (Authentication → Providers → Phone) avec son code fixe.
          </Text>
        )}

        <View style={{ height: Spacing.xl }} />

        <OtpInput length={CODE_LENGTH} value={code} onChange={handleChange} error={error} />

        <View style={{ height: Spacing.xl }} />

        <PrimaryButton
          label="Vérifier"
          onPress={() => handleVerify(code)}
          loading={loading}
          disabled={code.length < CODE_LENGTH}
        />

        <TouchableOpacity
          style={styles.resend}
          disabled={cooldown > 0}
          onPress={handleResend}
          accessibilityRole="button"
        >
          <Text style={styles.resendText}>
            Vous n'avez rien reçu ?{' '}
            {cooldown > 0 ? (
              <Text style={styles.resendMuted}>Renvoyer dans {cooldownLabel}</Text>
            ) : (
              <Text style={styles.resendLink}>Renvoyer</Text>
            )}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.canvas },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  back: {
    width: 40,
    height: 40,
    borderRadius: Radii.pill,
    backgroundColor: c.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  title: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: c.ink,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: c.inkMuted,
    marginTop: 6,
    lineHeight: 20,
  },
  phone: {
    fontFamily: Fonts.bodySemi,
    color: c.ink,
  },
  devHint: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    color: c.yonn,
    marginTop: Spacing.sm,
  },
  resend: { alignSelf: 'center', marginTop: Spacing.lg, padding: Spacing.xs },
  resendText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: c.ink,
  },
  resendMuted: {
    fontFamily: Fonts.bodyMedium,
    color: c.inkMuted,
  },
  resendLink: {
    fontFamily: Fonts.bodySemi,
    color: c.yonn,
  },
});

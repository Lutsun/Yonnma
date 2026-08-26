import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import OtpInput from '../../components/auth/OtpInput';
import PrimaryButton from '../../components/ui/PrimaryButton';
import { Colors, Fonts, Radii, Spacing } from '../../constants/theme';
import { sendOtp, verifyOtp } from '../../services/auth';
import { useAuth } from '../../store/AuthContext';
import { formatPhoneDisplay } from '../../utils/phone';

const RESEND_COOLDOWN = 30;
const CODE_LENGTH = 6;

export default function VerifyScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const [devHint, setDevHint] = useState<string | undefined>();

  useEffect(() => {
    sendOtp(phone).then(({ devCode }) => setDevHint(devCode));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleVerify = async (value: string) => {
    setError(undefined);
    setLoading(true);
    try {
      const result = await verifyOtp(phone, value);
      if (!result.success) {
        setError('Code incorrect ou expiré');
        return;
      }
      if (result.isNewUser) {
        router.replace({ pathname: '/(auth)/complete-profile', params: { phone } });
      } else {
        login(result.user!);
        router.replace('/(tabs)');
      }
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
    const { devCode } = await sendOtp(phone);
    setDevHint(devCode);
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
          <Ionicons name="chevron-back" size={20} color={Colors.ma} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Vérification</Text>
        <Text style={styles.subtitle}>
          Entrez le code à {CODE_LENGTH} chiffres envoyé au{' '}
          <Text style={styles.phone}>+221 {formatPhoneDisplay(phone ?? '')}</Text>
        </Text>

        {!!devHint && (
          <Text style={styles.devHint}>Mode démo — code : {devHint}</Text>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  back: {
    width: 40,
    height: 40,
    borderRadius: Radii.pill,
    backgroundColor: Colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  title: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.ma,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.stone,
    marginTop: 6,
    lineHeight: 20,
  },
  phone: {
    fontFamily: Fonts.bodySemi,
    color: Colors.ma,
  },
  devHint: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    color: Colors.yonn,
    marginTop: Spacing.sm,
  },
  resend: { alignSelf: 'center', marginTop: Spacing.lg, padding: Spacing.xs },
  resendText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.ma,
  },
  resendMuted: {
    fontFamily: Fonts.bodyMedium,
    color: Colors.stone,
  },
  resendLink: {
    fontFamily: Fonts.bodySemi,
    color: Colors.yonn,
  },
});

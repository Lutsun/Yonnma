import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import Wordmark from '../../components/brand/Wordmark';
import PrimaryButton from '../../components/ui/PrimaryButton';
import { Fonts, Radii, Spacing, Palette } from '../../constants/theme';
import { useColors } from '../../store/ThemeContext';
import { isValidSenegalPhone } from '../../utils/phone';
import { sendOtp } from '../../services/auth';

export default function LoginScreen() {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!isValidSenegalPhone(phone)) {
      setError('Numéro invalide (ex : 77 123 45 67)');
      return;
    }
    setError(undefined);
    setLoading(true);
    try {
      await sendOtp(phone);
      router.push({ pathname: '/(auth)/verify', params: { phone } });
    } catch {
      setError("Impossible d'envoyer le code. Vérifie ta connexion et réessaie.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View>
            <Wordmark size={30} />

            <View style={{ height: Spacing.xxl }} />

            <Text style={styles.title}>Entrez votre numéro</Text>
            <Text style={styles.subtitle}>
              Nous vous enverrons un code de vérification par SMS.
            </Text>

            <View style={{ height: Spacing.lg }} />

            <View style={styles.phoneRow}>
              <View style={styles.code}>
                <Text style={styles.codeText}>🇸🇳 +221</Text>
              </View>
              <View style={[styles.field, !!error && styles.fieldError]}>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="77 123 45 67"
                  placeholderTextColor={c.inkMuted}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={(t) => {
                    setPhone(t);
                    if (error) setError(undefined);
                  }}
                  returnKeyType="done"
                  onSubmitEditing={handleContinue}
                  autoFocus
                />
              </View>
            </View>
            {!!error && <Text style={styles.error}>{error}</Text>}
          </View>

          <View>
            <PrimaryButton
              label="Recevoir le code"
              onPress={handleContinue}
              loading={loading}
            />

            <Text style={styles.consent}>
              En continuant, vous acceptez les{' '}
              <Text style={styles.link}>Conditions d'utilisation</Text> et la{' '}
              <Text style={styles.link}>Politique de confidentialité</Text> de Yonnma.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.canvas },
  scroll: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
  },
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
  },
  phoneRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  code: {
    height: 56,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: c.line,
    backgroundColor: c.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 15,
    color: c.ink,
  },
  field: {
    flex: 1,
    height: 56,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: c.line,
    backgroundColor: c.fill,
    justifyContent: 'center',
  },
  fieldError: { borderColor: c.danger },
  fieldInput: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: c.ink,
    padding: 0,
  },
  error: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: c.danger,
    marginTop: 6,
  },
  consent: {
    fontFamily: Fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: c.inkMuted,
    marginTop: Spacing.md,
  },
  link: {
    fontFamily: Fonts.bodyMedium,
    color: c.yonn,
  },
});

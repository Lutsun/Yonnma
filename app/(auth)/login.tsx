import React, { useEffect, useState } from 'react';
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
import { Colors, Fonts, Radii, Spacing } from '../../constants/theme';
import { isValidSenegalPhone, normalizePhone } from '../../utils/phone';
import { sendOtp } from '../../services/auth';
import { getLastPhone } from '../../services/session';

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [isReturning, setIsReturning] = useState(false);

  useEffect(() => {
    getLastPhone().then((lastPhone) => {
      if (lastPhone) {
        setPhone(normalizePhone(lastPhone));
        setIsReturning(true);
      }
    });
  }, []);

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

            <Text style={styles.title}>
              {isReturning ? 'Content de te revoir 👋' : 'Entrez votre numéro'}
            </Text>
            <Text style={styles.subtitle}>
              {isReturning
                ? 'Confirme ton numéro pour recevoir un nouveau code.'
                : 'Nous vous enverrons un code de vérification par SMS.'}
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
                  placeholderTextColor={Colors.stone}
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
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
    color: Colors.ma,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.stone,
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
    borderColor: Colors.stoneLight,
    backgroundColor: Colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 15,
    color: Colors.ma,
  },
  field: {
    flex: 1,
    height: 56,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Colors.stoneLight,
    backgroundColor: Colors.fill,
    justifyContent: 'center',
  },
  fieldError: { borderColor: Colors.danger },
  fieldInput: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.ma,
    padding: 0,
  },
  error: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.danger,
    marginTop: 6,
  },
  consent: {
    fontFamily: Fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.stone,
    marginTop: Spacing.md,
  },
  link: {
    fontFamily: Fonts.bodyMedium,
    color: Colors.yonn,
  },
});

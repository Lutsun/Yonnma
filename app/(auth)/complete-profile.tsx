import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import AuthTextInput from '../../components/ui/AuthTextInput';
import PrimaryButton from '../../components/ui/PrimaryButton';
import { Colors, Fonts, Spacing } from '../../constants/theme';
import { completeProfile } from '../../services/auth';
import { useAuth } from '../../store/AuthContext';

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export default function CompleteProfileScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [fullName, setFullName] = useState('');
  const [city, setCity] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const initials = initialsOf(fullName);

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      setError('Entre ton nom complet');
      return;
    }
    setError(undefined);
    setLoading(true);
    try {
      const user = await completeProfile(phone, fullName, city);
      login(user);
      router.replace('/(tabs)');
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
          <View style={{ height: Spacing.xl }} />

          <Text style={styles.title}>
            Bienvenue sur <Text style={styles.titleYonn}>Yonn</Text>ma
          </Text>
          <Text style={styles.subtitle}>Dites-nous comment vous appeler.</Text>

          <View style={styles.avatarWrap}>
            <View style={[styles.avatar, !!initials && styles.avatarFilled]}>
              {initials ? (
                <Text style={styles.avatarText}>{initials}</Text>
              ) : (
                <Ionicons name="person-outline" size={28} color={Colors.stone} />
              )}
            </View>
          </View>

          <View style={{ height: Spacing.lg }} />

          <AuthTextInput
            label="Prénom et nom"
            icon="person-outline"
            placeholder="Aïssatou Sow"
            autoCapitalize="words"
            value={fullName}
            onChangeText={(t) => {
              setFullName(t);
              if (error) setError(undefined);
            }}
            error={error}
            returnKeyType="next"
            autoFocus
          />

          <AuthTextInput
            label="Ville (optionnel)"
            icon="location-outline"
            placeholder="Dakar"
            autoCapitalize="words"
            value={city}
            onChangeText={setCity}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          <View style={{ height: Spacing.sm }} />

          <PrimaryButton
            label="Créer mon compte"
            onPress={handleSubmit}
            loading={loading}
            disabled={!fullName.trim()}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  title: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.ma,
  },
  titleYonn: {
    color: Colors.yonn,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.stone,
    marginTop: 6,
  },
  avatarWrap: {
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1.5,
    borderColor: Colors.stoneLight,
    borderStyle: 'dashed',
    backgroundColor: Colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFilled: {
    borderStyle: 'solid',
    borderColor: Colors.yonn,
    backgroundColor: Colors.yonnTint,
  },
  avatarText: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.yonn,
  },
});

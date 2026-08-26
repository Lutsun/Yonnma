import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import {
  Colors,
  Fonts,
  Spacing,
  TAB_BAR_HEIGHT,
  TAB_BAR_BOTTOM_MARGIN,
} from '../../constants/theme';
import { useAuth } from '../../store/AuthContext';
import { formatPhoneDisplay } from '../../utils/phone';
import { initialsOf } from '../../utils/text';
import { getSavedTrips } from '../../services/trips';
import { getFavoriteLineIds } from '../../services/favorites';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [tripCount, setTripCount] = useState<number | null>(null);
  const [lineCount, setLineCount] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([getSavedTrips(user.id), getFavoriteLineIds(user.id)])
      .then(([trips, lines]) => {
        setTripCount(trips.length);
        setLineCount(lines.length);
      })
      .catch(() => {
        setTripCount(0);
        setLineCount(0);
      });
  }, [user]);

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  if (!user) return null;

  const stats = [
    tripCount !== null && `${tripCount} trajet${tripCount === 1 ? '' : 's'}`,
    lineCount !== null && `${lineCount} ligne${lineCount === 1 ? '' : 's'} favorite${lineCount === 1 ? '' : 's'}`,
  ].filter(Boolean);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsOf(user.fullName)}</Text>
        </View>
        <Text style={styles.name}>{user.fullName}</Text>
        <Text style={styles.meta}>
          +221 {formatPhoneDisplay(user.phone)}
          {user.city ? ` · ${user.city}` : ''}
        </Text>
        {stats.length > 0 && <Text style={styles.stats}>{stats.join(' · ')}</Text>}
      </View>

      <View style={styles.spacer} />

      <TouchableOpacity onPress={handleLogout} accessibilityRole="button" style={styles.logout}>
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  content: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.yonnTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.yonn,
  },
  name: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.ma,
  },
  meta: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.stone,
    marginTop: 4,
  },
  stats: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    color: Colors.yonn,
    marginTop: Spacing.sm,
  },
  spacer: { flex: 1 },
  logout: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_MARGIN + Spacing.md,
  },
  logoutText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 15,
    color: Colors.danger,
  },
});

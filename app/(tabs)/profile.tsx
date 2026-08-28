import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  Colors,
  Fonts,
  Radii,
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

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  if (!user) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initialsOf(user.fullName)}</Text>
          </View>
          <Text style={styles.name}>{user.fullName}</Text>
          <Text style={styles.meta}>
            +221 {formatPhoneDisplay(user.phone)}
            {user.city ? ` · ${user.city}` : ''}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{tripCount ?? '—'}</Text>
            <Text style={styles.statLabel}>Trajets sauvegardés</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{lineCount ?? '—'}</Text>
            <Text style={styles.statLabel}>Lignes favorites</Text>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.6}
            onPress={() => router.push('/(tabs)/saved')}
          >
            <View style={styles.rowIcon}>
              <Ionicons name="bookmark-outline" size={18} color={Colors.yonn} />
            </View>
            <Text style={styles.rowText}>Mes favoris</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.stoneLight} />
          </TouchableOpacity>

          <View style={styles.rowSeparator} />

          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.6}
            onPress={() => router.push('/(tabs)/assistant')}
          >
            <View style={styles.rowIcon}>
              <Ionicons name="help-circle-outline" size={18} color={Colors.yonn} />
            </View>
            <Text style={styles.rowText}>Aide et assistance</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.stoneLight} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.row} activeOpacity={0.6} onPress={handleLogout}>
            <View style={[styles.rowIcon, styles.rowIconDanger]}>
              <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
            </View>
            <Text style={[styles.rowText, styles.rowTextDanger]}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_MARGIN + Spacing.xl,
  },
  header: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
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
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
    shadowColor: Colors.ma,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.stoneLight,
  },
  statValue: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: Colors.yonn,
  },
  statLabel: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.stone,
    marginTop: 2,
    textAlign: 'center',
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    shadowColor: Colors.ma,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    height: 56,
  },
  rowSeparator: {
    height: 1,
    backgroundColor: Colors.stoneLight,
    marginLeft: Spacing.md + 36 + Spacing.sm,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.pill,
    backgroundColor: Colors.yonnTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDanger: {
    backgroundColor: '#FBEAEA',
  },
  rowText: {
    flex: 1,
    fontFamily: Fonts.bodyMedium,
    fontSize: 15,
    color: Colors.ma,
  },
  rowTextDanger: {
    color: Colors.danger,
  },
});

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import EmptyState from '../../components/ui/EmptyState';
import {
  Colors,
  Fonts,
  Radii,
  Spacing,
  TAB_BAR_HEIGHT,
  TAB_BAR_BOTTOM_MARGIN,
} from '../../constants/theme';
import { useAuth } from '../../store/AuthContext';
import { getSavedTrips } from '../../services/trips';
import { getFavoriteLines, removeFavoriteLine, FavoriteLine } from '../../services/favorites';
import { Trip } from '../../types/transit';

export default function SavedScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [lines, setLines] = useState<FavoriteLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    Promise.all([getSavedTrips(user.id), getFavoriteLines(user.id)])
      .then(([tripsData, linesData]) => {
        if (cancelled) return;
        setTrips(tripsData);
        setLines(linesData);
      })
      .catch(() => {
        if (!cancelled) setErrored(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleUnfavorite = (lineId: string) => {
    if (!user) return;
    setLines((prev) => prev.filter((l) => l.id !== lineId));
    removeFavoriteLine(user.id, lineId).catch(() => {
      // Échec silencieux : au pire la ligne réapparaîtra à la prochaine visite.
    });
  };

  const isEmpty = trips.length === 0 && lines.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Text style={styles.title}>Sauvegardés</Text>
      <Text style={styles.subtitle}>Tes lignes et trajets favoris.</Text>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.yonn} />
        </View>
      ) : errored ? (
        <EmptyState
          icon="warning"
          title="Impossible de charger tes favoris"
          description="Vérifie ta connexion et réessaie dans un instant."
        />
      ) : isEmpty ? (
        <EmptyState
          icon="bookmark-outline"
          title="Rien d'enregistré pour l'instant"
          description="Mets une ligne en favori (★) ou enregistre un trajet depuis l'accueil pour les retrouver ici."
        />
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {lines.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Lignes favorites</Text>
              {lines.map((line) => (
                <TouchableOpacity
                  key={line.id}
                  style={styles.row}
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({
                      pathname: '/(modals)/bus-details',
                      params: {
                        lineId: line.id,
                        code: line.code,
                        name: line.name,
                        color: line.color || line.operator.color || '',
                      },
                    })
                  }
                >
                  <View
                    style={[
                      styles.lineBadge,
                      { backgroundColor: line.color || line.operator.color || Colors.yonn },
                    ]}
                  >
                    <Text style={styles.lineBadgeText}>{line.code}</Text>
                  </View>
                  <Text style={styles.rowText} numberOfLines={1}>
                    {line.name}
                  </Text>
                  <TouchableOpacity
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => handleUnfavorite(line.id)}
                    accessibilityRole="button"
                    accessibilityLabel="Retirer des favoris"
                  >
                    <Ionicons name="star" size={20} color={Colors.gold} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
              <View style={{ height: Spacing.md }} />
            </>
          )}

          {trips.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Trajets enregistrés</Text>
              {trips.map((trip) => (
                <View key={trip.id} style={styles.row}>
                  <View style={styles.tripIcon}>
                    <Ionicons name="bookmark" size={16} color={Colors.yonn} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowText} numberOfLines={1}>
                      {trip.originLabel}
                    </Text>
                    <Text style={styles.rowSubtext} numberOfLines={1}>
                      → {trip.destinationLabel}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  title: {
    fontFamily: Fonts.display,
    fontSize: 26,
    color: Colors.ma,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.stone,
    paddingHorizontal: Spacing.lg,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_MARGIN + Spacing.xl,
  },
  sectionTitle: {
    fontFamily: Fonts.bodySemi,
    fontSize: 13,
    color: Colors.stone,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
    shadowColor: Colors.ma,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  lineBadge: {
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  lineBadgeText: {
    fontFamily: Fonts.bodySemi,
    fontSize: 12,
    color: Colors.white,
  },
  tripIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.pill,
    backgroundColor: Colors.yonnTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    color: Colors.ma,
  },
  rowSubtext: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.stone,
    marginTop: 1,
  },
});

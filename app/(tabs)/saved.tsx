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
      <Text style={styles.title}>Favoris</Text>
      <Text style={styles.subtitle}>Tes lignes et trajets enregistrés.</Text>

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
          description="Mets une ligne en favori (★) depuis Trajets, ou enregistre un itinéraire pour le retrouver ici."
        />
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {lines.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Lignes favorites</Text>
                <Text style={styles.sectionCount}>{lines.length}</Text>
              </View>
              {lines.map((line) => {
                const color = line.color || line.operator.color || Colors.yonn;
                const [from, to] = line.name.split('↔').map((s) => s.trim());
                return (
                  <TouchableOpacity
                    key={line.id}
                    style={styles.card}
                    activeOpacity={0.7}
                    onPress={() =>
                      router.push({
                        pathname: '/(modals)/bus-details',
                        params: { lineId: line.id, code: line.code, name: line.name, color },
                      })
                    }
                  >
                    <View style={[styles.avatar, { backgroundColor: color }]}>
                      <Text style={styles.avatarText} numberOfLines={1}>
                        {line.code.replace('Ligne ', '')}
                      </Text>
                    </View>

                    <View style={styles.cardInfo}>
                      {from && to ? (
                        <View style={styles.routeRow}>
                          <Text style={styles.routeText} numberOfLines={1}>
                            {from}
                          </Text>
                          <Ionicons name="arrow-forward" size={12} color={Colors.stoneLight} />
                          <Text style={styles.routeText} numberOfLines={1}>
                            {to}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.routeText} numberOfLines={1}>
                          {line.name}
                        </Text>
                      )}
                      <Text style={styles.captionText}>{line.operator.name}</Text>
                    </View>

                    <TouchableOpacity
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => handleUnfavorite(line.id)}
                      accessibilityRole="button"
                      accessibilityLabel="Retirer des favoris"
                    >
                      <Ionicons name="star" size={20} color={Colors.gold} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
              <View style={{ height: Spacing.md }} />
            </>
          )}

          {trips.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Trajets enregistrés</Text>
                <Text style={styles.sectionCount}>{trips.length}</Text>
              </View>
              {trips.map((trip) => (
                <View key={trip.id} style={styles.card}>
                  <View style={[styles.avatar, styles.avatarTint]}>
                    <Ionicons name="git-branch" size={18} color={Colors.yonn} />
                  </View>
                  <View style={styles.cardInfo}>
                    <View style={styles.routeRow}>
                      <Text style={styles.routeText} numberOfLines={1}>
                        {trip.originLabel}
                      </Text>
                      <Ionicons name="arrow-forward" size={12} color={Colors.stoneLight} />
                      <Text style={styles.routeText} numberOfLines={1}>
                        {trip.destinationLabel}
                      </Text>
                    </View>
                    <Text style={styles.captionText}>Itinéraire enregistré</Text>
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    flex: 1,
    fontFamily: Fonts.bodySemi,
    fontSize: 13,
    color: Colors.stone,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    color: Colors.stoneLight,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    shadowColor: Colors.ma,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTint: {
    backgroundColor: Colors.yonnTint,
  },
  avatarText: {
    fontFamily: Fonts.bodySemi,
    fontSize: 13,
    color: Colors.white,
  },
  cardInfo: { flex: 1 },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeText: {
    flexShrink: 1,
    fontFamily: Fonts.bodySemi,
    fontSize: 14,
    color: Colors.ma,
  },
  captionText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.stone,
    marginTop: 2,
  },
});

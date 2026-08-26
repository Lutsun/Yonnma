import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, ActivityIndicator } from 'react-native';
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
import { getOperators, getLines } from '../../services/transit';
import { getFavoriteLineIds, addFavoriteLine, removeFavoriteLine } from '../../services/favorites';
import { useAuth } from '../../store/AuthContext';
import { Line, Operator } from '../../types/transit';

type Section = { title: string; color: string; data: Line[] };

export default function RoutesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getOperators(),
      getLines(),
      user ? getFavoriteLineIds(user.id) : Promise.resolve([]),
    ])
      .then(([operators, lines, favorites]) => {
        if (cancelled) return;
        const byOperator = new Map<string, Operator>(operators.map((op) => [op.id, op]));
        const grouped = new Map<string, Section>();

        for (const line of lines) {
          const operator = byOperator.get(line.operator_id);
          if (!operator) continue;
          const section = grouped.get(operator.id) ?? {
            title: operator.name,
            color: operator.color,
            data: [],
          };
          section.data.push(line);
          grouped.set(operator.id, section);
        }

        setSections(Array.from(grouped.values()));
        setFavoriteIds(new Set(favorites));
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

  const toggleFavorite = (lineId: string) => {
    if (!user) return;
    const isFavorite = favoriteIds.has(lineId);

    setFavoriteIds((prev) => {
      const next = new Set(prev);
      isFavorite ? next.delete(lineId) : next.add(lineId);
      return next;
    });

    const request = isFavorite
      ? removeFavoriteLine(user.id, lineId)
      : addFavoriteLine(user.id, lineId);

    request.catch(() => {
      // Échec : on annule le changement optimiste.
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        isFavorite ? next.add(lineId) : next.delete(lineId);
        return next;
      });
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Text style={styles.title}>Trajets</Text>
      <Text style={styles.subtitle}>Toutes les lignes disponibles à Dakar.</Text>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.yonn} />
        </View>
      ) : errored ? (
        <EmptyState
          icon="warning"
          title="Impossible de charger les lignes"
          description="Vérifie ta connexion et réessaie dans un instant."
        />
      ) : sections.length === 0 ? (
        <EmptyState
          icon="bus"
          title="Aucune ligne pour le moment"
          description="Les lignes de bus apparaîtront ici dès qu'elles seront ajoutées."
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: section.color }]} />
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.lineRow}
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: '/(modals)/bus-details',
                  params: {
                    lineId: item.id,
                    code: item.code,
                    name: item.name,
                    color: item.color || '',
                  },
                })
              }
            >
              <View style={[styles.lineBadge, { backgroundColor: item.color || Colors.yonn }]}>
                <Text style={styles.lineBadgeText}>{item.code}</Text>
              </View>
              <Text style={styles.lineName}>{item.name}</Text>
              <TouchableOpacity
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => toggleFavorite(item.id)}
                accessibilityRole="button"
                accessibilityLabel={
                  favoriteIds.has(item.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'
                }
              >
                <Ionicons
                  name={favoriteIds.has(item.id) ? 'star' : 'star-outline'}
                  size={20}
                  color={favoriteIds.has(item.id) ? Colors.gold : Colors.stone}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
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
    gap: Spacing.xs,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: {
    fontFamily: Fonts.bodySemi,
    fontSize: 13,
    color: Colors.stone,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lineRow: {
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
  lineName: {
    flex: 1,
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    color: Colors.ma,
  },
});

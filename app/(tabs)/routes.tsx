import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
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

type LineWithOperator = Line & { operator: Operator };

export default function RoutesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [operators, setOperators] = useState<Operator[]>([]);
  const [lines, setLines] = useState<LineWithOperator[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [query, setQuery] = useState('');
  const [filterOperatorId, setFilterOperatorId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getOperators(),
      getLines(),
      user ? getFavoriteLineIds(user.id) : Promise.resolve([]),
    ])
      .then(([operatorsData, linesData, favorites]) => {
        if (cancelled) return;
        const byOperator = new Map<string, Operator>(operatorsData.map((op) => [op.id, op]));
        const enriched = linesData
          .map((line) => {
            const operator = byOperator.get(line.operator_id);
            return operator ? { ...line, operator } : null;
          })
          .filter((l): l is LineWithOperator => l !== null);

        setOperators(operatorsData.filter((op) => enriched.some((l) => l.operator_id === op.id)));
        setLines(enriched);
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

  const filteredLines = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lines.filter((line) => {
      if (filterOperatorId && line.operator_id !== filterOperatorId) return false;
      if (!q) return true;
      return line.code.toLowerCase().includes(q) || line.name.toLowerCase().includes(q);
    });
  }, [lines, query, filterOperatorId]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Text style={styles.title}>Trajets</Text>
      <Text style={styles.subtitle}>
        {lines.length > 0 ? `${lines.length} lignes disponibles à Dakar` : 'Toutes les lignes disponibles à Dakar.'}
      </Text>

      {!loading && !errored && lines.length > 0 && (
        <>
          <View style={styles.searchRow}>
            <Ionicons name="search" size={18} color={Colors.stone} />
            <TextInput
              style={styles.searchInput}
              placeholder="Chercher une ligne (ex : 65, Ouakam...)"
              placeholderTextColor={Colors.stone}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} accessibilityRole="button">
                <Ionicons name="close-circle" size={18} color={Colors.stone} />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={operators}
            keyExtractor={(op) => op.id}
            style={styles.chipsRow}
            contentContainerStyle={styles.chipsContent}
            ListHeaderComponent={
              <TouchableOpacity
                style={[styles.chip, filterOperatorId === null && styles.chipActive]}
                onPress={() => setFilterOperatorId(null)}
              >
                <Text style={[styles.chipText, filterOperatorId === null && styles.chipTextActive]}>
                  Tous
                </Text>
              </TouchableOpacity>
            }
            renderItem={({ item }) => {
              const active = filterOperatorId === item.id;
              return (
                <TouchableOpacity
                  style={[styles.chip, active && { backgroundColor: item.color }]}
                  onPress={() => setFilterOperatorId(active ? null : item.id)}
                >
                  <View style={[styles.chipDot, { backgroundColor: active ? Colors.white : item.color }]} />
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.short_name}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </>
      )}

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
      ) : lines.length === 0 ? (
        <EmptyState
          icon="bus"
          title="Aucune ligne pour le moment"
          description="Les lignes de bus apparaîtront ici dès qu'elles seront ajoutées."
        />
      ) : filteredLines.length === 0 ? (
        <EmptyState
          icon="search"
          title="Aucun résultat"
          description={query ? `Aucune ligne ne correspond à "${query}".` : 'Aucune ligne pour cet opérateur.'}
        />
      ) : (
        <FlatList
          data={filteredLines}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const color = item.color || item.operator.color;
            const [from, to] = item.name.split('↔').map((s) => s.trim());
            return (
              <TouchableOpacity
                style={styles.lineCard}
                activeOpacity={0.7}
                onPress={() =>
                  router.push({
                    pathname: '/(modals)/bus-details',
                    params: { lineId: item.id, code: item.code, name: item.name, color },
                  })
                }
              >
                <View style={[styles.lineAvatar, { backgroundColor: color }]}>
                  <Text style={styles.lineAvatarText} numberOfLines={1}>
                    {item.code.replace('Ligne ', '')}
                  </Text>
                </View>

                <View style={styles.lineInfo}>
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
                      {item.name}
                    </Text>
                  )}
                  <Text style={styles.operatorText}>{item.operator.name}</Text>
                </View>

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
                    color={favoriteIds.has(item.id) ? Colors.gold : Colors.stoneLight}
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.fill,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.md,
    height: 46,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.ma,
  },
  chipsRow: {
    flexGrow: 0,
    height: 42,
    marginBottom: Spacing.sm,
  },
  chipsContent: {
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.fill,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.md,
    height: 34,
    marginRight: Spacing.xs,
  },
  chipActive: {
    backgroundColor: Colors.ma,
  },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipText: {
    fontFamily: Fonts.bodySemi,
    fontSize: 12,
    color: Colors.ma,
  },
  chipTextActive: {
    color: Colors.white,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_MARGIN + Spacing.xl,
  },
  lineCard: {
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
  lineAvatar: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineAvatarText: {
    fontFamily: Fonts.bodySemi,
    fontSize: 13,
    color: Colors.white,
  },
  lineInfo: { flex: 1 },
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
  operatorText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.stone,
    marginTop: 2,
  },
});

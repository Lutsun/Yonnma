import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import EmptyState from '../../components/ui/EmptyState';
import { Colors, Fonts, Radii, Spacing } from '../../constants/theme';
import { getLineStops } from '../../services/transit';
import { Stop } from '../../types/transit';

export default function BusDetailsModal() {
  const router = useRouter();
  const { lineId, code, name, color } = useLocalSearchParams<{
    lineId: string;
    code: string;
    name: string;
    color?: string;
  }>();

  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const lineColor = color || Colors.yonn;

  useEffect(() => {
    let cancelled = false;
    getLineStops(lineId)
      .then((data) => {
        if (!cancelled) setStops(data);
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
  }, [lineId]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: lineColor }]}>
          <Text style={styles.badgeText}>{code}</Text>
        </View>
        <Text style={styles.name}>{name}</Text>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Fermer"
        >
          <Ionicons name="close" size={22} color={Colors.ma} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.yonn} />
        </View>
      ) : errored ? (
        <EmptyState
          icon="warning"
          title="Impossible de charger cette ligne"
          description="Vérifie ta connexion et réessaie dans un instant."
        />
      ) : stops.length === 0 ? (
        <EmptyState
          icon="bus"
          title="Aucun arrêt renseigné"
          description="Le tracé de cette ligne n'a pas encore été ajouté."
        />
      ) : (
        <FlatList
          data={stops}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <View style={styles.stopRow}>
              <View style={styles.stopMarkerColumn}>
                <View style={[styles.stopDot, { borderColor: lineColor }]} />
                {index < stops.length - 1 && (
                  <View style={[styles.stopLine, { backgroundColor: lineColor }]} />
                )}
              </View>
              <Text style={styles.stopName}>{item.name}</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  badgeText: {
    fontFamily: Fonts.bodySemi,
    fontSize: 13,
    color: Colors.white,
  },
  name: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.ma,
    paddingRight: Spacing.xxl,
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.lg,
    width: 36,
    height: 36,
    borderRadius: Radii.pill,
    backgroundColor: Colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  stopRow: { flexDirection: 'row' },
  stopMarkerColumn: { width: 20, alignItems: 'center' },
  stopDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 3,
    backgroundColor: Colors.white,
  },
  stopLine: {
    width: 2,
    flex: 1,
    minHeight: 28,
    opacity: 0.35,
  },
  stopName: {
    flex: 1,
    fontFamily: Fonts.bodyMedium,
    fontSize: 15,
    color: Colors.ma,
    paddingBottom: Spacing.lg,
    paddingLeft: Spacing.sm,
  },
});

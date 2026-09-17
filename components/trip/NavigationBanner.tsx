import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Fonts, Radii, Spacing, Palette, makeElevation } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';
import { NavigationState } from '../../services/navigation';

// La consigne du moment, en haut de la carte : ce que l'utilisateur doit
// faire maintenant, et dans combien de mètres. C'est le seul élément qu'il
// doit pouvoir lire d'un coup d'œil, bus en marche.
export default function NavigationBanner({ nav }: { nav: NavigationState }) {
  const { colors: c, isDark } = useTheme();
  const styles = useMemo(() => createStyles(c, isDark), [c, isDark]);

  const { instruction, arrived, offRoute, weakSignal, progress } = nav;
  const accent = instruction.lineColor ?? (arrived ? c.yonn : c.ink);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={[styles.badge, { backgroundColor: accent }]}>
          {instruction.kind === 'ride' && instruction.lineCode ? (
            <Text style={styles.badgeText} numberOfLines={1}>
              {instruction.lineCode.replace('Ligne ', '')}
            </Text>
          ) : (
            <Ionicons
              name={
                instruction.kind === 'walk'
                  ? 'walk'
                  : instruction.kind === 'arrival'
                    ? 'flag'
                    : 'bus'
              }
              size={20}
              color="#FFFFFF"
            />
          )}
        </View>

        <View style={styles.texts}>
          <Text style={styles.title} numberOfLines={2}>
            {instruction.title}
          </Text>
          <Text style={styles.detail} numberOfLines={1}>
            {instruction.detail}
          </Text>
        </View>
      </View>

      {weakSignal && !arrived && (
        <View style={styles.info}>
          <Ionicons name="cellular-outline" size={15} color={c.inkMuted} />
          <Text style={styles.infoText}>
            Signal GPS faible — le guidage reprendra dès que ta position sera plus précise.
          </Text>
        </View>
      )}

      {offRoute && !arrived && (
        <View style={styles.warning}>
          <Ionicons name="alert-circle-outline" size={15} color={c.danger} />
          <Text style={styles.warningText}>
            Tu sembles éloigné de l’itinéraire. Vérifie que tu es dans le bon bus.
          </Text>
        </View>
      )}

      <View style={styles.track}>
        <View
          style={[styles.trackFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: accent }]}
        />
      </View>
    </View>
  );
}

const createStyles = (c: Palette, isDark: boolean) =>
  StyleSheet.create({
    wrap: {
      backgroundColor: c.surface,
      borderRadius: Radii.lg,
      padding: Spacing.md,
      gap: Spacing.sm,
      ...makeElevation(c, isDark).floating,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    badge: {
      minWidth: 44,
      height: 44,
      borderRadius: Radii.md,
      paddingHorizontal: Spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: { fontFamily: Fonts.bodySemi, fontSize: 15, color: '#FFFFFF' },
    texts: { flex: 1 },
    title: { fontFamily: Fonts.displaySemi, fontSize: 17, color: c.ink },
    detail: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: c.inkMuted, marginTop: 2 },

    warning: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      backgroundColor: c.dangerTint,
      borderRadius: Radii.sm,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 6,
    },
    warningText: { flex: 1, fontFamily: Fonts.bodyMedium, fontSize: 12, color: c.danger },

    info: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      backgroundColor: c.fill,
      borderRadius: Radii.sm,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 6,
    },
    infoText: { flex: 1, fontFamily: Fonts.bodyMedium, fontSize: 12, color: c.inkMuted },

    track: { height: 4, borderRadius: 2, backgroundColor: c.fill, overflow: 'hidden' },
    trackFill: { height: 4, borderRadius: 2 },
  });

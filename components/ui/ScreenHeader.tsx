import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Fonts, Radii, Spacing, Palette } from '../../constants/theme';
import { useColors } from '../../store/ThemeContext';

// En-tête commun à tous les écrans empilés : même hauteur, même placement
// du titre partout — c'est ce qui donne l'impression d'une app cohérente.
export default function ScreenHeader({
  title,
  subtitle,
  action = 'back',
}: {
  title: string;
  subtitle?: string;
  action?: 'back' | 'close';
}) {
  const router = useRouter();
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel={action === 'back' ? 'Retour' : 'Fermer'}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name={action === 'back' ? 'chevron-back' : 'close'} size={20} color={c.ink} />
      </TouchableOpacity>

      <View style={styles.titles}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.md,
    },
    button: {
      width: 40,
      height: 40,
      borderRadius: Radii.md,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    titles: { flex: 1 },
    title: { fontFamily: Fonts.displaySemi, fontSize: 18, color: c.ink },
    subtitle: { fontFamily: Fonts.body, fontSize: 13, color: c.inkMuted, marginTop: 1 },
  });

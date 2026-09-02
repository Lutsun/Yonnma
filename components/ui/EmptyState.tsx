import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts, Spacing, Palette } from '../../constants/theme';
import { useColors } from '../../store/ThemeContext';

export default function EmptyState({
  icon,
  title,
  description,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}) {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);

  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={26} color={c.yonn} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
    iconWrap: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: c.yonnTint,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.md,
    },
    title: { fontFamily: Fonts.displaySemi, fontSize: 17, color: c.ink, textAlign: 'center' },
    description: {
      fontFamily: Fonts.body,
      fontSize: 14,
      color: c.inkMuted,
      textAlign: 'center',
      marginTop: Spacing.xs,
      lineHeight: 20,
    },
  });

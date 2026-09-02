import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Fonts, Palette } from '../../constants/theme';
import { useColors } from '../../store/ThemeContext';

export default function Wordmark({
  size = 36,
  variant = 'default',
}: {
  size?: number;
  variant?: 'default' | 'inverted';
}) {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const isInverted = variant === 'inverted';
  return (
    <View
      style={styles.row}
      accessibilityRole="header"
      accessibilityLabel="Yonnma"
    >
      <Text
        style={[
          styles.text,
          { fontSize: size, color: isInverted ? c.surface : c.yonn },
        ]}
      >
        Yonn
      </Text>
      <Text style={[styles.text, { fontSize: size, color: c.ink }]}>
        ma
      </Text>
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
  row: { flexDirection: 'row' },
  text: {
    fontFamily: Fonts.display,
    letterSpacing: -0.5,
  },
});

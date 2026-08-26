import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts } from '../../constants/theme';

export default function Wordmark({
  size = 36,
  variant = 'default',
}: {
  size?: number;
  variant?: 'default' | 'inverted';
}) {
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
          { fontSize: size, color: isInverted ? Colors.white : Colors.yonn },
        ]}
      >
        Yonn
      </Text>
      <Text style={[styles.text, { fontSize: size, color: Colors.ma }]}>
        ma
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  text: {
    fontFamily: Fonts.display,
    letterSpacing: -0.5,
  },
});

import React, { useMemo } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  GestureResponderEvent,
} from 'react-native';
import { Fonts, Radii, Palette } from '../../constants/theme';
import { useColors } from '../../store/ThemeContext';

export default function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  variant = 'primary',
}: {
  label: string;
  onPress: (e: GestureResponderEvent) => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const isSecondary = variant === 'secondary';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isSecondary && styles.buttonSecondary,
        (disabled || loading) && styles.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator color={isSecondary ? c.ink : c.canvas} />
      ) : (
        <Text style={[styles.label, isSecondary && styles.labelSecondary]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    button: {
      height: 52,
      borderRadius: Radii.md,
      backgroundColor: c.yonn,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonSecondary: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
    },
    buttonDisabled: { opacity: 0.4 },
    label: { fontFamily: Fonts.bodySemi, fontSize: 16, color: c.canvas },
    labelSecondary: { color: c.ink },
  });

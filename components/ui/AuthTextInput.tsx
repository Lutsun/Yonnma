import React, { useState, useMemo } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts, Radii, Spacing, Palette } from '../../constants/theme';
import { useColors } from '../../store/ThemeContext';

type Props = TextInputProps & {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  secureToggle?: boolean;
  error?: string;
};

export default function AuthTextInput({
  label,
  icon,
  secureToggle,
  error,
  secureTextEntry,
  ...rest
}: Props) {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureToggle);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          focused && styles.inputRowFocused,
          !!error && styles.inputRowError,
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={focused ? c.yonn : c.inkMuted}
        />
        <TextInput
          {...rest}
          style={styles.input}
          placeholderTextColor={c.line}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
        />
        {secureToggle && (
          <TouchableOpacity
            onPress={() => setHidden((h) => !h)}
            accessibilityLabel={
              hidden ? 'Afficher le mot de passe' : 'Masquer le mot de passe'
            }
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={hidden ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={c.inkMuted}
            />
          </TouchableOpacity>
        )}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
  wrap: { marginBottom: Spacing.md },
  label: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    color: c.ink,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: c.fill,
    borderWidth: 1.5,
    borderColor: c.line,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    height: 56,
  },
  inputRowFocused: {
    borderColor: c.ink,
  },
  inputRowError: { borderColor: c.danger },
  input: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 16,
    color: c.ink,
    paddingVertical: 0,
  },
  error: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: c.danger,
    marginTop: 4,
  },
});
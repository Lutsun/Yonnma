import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Radii, Spacing } from '../../constants/theme';

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
          color={focused ? Colors.yonn : Colors.stone}
        />
        <TextInput
          {...rest}
          style={styles.input}
          placeholderTextColor={Colors.stoneLight}
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
              color={Colors.stone}
            />
          </TouchableOpacity>
        )}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.md },
  label: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    color: Colors.ma,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.fill,
    borderWidth: 1.5,
    borderColor: Colors.stoneLight,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    height: 56,
  },
  inputRowFocused: {
    borderColor: Colors.ma,
  },
  inputRowError: { borderColor: Colors.danger },
  input: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 16,
    color: Colors.ma,
    paddingVertical: 0,
  },
  error: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.danger,
    marginTop: 4,
  },
});
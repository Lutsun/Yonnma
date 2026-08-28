import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs/types';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Fonts, Radii, Spacing, TAB_BAR_HEIGHT, TAB_BAR_BOTTOM_MARGIN } from '../../constants/theme';

// Barre de navigation "île" flottante, en vrai View positionnée avec des
// marges explicites — plus fiable que `tabBarStyle` (React Navigation
// ignore parfois left/right sur ce style selon la plateforme/version).
export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { bottom: insets.bottom + TAB_BAR_BOTTOM_MARGIN }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = (options.title ?? route.name) as string;
        const isFocused = state.index === index;
        const color = isFocused ? Colors.yonn : Colors.stone;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        if (route.name === 'assistant') {
          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.item}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={isFocused ? { selected: true } : {}}
            >
              <View style={[styles.fab, isFocused && styles.fabFocused]}>
                <MaterialCommunityIcons name="robot" size={24} color={Colors.white} />
              </View>
            </TouchableOpacity>
          );
        }

        let iconName: any = 'home';
        let IconComponent: React.ComponentType<any> = Ionicons;
        if (route.name === 'index') {
          iconName = isFocused ? 'home' : 'home-outline';
        } else if (route.name === 'routes') {
          iconName = 'map';
          IconComponent = FontAwesome5;
        } else if (route.name === 'saved') {
          iconName = isFocused ? 'bookmark' : 'bookmark-outline';
        } else if (route.name === 'profile') {
          iconName = isFocused ? 'person' : 'person-outline';
        }

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.item}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={isFocused ? { selected: true } : {}}
          >
            <View style={[styles.iconWrap, isFocused && styles.iconWrapActive]}>
              <IconComponent name={iconName} size={18} color={color} />
            </View>
            <Text style={[styles.label, { color }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    height: TAB_BAR_HEIGHT,
    borderRadius: Radii.xl,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: Colors.ma,
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconWrap: {
    width: 36,
    height: 26,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: Colors.yonnTint,
  },
  label: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 10,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: Radii.pill,
    backgroundColor: Colors.yonn,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
    shadowColor: Colors.yonn,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  fabFocused: {
    backgroundColor: Colors.yonnDark,
  },
});

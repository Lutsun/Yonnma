import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Colors,
  Fonts,
  Radii,
  Spacing,
  TAB_BAR_HEIGHT,
  TAB_BAR_BOTTOM_MARGIN,
} from '../../constants/theme';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any = 'home';
          let IconComponent: React.ComponentType<any> = Ionicons;

          if (route.name === 'index') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'routes') {
            iconName = 'map';
            IconComponent = FontAwesome5;
          } else if (route.name === 'assistant') {
            iconName = 'robot';
            IconComponent = MaterialCommunityIcons;
          } else if (route.name === 'saved') {
            iconName = focused ? 'bookmark' : 'bookmark-outline';
          } else if (route.name === 'profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <IconComponent name={iconName} size={size - 4} color={color} />
            </View>
          );
        },
        tabBarActiveTintColor: Colors.yonn,
        tabBarInactiveTintColor: Colors.stone,
        tabBarStyle: {
          position: 'absolute',
          left: Spacing.lg,
          right: Spacing.lg,
          bottom: insets.bottom + TAB_BAR_BOTTOM_MARGIN,
          height: TAB_BAR_HEIGHT,
          borderRadius: Radii.xl,
          backgroundColor: Colors.white,
          borderTopWidth: 0,
          paddingTop: 10,
          paddingBottom: 10,
          shadowColor: Colors.ma,
          shadowOpacity: 0.14,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 10,
        },
        tabBarItemStyle: { height: TAB_BAR_HEIGHT - 20 },
        tabBarLabelStyle: {
          fontFamily: Fonts.bodyMedium,
          fontSize: 10,
          marginTop: 2,
        },
        headerShown: false,
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Accueil' }} />
      <Tabs.Screen name="routes" options={{ title: 'Trajets' }} />
      <Tabs.Screen
        name="assistant"
        options={{
          title: 'Assistant',
          tabBarIcon: ({ focused }) => (
            <View
              style={[styles.fab, focused && styles.fabFocused]}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="robot" size={24} color={Colors.white} />
            </View>
          ),
        }}
      />
      <Tabs.Screen name="saved" options={{ title: 'Favoris' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
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

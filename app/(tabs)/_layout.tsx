import React from 'react';
import { Tabs } from 'expo-router';

import CustomTabBar from '../../components/navigation/CustomTabBar';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Carte' }} />
      <Tabs.Screen name="routes" options={{ title: 'Lignes' }} />
      <Tabs.Screen name="saved" options={{ title: 'Favoris' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
    </Tabs>
  );
}

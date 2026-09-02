import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { Sora_600SemiBold, Sora_700Bold } from '@expo-google-fonts/sora';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';

import { AuthProvider } from '../store/AuthContext';
import { TripProvider } from '../store/TripContext';
import { ThemeProvider, useTheme } from '../store/ThemeContext';

// Garde le splash screen affiché tant que les polices ne sont pas prêtes.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontsError] = useFonts({
    Sora_600SemiBold,
    Sora_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontsError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontsError]);

  if (!fontsLoaded && !fontsError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <TripProvider>
            <SafeAreaProvider>
              <RootNavigator />
            </SafeAreaProvider>
          </TripProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

// Séparé du provider pour pouvoir lire le thème choisi (barre d'état et
// fond des écrans doivent suivre le mode clair/sombre).
function RootNavigator() {
  const { isDark, colors } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.canvas },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(modals)" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Wordmark from '../components/brand/Wordmark';
import { useAuth } from '../store/AuthContext';
import { Palette } from '../constants/theme';
import { useColors } from '../store/ThemeContext';

// Écran d'ouverture : présente la marque sur fond vert pendant un court
// instant (comme Yango, Yassir...) avant d'atterrir sur la connexion ou,
// si l'utilisateur est déjà connecté, directement sur l'app.

const PRESENTATION_DURATION = 1400;

export default function Index() {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const router = useRouter();
  const { isLoggedIn, isRestoring, needsProfile, session } = useAuth();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress]);

  useEffect(() => {
    if (isRestoring) return;
    const timer = setTimeout(() => {
      if (isLoggedIn) {
        router.replace('/(tabs)');
      } else if (needsProfile) {
        router.replace({
          pathname: '/(auth)/complete-profile',
          params: { phone: session?.user.phone ?? '' },
        });
      } else {
        router.replace('/(auth)/login');
      }
    }, PRESENTATION_DURATION);
    return () => clearTimeout(timer);
  }, [isLoggedIn, isRestoring, needsProfile, session, router]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Animated.View
        style={{
          opacity: progress,
          transform: [
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 1],
              }),
            },
          ],
        }}
      >
        <Wordmark size={44} variant="inverted" />
      </Animated.View>
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.yonn,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Wordmark from '../components/auth/Wordmark';
import { useAuth } from '../store/AuthContext';
import { Colors } from '../constants/theme';

// Écran d'ouverture : présente la marque sur fond vert pendant un court
// instant (comme Yango, Yassir...) avant d'atterrir sur la connexion ou,
// si l'utilisateur est déjà connecté, directement sur l'app.

const PRESENTATION_DURATION = 1400;

export default function Index() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      router.replace(isLoggedIn ? '/(tabs)' : '/(auth)/login');
    }, PRESENTATION_DURATION);
    return () => clearTimeout(timer);
  }, [isLoggedIn, router, progress]);

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.yonn,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

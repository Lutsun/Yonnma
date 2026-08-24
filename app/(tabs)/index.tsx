import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Callout, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../store/AuthContext';
import { Colors, Fonts, Radii, Spacing } from '../../constants/theme';
import { getNearbyStops } from '../../services/transit';
import { Stop } from '../../types/transit';

const DAKAR_REGION: Region = {
  latitude: 14.6928,
  longitude: -17.4467,
  latitudeDelta: 0.045,
  longitudeDelta: 0.045,
};

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const mapRef = useRef<MapView>(null);

  const [region, setRegion] = useState<Region>(DAKAR_REGION);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [locationDenied, setLocationDenied] = useState(false);
  const [destination, setDestination] = useState('');
  const [stops, setStops] = useState<Stop[]>([]);
  const [stopsError, setStopsError] = useState(false);

  const loadNearbyStops = async (latitude: number, longitude: number) => {
    try {
      const nearby = await getNearbyStops(latitude, longitude, 3000);
      setStops(nearby);
      setStopsError(false);
    } catch {
      setStopsError(true);
    }
  };

  const locateMe = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationDenied(true);
        await loadNearbyStops(DAKAR_REGION.latitude, DAKAR_REGION.longitude);
        return;
      }
      setLocationDenied(false);
      const position = await Location.getCurrentPositionAsync({});
      const next: Region = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
      setRegion(next);
      mapRef.current?.animateToRegion(next, 500);
      await loadNearbyStops(next.latitude, next.longitude);
    } finally {
      setLoadingLocation(false);
    }
  };

  useEffect(() => {
    locateMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstName = user?.fullName?.trim().split(/\s+/)[0];

  const handleSearch = () => {
    router.push('/routes');
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={DAKAR_REGION}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
      >
        {stops.map((stop) => (
          <Marker
            key={stop.id}
            coordinate={stop}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.pin}>
              <Ionicons name="bus" size={14} color={Colors.white} />
            </View>
            <Callout tooltip={false}>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{stop.name}</Text>
                <Text style={styles.calloutLines}>
                  {stop.lines && stop.lines.length > 0
                    ? stop.lines.join(' · ')
                    : 'Aucune ligne renseignée'}
                </Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {loadingLocation && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={Colors.yonn} />
        </View>
      )}

      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <Text style={styles.greeting}>
          Bonjour{firstName ? ` ${firstName}` : ''} 👋
        </Text>
        <Text style={styles.subGreeting}>Où veux-tu aller aujourd'hui ?</Text>

        {locationDenied && (
          <View style={styles.notice}>
            <Ionicons name="information-circle" size={18} color={Colors.yonn} />
            <Text style={styles.noticeText}>
              Active ta position pour voir les arrêts autour de toi.
            </Text>
          </View>
        )}

        {stopsError && (
          <View style={styles.notice}>
            <Ionicons name="warning" size={18} color={Colors.yonn} />
            <Text style={styles.noticeText}>
              Impossible de charger les arrêts pour le moment.
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.locateButtonWrap, { bottom: Spacing.xl + 96 }]}>
        <TouchableOpacity
          style={styles.locateButton}
          onPress={locateMe}
          accessibilityRole="button"
          accessibilityLabel="Centrer sur ma position"
        >
          <Ionicons name="locate" size={22} color={Colors.yonn} />
        </TouchableOpacity>
      </View>

      <View style={[styles.bottomCard, { paddingBottom: insets.bottom + Spacing.md }]}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={20} color={Colors.stone} />
          <TextInput
            style={styles.searchInput}
            placeholder="Où voulez-vous aller ?"
            placeholderTextColor={Colors.stone}
            value={destination}
            onChangeText={setDestination}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSearch}
            accessibilityRole="button"
            accessibilityLabel="Rechercher un trajet"
          >
            <Ionicons name="arrow-forward" size={18} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  greeting: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.ma,
  },
  subGreeting: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.stone,
    marginTop: 2,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.yonnTint,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
  noticeText: {
    flex: 1,
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    color: Colors.yonnDark,
  },
  pin: {
    width: 30,
    height: 30,
    borderRadius: Radii.pill,
    backgroundColor: Colors.yonn,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  callout: {
    minWidth: 140,
    padding: Spacing.xs,
  },
  calloutTitle: {
    fontFamily: Fonts.bodySemi,
    fontSize: 13,
    color: Colors.ma,
  },
  calloutLines: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.stone,
    marginTop: 2,
  },
  locateButtonWrap: {
    position: 'absolute',
    right: Spacing.lg,
  },
  locateButton: {
    width: 48,
    height: 48,
    borderRadius: Radii.pill,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.ma,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  bottomCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    shadowColor: Colors.ma,
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: Platform.OS === 'android' ? 8 : 0,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.fill,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.md,
    height: 52,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.ma,
  },
  searchButton: {
    width: 34,
    height: 34,
    borderRadius: Radii.pill,
    backgroundColor: Colors.yonn,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

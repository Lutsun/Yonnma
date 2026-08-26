import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Keyboard,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Callout, Polyline, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../store/AuthContext';
import {
  Colors,
  Fonts,
  Radii,
  Spacing,
  TAB_BAR_HEIGHT,
  TAB_BAR_BOTTOM_MARGIN,
} from '../../constants/theme';
import { getNearbyStops, searchStops } from '../../services/transit';
import { saveTrip } from '../../services/trips';
import { Stop } from '../../types/transit';
import { initialsOf } from '../../utils/text';
import { distanceKm, estimateTripMinutes, formatDistance } from '../../utils/eta';

const DAKAR_REGION: Region = {
  latitude: 14.6928,
  longitude: -17.4467,
  latitudeDelta: 0.045,
  longitudeDelta: 0.045,
};

const SEARCH_DEBOUNCE_MS = 300;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const mapRef = useRef<MapView>(null);

  const [region, setRegion] = useState<Region>(DAKAR_REGION);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [locationDenied, setLocationDenied] = useState(false);
  const [reducedAccuracy, setReducedAccuracy] = useState(false);
  const [stops, setStops] = useState<Stop[]>([]);
  const [stopsError, setStopsError] = useState(false);

  const [destination, setDestination] = useState('');
  const [searchResults, setSearchResults] = useState<Stop[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<Stop | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setLocationDenied(true);
        await loadNearbyStops(DAKAR_REGION.latitude, DAKAR_REGION.longitude);
        return;
      }
      setLocationDenied(false);
      // Sur iOS, l'utilisateur peut n'autoriser qu'une position approximative
      // (~ plusieurs km) — c'est souvent la cause d'un point mal placé.
      setReducedAccuracy(permission.ios?.accuracy === 'reduced');
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
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

    // Suit la position réelle en continu (pas juste un relevé ponctuel),
    // pour que le point bleu et l'origine des trajets restent exacts.
    let subscription: Location.LocationSubscription | undefined;
    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 15 },
      (position) => {
        setRegion((prev) => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
      }
    ).then((sub) => {
      subscription = sub;
    });

    return () => subscription?.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recherche d'arrêts au fil de la frappe (avec un petit délai pour ne pas
  // interroger la base à chaque lettre tapée).
  useEffect(() => {
    if (selectedDestination || !destination.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      searchStops(destination)
        .then(setSearchResults)
        .catch(() => setSearchResults([]));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [destination, selectedDestination]);

  const firstName = user?.fullName?.trim().split(/\s+/)[0];
  const initials = user ? initialsOf(user.fullName) : '';

  const tripEstimate = selectedDestination
    ? distanceKm(region.latitude, region.longitude, selectedDestination.latitude, selectedDestination.longitude)
    : null;

  const handleSelectResult = (stop: Stop) => {
    setSelectedDestination(stop);
    setDestination(stop.name);
    setSearchResults([]);
    setSaved(false);
    Keyboard.dismiss();
    // Cadre la carte pour montrer à la fois ta position et l'arrêt choisi,
    // avec le trajet vert entre les deux (comme sur Yango).
    mapRef.current?.fitToCoordinates(
      [
        { latitude: region.latitude, longitude: region.longitude },
        { latitude: stop.latitude, longitude: stop.longitude },
      ],
      {
        edgePadding: { top: 120, right: 80, bottom: 280, left: 80 },
        animated: true,
      }
    );
  };

  const handleClearDestination = () => {
    setDestination('');
    setSelectedDestination(null);
    setSearchResults([]);
    setSaved(false);
  };

  const handleSaveTrip = async () => {
    if (!user || !selectedDestination) return;
    setSaving(true);
    try {
      await saveTrip({
        userId: user.id,
        originLabel: 'Ma position actuelle',
        originLatitude: region.latitude,
        originLongitude: region.longitude,
        destinationLabel: selectedDestination.name,
        destinationLatitude: selectedDestination.latitude,
        destinationLongitude: selectedDestination.longitude,
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
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

        {selectedDestination && (
          <>
            <Polyline
              coordinates={[
                { latitude: region.latitude, longitude: region.longitude },
                { latitude: selectedDestination.latitude, longitude: selectedDestination.longitude },
              ]}
              strokeColor={Colors.yonn}
              strokeWidth={4}
              lineDashPattern={[1]}
            />
            <Marker coordinate={selectedDestination} anchor={{ x: 0.5, y: 1 }}>
              <Ionicons name="location" size={36} color={Colors.danger} />
            </Marker>
          </>
        )}
      </MapView>

      {loadingLocation && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={Colors.yonn} />
        </View>
      )}

      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.greetingCard}>
          <View style={styles.greetingAvatar}>
            <Text style={styles.greetingAvatarText}>{initials}</Text>
          </View>
          <View>
            <Text style={styles.greeting}>
              Bonjour{firstName ? ` ${firstName}` : ''} 👋
            </Text>
            <Text style={styles.subGreeting}>Où veux-tu aller aujourd'hui ?</Text>
          </View>
        </View>

        {locationDenied && (
          <TouchableOpacity style={styles.notice} onPress={() => Linking.openSettings()}>
            <Ionicons name="information-circle" size={18} color={Colors.yonn} />
            <Text style={styles.noticeText}>
              Active ta position dans Réglages pour voir les arrêts autour de toi.
            </Text>
          </TouchableOpacity>
        )}

        {reducedAccuracy && (
          <TouchableOpacity style={styles.notice} onPress={() => Linking.openSettings()}>
            <Ionicons name="locate" size={18} color={Colors.yonn} />
            <Text style={styles.noticeText}>
              Position approximative activée — appuie ici pour activer la position précise dans
              Réglages et voir ton point exact.
            </Text>
          </TouchableOpacity>
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

      <View
        style={[
          styles.locateButtonWrap,
          { bottom: insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_MARGIN + Spacing.xl + 96 },
        ]}
      >
        <TouchableOpacity
          style={styles.locateButton}
          onPress={locateMe}
          accessibilityRole="button"
          accessibilityLabel="Centrer sur ma position"
        >
          <Ionicons name="locate" size={22} color={Colors.yonn} />
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.bottomCard,
          { bottom: insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_MARGIN + Spacing.sm },
        ]}
      >
        <View style={styles.handle} />
        <View style={styles.searchRow}>
          <Ionicons name="search" size={20} color={Colors.stone} />
          <TextInput
            style={styles.searchInput}
            placeholder="Où voulez-vous aller ?"
            placeholderTextColor={Colors.stone}
            value={destination}
            onChangeText={(t) => {
              setDestination(t);
              if (selectedDestination) setSelectedDestination(null);
            }}
            returnKeyType="search"
          />
          {destination.length > 0 && (
            <TouchableOpacity
              onPress={handleClearDestination}
              accessibilityRole="button"
              accessibilityLabel="Effacer la recherche"
            >
              <Ionicons name="close-circle" size={20} color={Colors.stone} />
            </TouchableOpacity>
          )}
        </View>

        {searchResults.length > 0 && (
          <View style={styles.resultsList}>
            {searchResults.map((stop) => (
              <TouchableOpacity
                key={stop.id}
                style={styles.resultRow}
                activeOpacity={0.6}
                onPress={() => handleSelectResult(stop)}
              >
                <View style={styles.resultIcon}>
                  <Ionicons name="bus" size={16} color={Colors.yonn} />
                </View>
                <Text style={styles.resultText}>{stop.name}</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.stoneLight} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!selectedDestination && !destination.trim() && stops.length > 0 && (
          <View style={styles.resultsList}>
            <Text style={styles.suggestionsTitle}>Arrêts à proximité</Text>
            {stops.slice(0, 4).map((stop) => (
              <TouchableOpacity
                key={stop.id}
                style={styles.resultRow}
                activeOpacity={0.6}
                onPress={() => handleSelectResult(stop)}
              >
                <View style={styles.resultIcon}>
                  <Ionicons name="bus" size={16} color={Colors.yonn} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultText}>{stop.name}</Text>
                  {!!stop.lines?.length && (
                    <Text style={styles.resultSubtext} numberOfLines={1}>
                      {stop.lines.join(' · ')}
                    </Text>
                  )}
                </View>
                {typeof stop.distance_meters === 'number' && (
                  <Text style={styles.resultDistance}>
                    {formatDistance(stop.distance_meters / 1000)}
                  </Text>
                )}
                <Ionicons name="chevron-forward" size={16} color={Colors.stoneLight} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {selectedDestination && tripEstimate !== null && (
          <View style={styles.confirmCard}>
            <View style={styles.confirmHeader}>
              <View style={styles.confirmIcon}>
                <Ionicons name="navigate" size={16} color={Colors.yonn} />
              </View>
              <Text style={styles.confirmText} numberOfLines={1}>
                Trajet vers <Text style={styles.confirmDestination}>{selectedDestination.name}</Text>
              </Text>
            </View>

            <View style={styles.confirmMetaRow}>
              <View style={styles.confirmMeta}>
                <Ionicons name="time-outline" size={14} color={Colors.stone} />
                <Text style={styles.confirmMetaText}>
                  ~{estimateTripMinutes(tripEstimate)} min (estimation)
                </Text>
              </View>
              <View style={styles.confirmMeta}>
                <Ionicons name="navigate-outline" size={14} color={Colors.stone} />
                <Text style={styles.confirmMetaText}>{formatDistance(tripEstimate)}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saved && styles.saveButtonDone]}
              onPress={handleSaveTrip}
              disabled={saving || saved}
              accessibilityRole="button"
              accessibilityLabel="Enregistrer ce trajet"
            >
              {saving ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Ionicons
                    name={saved ? 'checkmark' : 'bookmark'}
                    size={16}
                    color={Colors.white}
                  />
                  <Text style={styles.saveButtonText}>
                    {saved ? 'Enregistré' : 'Enregistrer ce trajet'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
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
  greetingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: Colors.white,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingRight: Spacing.lg,
    shadowColor: Colors.ma,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  greetingAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.yonnTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingAvatarText: {
    fontFamily: Fonts.bodySemi,
    fontSize: 14,
    color: Colors.yonn,
  },
  greeting: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.ma,
  },
  subGreeting: {
    fontFamily: Fonts.body,
    fontSize: 13,
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
    shadowColor: Colors.ma,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
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
    shadowColor: Colors.ma,
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
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
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: Radii.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    shadowColor: Colors.ma,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: Platform.OS === 'android' ? 8 : 6,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.stoneLight,
    marginBottom: Spacing.sm,
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
  resultsList: {
    marginTop: Spacing.sm,
  },
  suggestionsTitle: {
    fontFamily: Fonts.bodySemi,
    fontSize: 12,
    color: Colors.stone,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  resultSubtext: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.stone,
    marginTop: 1,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radii.md,
    marginBottom: 2,
  },
  resultIcon: {
    width: 32,
    height: 32,
    borderRadius: Radii.pill,
    backgroundColor: Colors.yonnTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultText: {
    flex: 1,
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    color: Colors.ma,
  },
  resultDistance: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.stone,
  },
  confirmCard: {
    marginTop: Spacing.md,
    backgroundColor: Colors.yonnTint,
    borderRadius: Radii.lg,
    padding: Spacing.md,
  },
  confirmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  confirmIcon: {
    width: 28,
    height: 28,
    borderRadius: Radii.pill,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.yonnDark,
  },
  confirmDestination: {
    fontFamily: Fonts.bodySemi,
  },
  confirmMetaRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
    marginLeft: 36,
  },
  confirmMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  confirmMetaText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    color: Colors.stone,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.yonn,
    borderRadius: Radii.pill,
    marginTop: Spacing.md,
    height: 40,
  },
  saveButtonDone: {
    backgroundColor: Colors.yonnDark,
  },
  saveButtonText: {
    fontFamily: Fonts.bodySemi,
    fontSize: 13,
    color: Colors.white,
  },
});

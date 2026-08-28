import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Callout, Polyline, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useAuth } from '../../store/AuthContext';
import { useTrip } from '../../store/TripContext';
import {
  Colors,
  Fonts,
  Radii,
  Spacing,
  TAB_BAR_HEIGHT,
  TAB_BAR_BOTTOM_MARGIN,
} from '../../constants/theme';
import { getNearbyStops } from '../../services/transit';
import { saveTrip } from '../../services/trips';
import { Stop } from '../../types/transit';
import { initialsOf } from '../../utils/text';

const DAKAR_REGION: Region = {
  latitude: 14.6928,
  longitude: -17.4467,
  latitudeDelta: 0.045,
  longitudeDelta: 0.045,
};

// Écran d'accueil volontairement minimal, façon Yango : la carte occupe tout
// l'espace, une seule barre de recherche mène au planificateur d'itinéraire.
// Quand un trajet est calculé, cette même carte devient le guide pas à pas
// (arrêt à prendre, correspondances, descente) — voir `activeTrip`.
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { activeTrip, clearActiveTrip } = useTrip();
  const mapRef = useRef<MapView>(null);

  const [region, setRegion] = useState<Region>(DAKAR_REGION);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [locationDenied, setLocationDenied] = useState(false);
  const [reducedAccuracy, setReducedAccuracy] = useState(false);
  const [stops, setStops] = useState<Stop[]>([]);
  const [stopsError, setStopsError] = useState(false);
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
      if (!activeTrip) mapRef.current?.animateToRegion(next, 500);
      await loadNearbyStops(next.latitude, next.longitude);
    } finally {
      setLoadingLocation(false);
    }
  };

  useEffect(() => {
    locateMe();

    // Suit la position réelle en continu (pas juste un relevé ponctuel),
    // pour que le point bleu reste exact.
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

  // Cadre la carte sur l'itinéraire dès qu'un trajet est calculé.
  useEffect(() => {
    if (!activeTrip) return;
    setSaved(false);
    const coords = activeTrip.plan.segments.flatMap((s) => s.path);
    if (coords.length > 0) {
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 140, right: 60, bottom: 340, left: 60 },
        animated: true,
      });
    }
  }, [activeTrip]);

  const handleSaveTrip = async () => {
    if (!user || !activeTrip) return;
    setSaving(true);
    try {
      await saveTrip({
        userId: user.id,
        originLabel: activeTrip.origin.name,
        originLatitude: activeTrip.origin.latitude,
        originLongitude: activeTrip.origin.longitude,
        destinationLabel: activeTrip.destination.name,
        destinationLatitude: activeTrip.destination.latitude,
        destinationLongitude: activeTrip.destination.longitude,
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const firstName = user?.fullName?.trim().split(/\s+/)[0];
  const initials = user ? initialsOf(user.fullName) : '';

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
        {!activeTrip &&
          stops.map((stop) => (
            <Marker key={stop.id} coordinate={stop} anchor={{ x: 0.5, y: 0.5 }}>
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

        {activeTrip && (
          <>
            {activeTrip.plan.segments.map((segment, index) => (
              <Polyline
                key={index}
                coordinates={segment.path}
                strokeColor={segment.type === 'ride' ? segment.lineColor : Colors.stone}
                strokeWidth={segment.type === 'ride' ? 5 : 3}
                lineDashPattern={segment.type === 'walk' ? [8, 6] : undefined}
              />
            ))}

            <Marker coordinate={activeTrip.origin} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.originPin}>
                <View style={styles.originPinDot} />
              </View>
            </Marker>

            {activeTrip.plan.segments
              .filter((s): s is Extract<typeof s, { type: 'ride' }> => s.type === 'ride')
              .map((segment) => (
                <Marker
                  key={segment.lineId + segment.boardStopId}
                  coordinate={segment.path[0]}
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <View style={[styles.boardPin, { backgroundColor: segment.lineColor }]}>
                    <Text style={styles.boardPinText}>{segment.lineCode}</Text>
                  </View>
                </Marker>
              ))}

            <Marker coordinate={activeTrip.destination} anchor={{ x: 0.5, y: 1 }}>
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

      {!activeTrip && (
        <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
          <View style={styles.greetingCard}>
            <View style={styles.greetingAvatar}>
              <Text style={styles.greetingAvatarText}>{initials}</Text>
            </View>
            <Text style={styles.greeting}>Bonjour{firstName ? ` ${firstName}` : ''} 👋</Text>
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
                Position approximative activée — appuie ici pour activer la position précise.
              </Text>
            </TouchableOpacity>
          )}

          {stopsError && (
            <View style={styles.notice}>
              <Ionicons name="warning" size={18} color={Colors.yonn} />
              <Text style={styles.noticeText}>Impossible de charger les arrêts pour le moment.</Text>
            </View>
          )}
        </View>
      )}

      {activeTrip && (
        <TouchableOpacity
          style={[styles.closeTripButton, { top: insets.top + Spacing.sm }]}
          onPress={clearActiveTrip}
          accessibilityRole="button"
          accessibilityLabel="Fermer l'itinéraire"
        >
          <Ionicons name="close" size={22} color={Colors.ma} />
        </TouchableOpacity>
      )}

      {!activeTrip && (
        <View
          style={[
            styles.locateButtonWrap,
            { bottom: insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_MARGIN + Spacing.xl + 24 },
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
      )}

      {!activeTrip && (
        <TouchableOpacity
          style={[
            styles.searchBar,
            { bottom: insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_MARGIN + Spacing.sm },
          ]}
          activeOpacity={0.85}
          onPress={() => router.push('/(modals)/itinerary')}
        >
          <View style={styles.searchIcon}>
            <Ionicons name="search" size={18} color={Colors.yonn} />
          </View>
          <Text style={styles.searchText}>Où allez-vous ?</Text>
        </TouchableOpacity>
      )}

      {activeTrip && (
        <View
          style={[
            styles.guideCard,
            { bottom: insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_MARGIN + Spacing.sm },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.guideHeader}>
            <View>
              <Text style={styles.guideRoute} numberOfLines={1}>
                {activeTrip.origin.name} → {activeTrip.destination.name}
              </Text>
              <View style={styles.guideMetaRow}>
                <Ionicons name="time-outline" size={14} color={Colors.stone} />
                <Text style={styles.guideMetaText}>{activeTrip.plan.totalMinutes} min</Text>
                <Ionicons name="cash-outline" size={14} color={Colors.stone} style={{ marginLeft: Spacing.sm }} />
                <Text style={styles.guideMetaText}>{activeTrip.plan.totalFareFcfa} FCFA</Text>
              </View>
            </View>
          </View>

          <ScrollView style={styles.guideSteps} showsVerticalScrollIndicator={false}>
            <View style={styles.stepRow}>
              <View style={styles.stepMarkerCol}>
                <View style={styles.stepDotOrigin} />
                <View style={styles.stepLine} />
              </View>
              <Text style={styles.stepText}>
                Départ : <Text style={styles.stepBold}>{activeTrip.origin.name}</Text>
              </Text>
            </View>

            {activeTrip.plan.segments.map((segment, index) => {
              const isLast = index === activeTrip.plan.segments.length - 1;
              return (
                <View key={index} style={styles.stepRow}>
                  <View style={styles.stepMarkerCol}>
                    {segment.type === 'ride' ? (
                      <View style={[styles.stepDotLine, { backgroundColor: segment.lineColor }]}>
                        <Text style={styles.stepDotLineText}>{segment.lineCode.replace('Ligne ', '')}</Text>
                      </View>
                    ) : (
                      <View style={styles.stepDotWalk}>
                        <Ionicons name="walk" size={12} color={Colors.stone} />
                      </View>
                    )}
                    {!isLast && <View style={styles.stepLine} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    {segment.type === 'ride' ? (
                      <>
                        <Text style={styles.stepText}>
                          Prendre <Text style={styles.stepBold}>{segment.lineCode}</Text> ({segment.operatorShortName})
                        </Text>
                        <Text style={styles.stepSubtext}>
                          Descendre à {segment.alightStopName} · {segment.minutes} min
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.stepText}>
                        Marcher jusqu'à <Text style={styles.stepBold}>{segment.toStopName}</Text> ({segment.minutes}{' '}
                        min)
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}

            <View style={styles.stepRow}>
              <View style={styles.stepMarkerCol}>
                <Ionicons name="location" size={18} color={Colors.danger} />
              </View>
              <Text style={styles.stepText}>
                Arrivée : <Text style={styles.stepBold}>{activeTrip.destination.name}</Text>
              </Text>
            </View>

            {!!user && (
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
                    <Ionicons name={saved ? 'checkmark' : 'bookmark'} size={16} color={Colors.white} />
                    <Text style={styles.saveButtonText}>
                      {saved ? 'Trajet enregistré' : 'Enregistrer ce trajet'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      )}
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.yonnTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingAvatarText: {
    fontFamily: Fonts.bodySemi,
    fontSize: 13,
    color: Colors.yonn,
  },
  greeting: {
    fontFamily: Fonts.bodySemi,
    fontSize: 15,
    color: Colors.ma,
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
  originPin: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.yonn,
  },
  originPinDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.yonn,
  },
  boardPin: {
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: Colors.white,
    shadowColor: Colors.ma,
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  boardPinText: {
    fontFamily: Fonts.bodySemi,
    fontSize: 11,
    color: Colors.white,
  },
  closeTripButton: {
    position: 'absolute',
    right: Spacing.lg,
    width: 40,
    height: 40,
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
  searchBar: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 60,
    backgroundColor: Colors.white,
    borderRadius: Radii.xl,
    paddingHorizontal: Spacing.sm,
    shadowColor: Colors.ma,
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  searchIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.pill,
    backgroundColor: Colors.yonnTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 15,
    color: Colors.stone,
  },
  guideCard: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    maxHeight: 360,
    backgroundColor: Colors.white,
    borderRadius: Radii.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    shadowColor: Colors.ma,
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.stoneLight,
    marginBottom: Spacing.sm,
  },
  guideHeader: {
    marginBottom: Spacing.sm,
  },
  guideRoute: {
    fontFamily: Fonts.displaySemi,
    fontSize: 16,
    color: Colors.ma,
  },
  guideMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  guideMetaText: {
    fontFamily: Fonts.bodySemi,
    fontSize: 13,
    color: Colors.yonnDark,
  },
  guideSteps: {
    maxHeight: 260,
  },
  stepRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  stepMarkerCol: {
    width: 24,
    alignItems: 'center',
  },
  stepDotOrigin: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.yonn,
    marginTop: 4,
  },
  stepDotWalk: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotLine: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotLineText: {
    fontFamily: Fonts.bodySemi,
    fontSize: 10,
    color: Colors.white,
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 20,
    backgroundColor: Colors.stoneLight,
    marginVertical: 2,
  },
  stepText: {
    flex: 1,
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    color: Colors.ma,
    paddingBottom: Spacing.md,
    paddingTop: 2,
  },
  stepSubtext: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.stone,
    marginTop: 2,
  },
  stepBold: {
    fontFamily: Fonts.bodySemi,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.yonn,
    borderRadius: Radii.pill,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
    height: 44,
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

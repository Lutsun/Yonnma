import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import ScreenHeader from '../../components/ui/ScreenHeader';
import PrimaryButton from '../../components/ui/PrimaryButton';
import { Fonts, Radii, Spacing, Palette } from '../../constants/theme';
import { useColors } from '../../store/ThemeContext';
import { getNearbyStops, getRouteGraph, searchStops } from '../../services/transit';
import { buildRouteGraph, planTripOptions, withAccessWalk, RouteGraph } from '../../services/routing';
import { useTrip } from '../../store/TripContext';
import { LatLng, Stop } from '../../types/transit';
import { formatDistance } from '../../utils/eta';

// Le graphe du réseau ne change pas pendant une session : on le garde en
// mémoire pour ne pas le recharger à chaque recherche.
let cachedGraph: RouteGraph | null = null;

type Field = 'origin' | 'destination';
type Outcome = 'none' | 'no-path' | 'same-stop' | 'error' | 'no-location';

const OUTCOME_MESSAGE: Record<Exclude<Outcome, 'none'>, string> = {
  'no-path': 'Ces deux arrêts ne sont pas encore reliés dans le réseau Yonnma.',
  'same-stop': 'Le départ et la destination sont le même arrêt.',
  error: 'Impossible de calculer l’itinéraire. Vérifie ta connexion.',
  'no-location': 'Active la localisation pour partir de ta position exacte.',
};

export default function ItineraryScreen() {
  const router = useRouter();
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const { setPendingTrip } = useTrip();

  const [origin, setOrigin] = useState<Stop | null>(null);
  const [destination, setDestination] = useState<Stop | null>(null);
  const [originText, setOriginText] = useState('');
  const [destinationText, setDestinationText] = useState('');
  const [activeField, setActiveField] = useState<Field | null>('destination');
  const [results, setResults] = useState<Stop[]>([]);
  const [suggestions, setSuggestions] = useState<Stop[]>([]);
  const [locatingMe, setLocatingMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>('none');

  // Position GPS réelle : sert à faire commencer le trajet là où l'utilisateur
  // se trouve, et pas directement à l'arrêt.
  const [userPosition, setUserPosition] = useState<LatLng | null>(null);
  const [originIsUser, setOriginIsUser] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const text = activeField === 'origin' ? originText : destinationText;
    if (!activeField || !text.trim()) {
      setResults([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchStops(text)
        .then(setResults)
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [activeField, originText, destinationText]);

  // Champ vide : on propose les arrêts autour de la position réelle.
  useEffect(() => {
    const text = activeField === 'origin' ? originText : destinationText;
    const around = userPosition ?? origin;
    if (!activeField || text.trim() || !around) {
      setSuggestions([]);
      return;
    }
    getNearbyStops(around.latitude, around.longitude, 3000)
      .then((s) => setSuggestions(s.filter((x) => x.id !== origin?.id).slice(0, 6)))
      .catch(() => setSuggestions([]));
  }, [activeField, originText, destinationText, origin, userPosition]);

  const useMyPosition = async (silent = false) => {
    setLocatingMe(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        if (!silent) setOutcome('no-location');
        return;
      }
      // Précision maximale : c'est elle qui rend l'itinéraire réellement
      // exact (le point de départ et la marche d'accès en dépendent).
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      const here = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setUserPosition(here);

      const nearby = await getNearbyStops(here.latitude, here.longitude, 3000);
      if (nearby.length > 0) {
        setOrigin(nearby[0]);
        setOriginText('Ma position');
        setOriginIsUser(true);
        setOutcome('none');
      }
    } finally {
      setLocatingMe(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    useMyPosition(true);
  }, []);

  const selectStop = (stop: Stop) => {
    if (activeField === 'origin') {
      setOrigin(stop);
      setOriginText(stop.name);
      setOriginIsUser(false);
      setActiveField(destination ? null : 'destination');
    } else {
      setDestination(stop);
      setDestinationText(stop.name);
      setActiveField(null);
      Keyboard.dismiss();
    }
    setResults([]);
    setOutcome('none');
  };

  const swap = () => {
    setOrigin(destination);
    setDestination(origin);
    setOriginText(destinationText);
    setDestinationText(originText);
    setOriginIsUser(false);
    setOutcome('none');
  };

  const handleSearch = async () => {
    if (!origin || !destination) return;
    Keyboard.dismiss();
    setActiveField(null);
    setLoading(true);
    setOutcome('none');
    try {
      if (!cachedGraph) cachedGraph = buildRouteGraph(await getRouteGraph());
      let options = planTripOptions(cachedGraph, origin.id, destination.id);

      if (options.length === 0) {
        setOutcome('no-path');
        return;
      }
      if (options[0].plan.segments.length === 0) {
        setOutcome('same-stop');
        return;
      }

      // Le trajet part de la position réelle : on ajoute la marche jusqu'à
      // l'arrêt de montée pour que durée et étapes soient exactes.
      if (originIsUser && userPosition) {
        options = options.map((o) => ({
          ...o,
          plan: withAccessWalk(o.plan, userPosition, origin),
        }));
      }

      setPendingTrip({ origin, destination, options });
      router.push('/(modals)/choose-trip');
    } catch {
      setOutcome('error');
    } finally {
      setLoading(false);
    }
  };

  const canSearch = !!origin && !!destination && origin.id !== destination.id;
  const list = results.length > 0 ? results : suggestions;
  const listIsSuggestions = results.length === 0 && suggestions.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Itinéraire" action="close" />

      <View style={styles.top}>
        <View style={styles.form}>
          <View style={styles.rail}>
            <View style={styles.railDotOrigin} />
            <View style={styles.railLine} />
            <View style={styles.railDotDestination} />
          </View>

          <View style={styles.fields}>
            <Field
              styles={styles}
              colors={c}
              placeholder="Point de départ"
              value={originText}
              filled={!!origin}
              onFocus={() => setActiveField('origin')}
              onChangeText={(t) => {
                setOriginText(t);
                setOriginIsUser(false);
                if (origin) setOrigin(null);
              }}
            />
            <View style={styles.fieldSeparator} />
            <Field
              styles={styles}
              colors={c}
              placeholder="Destination"
              value={destinationText}
              filled={!!destination}
              onFocus={() => setActiveField('destination')}
              onChangeText={(t) => {
                setDestinationText(t);
                if (destination) setDestination(null);
              }}
            />
          </View>

          <TouchableOpacity
            style={styles.swap}
            onPress={swap}
            accessibilityRole="button"
            accessibilityLabel="Inverser départ et destination"
          >
            <Ionicons name="swap-vertical" size={17} color={c.ink} />
          </TouchableOpacity>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.myPosition}
            onPress={() => useMyPosition(false)}
            disabled={locatingMe}
            accessibilityRole="button"
          >
            {locatingMe ? (
              <ActivityIndicator size="small" color={c.yonn} />
            ) : (
              <Ionicons name="locate" size={15} color={c.yonn} />
            )}
            <Text style={styles.myPositionText}>Ma position</Text>
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <PrimaryButton
              label="Rechercher"
              onPress={handleSearch}
              disabled={!canSearch}
              loading={loading}
            />
          </View>
        </View>

        {outcome !== 'none' && (
          <View style={styles.outcome}>
            <Ionicons name="alert-circle-outline" size={18} color={c.danger} />
            <Text style={styles.outcomeText}>{OUTCOME_MESSAGE[outcome]}</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!!activeField && list.length > 0 && (
          <>
            <Text style={styles.listLabel}>
              {listIsSuggestions ? 'Arrêts autour de toi' : 'Résultats'}
            </Text>
            {list.map((stop) => (
              <TouchableOpacity
                key={stop.id}
                style={styles.stopRow}
                activeOpacity={0.7}
                onPress={() => selectStop(stop)}
              >
                <View
                  style={[
                    styles.stopIcon,
                    { backgroundColor: (stop.operator_colors?.[0] ?? c.yonn) + '22' },
                  ]}
                >
                  <Ionicons name="bus" size={16} color={stop.operator_colors?.[0] ?? c.yonn} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stopName} numberOfLines={1}>
                    {stop.name}
                  </Text>
                  {!!stop.lines?.length && (
                    <Text style={styles.stopLines} numberOfLines={1}>
                      {stop.lines.join(' · ')}
                    </Text>
                  )}
                </View>
                {typeof stop.distance_meters === 'number' && (
                  <Text style={styles.stopDistance}>
                    {formatDistance(stop.distance_meters / 1000)}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  placeholder,
  value,
  filled,
  onFocus,
  onChangeText,
  styles,
  colors,
}: {
  placeholder: string;
  value: string;
  filled: boolean;
  onFocus: () => void;
  onChangeText: (t: string) => void;
  styles: ReturnType<typeof createStyles>;
  colors: Palette;
}) {
  return (
    <View style={styles.field}>
      <TextInput
        style={styles.fieldInput}
        placeholder={placeholder}
        placeholderTextColor={colors.inkFaint}
        value={value}
        onFocus={onFocus}
        onChangeText={onChangeText}
        autoCorrect={false}
        autoCapitalize="none"
        spellCheck={false}
        returnKeyType="search"
      />
      {filled && <Ionicons name="checkmark-circle" size={17} color={colors.yonn} />}
    </View>
  );
}

const createStyles = (c: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.canvas },

    top: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
    form: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: Radii.lg,
      borderWidth: 1,
      borderColor: c.line,
      paddingHorizontal: Spacing.sm,
    },
    rail: { width: 28, alignItems: 'center', paddingVertical: Spacing.md },
    railDotOrigin: {
      width: 11,
      height: 11,
      borderRadius: 6,
      borderWidth: 3,
      borderColor: c.yonn,
      backgroundColor: c.surface,
    },
    railLine: { width: 2, flex: 1, minHeight: 20, backgroundColor: c.line, marginVertical: 3 },
    railDotDestination: { width: 10, height: 10, borderRadius: 2, backgroundColor: c.ink },

    fields: { flex: 1 },
    field: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, height: 50 },
    fieldInput: { flex: 1, fontFamily: Fonts.bodyMedium, fontSize: 15, color: c.ink },
    fieldSeparator: { height: 1, backgroundColor: c.line },

    swap: {
      width: 36,
      height: 36,
      borderRadius: Radii.pill,
      backgroundColor: c.fill,
      alignItems: 'center',
      justifyContent: 'center',
    },

    actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    myPosition: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      height: 52,
      paddingHorizontal: Spacing.md,
      borderRadius: Radii.md,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.surface,
    },
    myPositionText: { fontFamily: Fonts.bodySemi, fontSize: 13, color: c.yonn },

    outcome: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      backgroundColor: c.dangerTint,
      borderRadius: Radii.md,
      padding: Spacing.md,
    },
    outcomeText: { flex: 1, fontFamily: Fonts.bodyMedium, fontSize: 13, color: c.danger },

    list: { flex: 1, marginTop: Spacing.md },
    listContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
    listLabel: {
      fontFamily: Fonts.bodySemi,
      fontSize: 11,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: c.inkFaint,
      marginBottom: Spacing.sm,
    },
    stopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    stopIcon: {
      width: 38,
      height: 38,
      borderRadius: Radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stopName: { fontFamily: Fonts.bodySemi, fontSize: 15, color: c.ink },
    stopLines: { fontFamily: Fonts.body, fontSize: 12, color: c.inkFaint, marginTop: 2 },
    stopDistance: { fontFamily: Fonts.bodyMedium, fontSize: 12, color: c.inkFaint },
  });

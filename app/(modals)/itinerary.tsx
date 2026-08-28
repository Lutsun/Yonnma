import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import EmptyState from '../../components/ui/EmptyState';
import PrimaryButton from '../../components/ui/PrimaryButton';
import { Colors, Fonts, Radii, Spacing } from '../../constants/theme';
import { getNearbyStops, getRouteGraph, searchStops } from '../../services/transit';
import { buildRouteGraph, planTrip, RouteGraph } from '../../services/routing';
import { useTrip } from '../../store/TripContext';
import { Stop } from '../../types/transit';

// Le graphe du réseau ne change pas pendant une session : on le garde en
// mémoire pour ne pas le recharger à chaque ouverture de l'écran.
let cachedGraph: RouteGraph | null = null;

type Field = 'origin' | 'destination';
type SearchOutcome = 'none' | 'no-path' | 'same-stop' | 'error';

export default function ItineraryModal() {
  const router = useRouter();
  const { setActiveTrip } = useTrip();

  const [origin, setOrigin] = useState<Stop | null>(null);
  const [destination, setDestination] = useState<Stop | null>(null);
  const [activeField, setActiveField] = useState<Field | null>(null);
  const [originText, setOriginText] = useState('');
  const [destinationText, setDestinationText] = useState('');
  const [results, setResults] = useState<Stop[]>([]);
  const [suggestions, setSuggestions] = useState<Stop[]>([]);
  const [locatingMe, setLocatingMe] = useState(false);

  const [loading, setLoading] = useState(false);
  const [outcome, setOutcome] = useState<SearchOutcome>('none');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Recherche d'arrêts au fil de la frappe.
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

  // Quand le champ destination s'ouvre sans texte, propose les arrêts
  // autour du départ plutôt que de laisser l'écran vide.
  useEffect(() => {
    if (activeField !== 'destination' || destinationText.trim() || !origin) {
      setSuggestions([]);
      return;
    }
    getNearbyStops(origin.latitude, origin.longitude, 3000)
      .then((stops) => setSuggestions(stops.filter((s) => s.id !== origin.id).slice(0, 6)))
      .catch(() => setSuggestions([]));
  }, [activeField, destinationText, origin]);

  const selectStop = (stop: Stop) => {
    if (activeField === 'origin') {
      setOrigin(stop);
      setOriginText(stop.name);
    } else if (activeField === 'destination') {
      setDestination(stop);
      setDestinationText(stop.name);
    }
    setActiveField(null);
    setResults([]);
    setSuggestions([]);
    Keyboard.dismiss();
  };

  const useMyPosition = async () => {
    setLocatingMe(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') return;
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const nearby = await getNearbyStops(
        position.coords.latitude,
        position.coords.longitude,
        3000
      );
      if (nearby.length > 0) {
        setOrigin(nearby[0]);
        setOriginText(nearby[0].name);
        setActiveField(null);
        setResults([]);
      }
    } finally {
      setLocatingMe(false);
    }
  };

  // Pré-remplit le départ avec la position actuelle à l'ouverture de l'écran,
  // pour que l'utilisateur n'ait qu'à taper sa destination (comme sur Yango).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    useMyPosition();
  }, []);

  const handleSearch = async () => {
    if (!origin || !destination) return;
    Keyboard.dismiss();
    setActiveField(null);
    setLoading(true);
    setOutcome('none');
    try {
      if (!cachedGraph) {
        const rows = await getRouteGraph();
        cachedGraph = buildRouteGraph(rows);
      }
      const plan = planTrip(cachedGraph, origin.id, destination.id);
      if (plan === null) {
        setOutcome('no-path');
      } else if (plan.segments.length === 0) {
        setOutcome('same-stop');
      } else {
        // Trajet trouvé : on l'affiche sur la carte de l'accueil, comme un
        // vrai guide (arrêt à prendre, correspondances, descente).
        setActiveTrip({ origin, destination, plan });
        router.back();
      }
    } catch {
      setOutcome('error');
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: Field) => {
    const isOrigin = field === 'origin';
    const value = isOrigin ? originText : destinationText;
    const stop = isOrigin ? origin : destination;
    const isActive = activeField === field;

    return (
      <View style={[styles.fieldRow, isActive && styles.fieldRowActive]}>
        <View style={[styles.fieldDot, isOrigin ? styles.dotOrigin : styles.dotDestination]} />
        <TextInput
          style={styles.fieldInput}
          placeholder={isOrigin ? 'Point de départ' : 'Destination'}
          placeholderTextColor={Colors.stone}
          value={value}
          autoCorrect={false}
          autoCapitalize="none"
          spellCheck={false}
          onFocus={() => setActiveField(field)}
          onChangeText={(t) => {
            if (isOrigin) {
              setOriginText(t);
              if (origin) setOrigin(null);
            } else {
              setDestinationText(t);
              if (destination) setDestination(null);
            }
          }}
        />
        {!!stop && <Ionicons name="checkmark-circle" size={18} color={Colors.yonn} />}
      </View>
    );
  };

  const canSearch = !!origin && !!destination && origin.id !== destination.id;
  const listToShow = results.length > 0 ? results : suggestions;
  const listIsSuggestions = results.length === 0 && suggestions.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Itinéraire</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Fermer"
        >
          <Ionicons name="close" size={22} color={Colors.ma} />
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <View style={styles.fieldsCard}>
          {renderField('origin')}
          <View style={styles.fieldSeparator} />
          {renderField('destination')}
        </View>

        {activeField === 'origin' && (
          <TouchableOpacity
            style={styles.myPositionRow}
            onPress={useMyPosition}
            disabled={locatingMe}
          >
            {locatingMe ? (
              <ActivityIndicator size="small" color={Colors.yonn} />
            ) : (
              <Ionicons name="locate" size={16} color={Colors.yonn} />
            )}
            <Text style={styles.myPositionText}>Utiliser ma position</Text>
          </TouchableOpacity>
        )}

        {activeField && listToShow.length > 0 && (
          <View style={styles.resultsList}>
            {listIsSuggestions && <Text style={styles.suggestionsTitle}>Arrêts à proximité du départ</Text>}
            {listToShow.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.resultRow}
                activeOpacity={0.6}
                onPress={() => selectStop(item)}
              >
                <View style={styles.resultIcon}>
                  <Ionicons name="bus" size={16} color={Colors.yonn} />
                </View>
                <Text style={styles.resultText}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!activeField && (
          <>
            <PrimaryButton
              label="Rechercher l'itinéraire"
              onPress={handleSearch}
              disabled={!canSearch}
              loading={loading}
            />

            {outcome !== 'none' && (
              <View style={styles.outcomeWrap}>
                <EmptyState
                  icon={outcome === 'error' ? 'warning' : outcome === 'same-stop' ? 'checkmark-circle' : 'git-branch'}
                  title={
                    outcome === 'error'
                      ? 'Impossible de calculer l’itinéraire'
                      : outcome === 'same-stop'
                        ? 'Tu y es déjà'
                        : 'Aucun itinéraire trouvé'
                  }
                  description={
                    outcome === 'error'
                      ? 'Vérifie ta connexion et réessaie dans un instant.'
                      : outcome === 'same-stop'
                        ? 'Le départ et la destination correspondent au même arrêt.'
                        : 'Ces deux arrêts ne sont pas encore reliés dans le réseau Yonnma.'
                  }
                />
              </View>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.ma,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.pill,
    backgroundColor: Colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  fieldsCard: {
    backgroundColor: Colors.fill,
    borderRadius: Radii.lg,
    paddingVertical: 2,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    height: 52,
    borderRadius: Radii.lg,
  },
  fieldRowActive: {
    backgroundColor: Colors.white,
  },
  fieldSeparator: {
    height: 1,
    backgroundColor: Colors.stoneLight,
    marginHorizontal: Spacing.md,
  },
  fieldDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotOrigin: { backgroundColor: Colors.yonn },
  dotDestination: { backgroundColor: Colors.danger },
  fieldInput: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.ma,
  },
  myPositionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  myPositionText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    color: Colors.yonn,
  },
  resultsList: {
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
    maxHeight: 320,
    overflow: 'hidden',
    padding: Spacing.xs,
  },
  suggestionsTitle: {
    fontFamily: Fonts.bodySemi,
    fontSize: 12,
    color: Colors.stone,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
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
  outcomeWrap: {
    paddingTop: Spacing.xl,
  },
});

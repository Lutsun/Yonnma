// Assistant de navigation — l'état du guidage, recalculé à chaque nouvelle
// position GPS.
//
// Tout est regroupé ici, en fonctions pures : l'écran se contente d'afficher
// ce que `computeNavigation` renvoie. C'est ce qui permet de raisonner sur le
// guidage (avancement des étapes, distance restante, sortie d'itinéraire)
// sans avoir à manipuler la carte.

import { LatLng, TripPlan, TripSegment } from '../types/transit';
import { distanceKm } from '../utils/eta';

// Une étape est considérée franchie près de son point d'arrivée. Le rayon
// suit la précision annoncée par le téléphone : fixe à 45 m, il échouait en
// ville dense, où le GPS dérive souvent de 50 à 80 m entre les immeubles.
const STEP_REACHED_MIN_M = 45;
const STEP_REACHED_MAX_M = 100;
// Arrivée finale — un peu plus large, on veut annoncer l'arrivée avant que
// l'utilisateur soit littéralement sur le panneau.
const DESTINATION_REACHED_MIN_M = 70;
// Au-delà, on considère que l'utilisateur n'est plus sur l'itinéraire.
const OFF_ROUTE_M = 300;
// Un fix moins précis que ça ne permet pas de décider quoi que ce soit : on
// garde l'étape en cours plutôt que d'avancer sur une position douteuse.
const UNRELIABLE_ACCURACY_M = 150;
// Rattrapage : si l'utilisateur est nettement plus près d'une étape suivante
// que de l'étape en cours, c'est qu'un fix a manqué le point de passage
// (fréquent en bus, qui franchit 50 m entre deux positions).
const LOOKAHEAD_NEAR_M = 40;
const LOOKAHEAD_MARGIN_M = 25;

const WALK_SPEED_KMH = 4.5;

export type NavigationStep = {
  // `kind` reste sémantique : c'est l'écran qui choisit l'icône.
  kind: 'walk' | 'ride' | 'arrival';
  title: string;
  detail: string;
  lineCode?: string;
  lineColor?: string;
};

export type NavigationState = {
  /** Étape en cours ; égal à `segments.length` une fois arrivé. */
  stepIndex: number;
  arrived: boolean;
  offRoute: boolean;
  /** Vrai quand le GPS est trop imprécis pour faire avancer le guidage. */
  weakSignal: boolean;
  /** Distance jusqu'au point d'arrivée de l'étape en cours. */
  distanceToNextM: number;
  remainingMinutes: number;
  remainingMeters: number;
  /** Avancement sur l'ensemble du trajet, entre 0 et 1. */
  progress: number;
  instruction: NavigationStep;
};

export function metersBetween(a: LatLng, b: LatLng): number {
  return distanceKm(a.latitude, a.longitude, b.latitude, b.longitude) * 1000;
}

// Distance d'un point à un segment [a, b]. À l'échelle d'une ville, projeter
// les degrés en mètres localement est assez précis et évite de la trigono-
// métrie sphérique inutile.
function distanceToSegmentM(p: LatLng, a: LatLng, b: LatLng): number {
  const latRad = (p.latitude * Math.PI) / 180;
  const mPerDegLat = 111_320;
  const mPerDegLng = 111_320 * Math.cos(latRad);

  const px = (p.longitude - a.longitude) * mPerDegLng;
  const py = (p.latitude - a.latitude) * mPerDegLat;
  const bx = (b.longitude - a.longitude) * mPerDegLng;
  const by = (b.latitude - a.latitude) * mPerDegLat;

  const lengthSq = bx * bx + by * by;
  if (lengthSq === 0) return Math.hypot(px, py);

  // Projection de p sur [a,b], bornée au segment.
  const t = Math.max(0, Math.min(1, (px * bx + py * by) / lengthSq));
  return Math.hypot(px - t * bx, py - t * by);
}

export function distanceToPathM(p: LatLng, path: LatLng[]): number {
  if (path.length === 0) return Infinity;
  if (path.length === 1) return metersBetween(p, path[0]);
  let min = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    min = Math.min(min, distanceToSegmentM(p, path[i], path[i + 1]));
  }
  return min;
}

export function pathLengthM(path: LatLng[]): number {
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) total += metersBetween(path[i], path[i + 1]);
  return total;
}

function endOf(segment: TripSegment): LatLng {
  return segment.path[segment.path.length - 1];
}

function instructionFor(
  segment: TripSegment | undefined,
  destinationName: string,
  distanceToNextM: number
): NavigationStep {
  if (!segment) {
    return { kind: 'arrival', title: 'Tu es arrivé', detail: destinationName };
  }

  if (segment.type === 'ride') {
    return {
      kind: 'ride',
      title: `Descendre à ${segment.alightStopName}`,
      detail:
        distanceToNextM > 900
          ? `Reste dans le bus · ${formatMeters(distanceToNextM)}`
          : `Prépare-toi · ${formatMeters(distanceToNextM)}`,
      lineCode: segment.lineCode,
      lineColor: segment.lineColor,
    };
  }

  return {
    kind: 'walk',
    title: `Marcher jusqu’à ${segment.toStopName}`,
    detail: formatMeters(distanceToNextM),
  };
}

export function formatMeters(m: number): string {
  if (!isFinite(m)) return '—';
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
}

function arrivedState(stepIndex: number, destinationName: string): NavigationState {
  return {
    stepIndex,
    arrived: true,
    offRoute: false,
    weakSignal: false,
    distanceToNextM: 0,
    remainingMinutes: 0,
    remainingMeters: 0,
    progress: 1,
    instruction: instructionFor(undefined, destinationName, 0),
  };
}

/**
 * Recalcule l'état du guidage pour une position donnée.
 *
 * `previousStepIndex` rend l'avancement monotone : une fois une étape
 * franchie on ne revient pas en arrière, même si le GPS fait un écart ou si
 * l'itinéraire repasse près d'un point déjà parcouru.
 *
 * `accuracyM` est le rayon d'incertitude annoncé par le téléphone pour cette
 * position : il élargit les seuils quand le signal est médiocre, et bloque
 * l'avancement quand il est trop mauvais pour être fiable.
 */
export function computeNavigation(
  plan: TripPlan,
  user: LatLng,
  destinationName: string,
  previousStepIndex: number,
  accuracyM: number | null = null
): NavigationState {
  const segments = plan.segments;
  if (segments.length === 0) return arrivedState(0, destinationName);

  const accuracy = accuracyM ?? STEP_REACHED_MIN_M;
  const weakSignal = accuracy > UNRELIABLE_ACCURACY_M;
  const stepRadius = Math.min(STEP_REACHED_MAX_M, Math.max(STEP_REACHED_MIN_M, accuracy));
  const destinationRadius = Math.max(DESTINATION_REACHED_MIN_M, stepRadius);

  const totalMeters = segments.reduce((sum, s) => sum + pathLengthM(s.path), 0);
  const destination = endOf(segments[segments.length - 1]);

  // Arrivée — on ne la déclare jamais sur une position douteuse.
  if (!weakSignal && metersBetween(user, destination) <= destinationRadius) {
    return arrivedState(segments.length, destinationName);
  }

  let index = Math.min(Math.max(0, previousStepIndex), segments.length - 1);

  if (!weakSignal) {
    // 1. Avance tant que le point d'arrivée de l'étape courante est atteint.
    while (index < segments.length && metersBetween(user, endOf(segments[index])) <= stepRadius) {
      index += 1;
    }

    // 2. Rattrapage d'un point de passage manqué entre deux positions. On
    //    retient l'étape suivante la PLUS PROCHE qui convient : sur un trajet
    //    qui repasse près de son départ, prendre la plus lointaine ferait
    //    sauter toute la fin d'un coup.
    if (index < segments.length) {
      const toCurrent = distanceToPathM(user, segments[index].path);
      for (let j = index + 1; j < segments.length; j++) {
        const toLater = distanceToPathM(user, segments[j].path);
        if (toLater <= LOOKAHEAD_NEAR_M && toLater + LOOKAHEAD_MARGIN_M < toCurrent) {
          index = j;
          break;
        }
      }
    }
  }

  if (index >= segments.length) return arrivedState(segments.length, destinationName);

  const current = segments[index];
  const distanceToNextM = metersBetween(user, endOf(current));

  // Restant : ce qu'il reste de l'étape en cours, plus les étapes suivantes.
  const currentLength = pathLengthM(current.path);
  const currentRemaining = Math.min(distanceToNextM, currentLength);
  const later = segments.slice(index + 1);
  const remainingMeters = currentRemaining + later.reduce((sum, s) => sum + pathLengthM(s.path), 0);

  const currentFraction = currentLength > 0 ? currentRemaining / currentLength : 0;
  const remainingMinutes = Math.max(
    1,
    Math.round(current.minutes * currentFraction + later.reduce((sum, s) => sum + s.minutes, 0))
  );

  // Hors itinéraire : loin de l'étape en cours ET de la suivante — sans ça,
  // chaque passage d'une étape à l'autre déclenchait une fausse alerte.
  const next = segments[index + 1];
  const toRoute = Math.min(
    distanceToPathM(user, current.path),
    next ? distanceToPathM(user, next.path) : Infinity
  );
  const offRoute = !weakSignal && toRoute > OFF_ROUTE_M + accuracy;

  return {
    stepIndex: index,
    arrived: false,
    offRoute,
    weakSignal,
    distanceToNextM,
    remainingMinutes,
    remainingMeters,
    progress: totalMeters > 0 ? Math.max(0, Math.min(1, 1 - remainingMeters / totalMeters)) : 0,
    instruction: instructionFor(current, destinationName, distanceToNextM),
  };
}

// Durée de marche estimée pour une distance donnée — sert à annoncer
// « 4 min à pied » sur les étapes piétonnes en cours.
export function walkMinutesFor(meters: number): number {
  return Math.max(1, Math.round((meters / 1000 / WALK_SPEED_KMH) * 60));
}

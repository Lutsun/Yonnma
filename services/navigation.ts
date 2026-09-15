// Assistant de navigation — l'état du guidage, recalculé à chaque nouvelle
// position GPS.
//
// Tout est regroupé ici, en fonctions pures : l'écran se contente d'afficher
// ce que `computeNavigation` renvoie. C'est ce qui permet de raisonner sur le
// guidage (avancement des étapes, distance restante, sortie d'itinéraire)
// sans avoir à manipuler la carte.

import { LatLng, TripPlan, TripSegment } from '../types/transit';
import { distanceKm } from '../utils/eta';

// Une étape est considérée franchie à moins de 45 m de son point d'arrivée :
// assez large pour absorber l'imprécision du GPS en ville, assez serré pour
// ne pas sauter une étape trop tôt.
const STEP_REACHED_M = 45;
// Arrivée finale — un peu plus large, on veut annoncer l'arrivée avant que
// l'utilisateur soit littéralement sur le panneau.
const DESTINATION_REACHED_M = 70;
// Au-delà, on considère que l'utilisateur n'est plus sur l'itinéraire.
const OFF_ROUTE_M = 300;

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

/**
 * Recalcule l'état du guidage pour une position donnée.
 *
 * `previousStepIndex` rend l'avancement monotone : une fois une étape
 * franchie on ne revient pas en arrière, même si le GPS fait un écart ou si
 * l'itinéraire repasse près d'un point déjà parcouru.
 */
export function computeNavigation(
  plan: TripPlan,
  user: LatLng,
  destinationName: string,
  previousStepIndex: number
): NavigationState {
  const segments = plan.segments;
  const totalMeters = segments.reduce((sum, s) => sum + pathLengthM(s.path), 0);

  if (segments.length === 0) {
    return {
      stepIndex: 0,
      arrived: true,
      offRoute: false,
      distanceToNextM: 0,
      remainingMinutes: 0,
      remainingMeters: 0,
      progress: 1,
      instruction: instructionFor(undefined, destinationName, 0),
    };
  }

  const destination = endOf(segments[segments.length - 1]);
  const toDestinationM = metersBetween(user, destination);
  if (toDestinationM <= DESTINATION_REACHED_M) {
    return {
      stepIndex: segments.length,
      arrived: true,
      offRoute: false,
      distanceToNextM: 0,
      remainingMinutes: 0,
      remainingMeters: 0,
      progress: 1,
      instruction: instructionFor(undefined, destinationName, 0),
    };
  }

  // Avance tant que le point d'arrivée de l'étape courante est atteint.
  let index = Math.max(0, previousStepIndex);
  while (index < segments.length && metersBetween(user, endOf(segments[index])) <= STEP_REACHED_M) {
    index += 1;
  }
  if (index >= segments.length) {
    return {
      stepIndex: segments.length,
      arrived: true,
      offRoute: false,
      distanceToNextM: 0,
      remainingMinutes: 0,
      remainingMeters: 0,
      progress: 1,
      instruction: instructionFor(undefined, destinationName, 0),
    };
  }

  const current = segments[index];
  const distanceToNextM = metersBetween(user, endOf(current));

  // Restant : ce qu'il reste de l'étape en cours, plus les étapes suivantes.
  const currentLength = pathLengthM(current.path);
  const currentRemaining = Math.min(distanceToNextM, currentLength);
  const laterMeters = segments.slice(index + 1).reduce((sum, s) => sum + pathLengthM(s.path), 0);
  const remainingMeters = currentRemaining + laterMeters;

  const currentFraction = currentLength > 0 ? currentRemaining / currentLength : 0;
  const laterMinutes = segments.slice(index + 1).reduce((sum, s) => sum + s.minutes, 0);
  const remainingMinutes = Math.max(
    1,
    Math.round(current.minutes * currentFraction + laterMinutes)
  );

  const offRoute = distanceToPathM(user, current.path) > OFF_ROUTE_M;

  return {
    stepIndex: index,
    arrived: false,
    offRoute,
    distanceToNextM,
    remainingMinutes,
    remainingMeters,
    progress: totalMeters > 0 ? Math.min(1, 1 - remainingMeters / totalMeters) : 0,
    instruction: instructionFor(current, destinationName, distanceToNextM),
  };
}

// Durée de marche estimée pour une distance donnée — sert à annoncer
// « 4 min à pied » sur les étapes piétonnes en cours.
export function walkMinutesFor(meters: number): number {
  return Math.max(1, Math.round((meters / 1000 / WALK_SPEED_KMH) * 60));
}

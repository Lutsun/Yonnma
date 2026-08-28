// Planificateur d'itinéraire — la fonctionnalité principale de Yonnma.
//
// Construit un graphe de trajet à partir du réseau complet (toutes les
// lignes et leurs arrêts, voir get_route_graph dans supabase/schema.sql),
// puis calcule le meilleur itinéraire entre deux arrêts avec l'algorithme
// de Dijkstra : quelles lignes prendre, où descendre, où correspondre,
// le temps estimé et le coût estimé.
//
// Simplifications assumées (clairement estimées, pas mesurées) :
//  - vitesse moyenne d'un bus en ville : 16 km/h
//  - vitesse de marche à pied : 4,5 km/h
//  - attente moyenne avant un bus : 6 minutes, comptée à chaque montée
//  - correspondance à pied possible entre deux arrêts distants de 350 m ou moins
//  - chaque ligne dessert ses arrêts dans les deux sens

import { distanceKm } from '../utils/eta';
import { RouteGraphRow, TripPlan, TripSegment } from '../types/transit';

const BUS_SPEED_KMH = 16;
const WALK_SPEED_KMH = 4.5;
const BOARD_WAIT_MINUTES = 6;
const WALK_TRANSFER_RADIUS_KM = 0.35;

type GraphStop = { id: string; name: string; latitude: number; longitude: number };

type RideEdge = {
  kind: 'ride';
  toStopId: string;
  minutes: number;
  lineId: string;
  lineCode: string;
  lineName: string;
  lineColor: string;
  operatorShortName: string;
  fareFcfa: number;
};

type WalkEdge = { kind: 'walk'; toStopId: string; minutes: number };

export type RouteGraph = {
  stops: Map<string, GraphStop>;
  rideEdges: Map<string, RideEdge[]>;
  walkEdges: Map<string, WalkEdge[]>;
};

function addEdge<T>(map: Map<string, T[]>, fromId: string, edge: T) {
  const list = map.get(fromId);
  if (list) list.push(edge);
  else map.set(fromId, [edge]);
}

export function buildRouteGraph(rows: RouteGraphRow[]): RouteGraph {
  const stops = new Map<string, GraphStop>();
  const rideEdges = new Map<string, RideEdge[]>();
  const walkEdges = new Map<string, WalkEdge[]>();

  const byLine = new Map<string, RouteGraphRow[]>();
  for (const row of rows) {
    stops.set(row.stop_id, {
      id: row.stop_id,
      name: row.stop_name,
      latitude: row.latitude,
      longitude: row.longitude,
    });
    const list = byLine.get(row.line_id);
    if (list) list.push(row);
    else byLine.set(row.line_id, [row]);
  }

  for (const lineRows of byLine.values()) {
    lineRows.sort((a, b) => a.sequence - b.sequence);
    for (let i = 0; i < lineRows.length - 1; i++) {
      const a = lineRows[i];
      const b = lineRows[i + 1];
      const km = distanceKm(a.latitude, a.longitude, b.latitude, b.longitude);
      const minutes = Math.max(1, Math.round((km / BUS_SPEED_KMH) * 60));
      const base = {
        kind: 'ride' as const,
        minutes,
        lineId: a.line_id,
        lineCode: a.line_code,
        lineName: a.line_name,
        lineColor: a.line_color || a.operator_color,
        operatorShortName: a.operator_short_name,
        fareFcfa: a.fare_fcfa,
      };
      addEdge(rideEdges, a.stop_id, { ...base, toStopId: b.stop_id });
      addEdge(rideEdges, b.stop_id, { ...base, toStopId: a.stop_id });
    }
  }

  const stopList = Array.from(stops.values());
  for (let i = 0; i < stopList.length; i++) {
    for (let j = i + 1; j < stopList.length; j++) {
      const a = stopList[i];
      const b = stopList[j];
      const km = distanceKm(a.latitude, a.longitude, b.latitude, b.longitude);
      if (km <= WALK_TRANSFER_RADIUS_KM) {
        const minutes = Math.max(1, Math.round((km / WALK_SPEED_KMH) * 60));
        addEdge(walkEdges, a.id, { kind: 'walk', toStopId: b.id, minutes });
        addEdge(walkEdges, b.id, { kind: 'walk', toStopId: a.id, minutes });
      }
    }
  }

  return { stops, rideEdges, walkEdges };
}

type PathEdge = (RideEdge | WalkEdge) & { fromStopId: string };

function stateKey(stopId: string, lineId: string | null) {
  return `${stopId}::${lineId ?? ''}`;
}

// Dijkstra sur un espace d'états (arrêt, ligne actuellement empruntée) pour
// facturer l'attente d'une nouvelle ligne une seule fois par correspondance,
// pas à chaque arrêt intermédiaire.
function findShortestPath(
  graph: RouteGraph,
  originStopId: string,
  destinationStopId: string
): PathEdge[] | null {
  if (originStopId === destinationStopId) return [];

  const dist = new Map<string, number>();
  const prev = new Map<string, { key: string; edge: PathEdge }>();
  const visited = new Set<string>();

  const startKey = stateKey(originStopId, null);
  dist.set(startKey, 0);

  // File de priorité simple (le réseau reste petit — quelques dizaines
  // d'arrêts — donc une recherche linéaire du minimum est amplement assez
  // rapide, sans dépendance externe).
  const queue = new Set<string>([startKey]);

  while (queue.size > 0) {
    let currentKey: string | null = null;
    let currentDist = Infinity;
    for (const key of queue) {
      const d = dist.get(key)!;
      if (d < currentDist) {
        currentDist = d;
        currentKey = key;
      }
    }
    if (currentKey === null) break;
    queue.delete(currentKey);
    if (visited.has(currentKey)) continue;
    visited.add(currentKey);

    const [stopId, lineId] = currentKey.split('::');
    const currentLineId = lineId || null;

    if (stopId === destinationStopId) {
      const path: PathEdge[] = [];
      let key: string | undefined = currentKey;
      while (key && key !== startKey) {
        const step = prev.get(key);
        if (!step) break;
        path.unshift(step.edge);
        key = step.key;
      }
      return path;
    }

    for (const edge of graph.rideEdges.get(stopId) ?? []) {
      const wait = currentLineId === edge.lineId ? 0 : BOARD_WAIT_MINUTES;
      const newDist = currentDist + edge.minutes + wait;
      const newKey = stateKey(edge.toStopId, edge.lineId);
      if (newDist < (dist.get(newKey) ?? Infinity)) {
        dist.set(newKey, newDist);
        prev.set(newKey, { key: currentKey, edge: { ...edge, minutes: edge.minutes + wait, fromStopId: stopId } });
        queue.add(newKey);
      }
    }

    for (const edge of graph.walkEdges.get(stopId) ?? []) {
      const newDist = currentDist + edge.minutes;
      const newKey = stateKey(edge.toStopId, null);
      if (newDist < (dist.get(newKey) ?? Infinity)) {
        dist.set(newKey, newDist);
        prev.set(newKey, { key: currentKey, edge: { ...edge, fromStopId: stopId } });
        queue.add(newKey);
      }
    }
  }

  return null;
}

function coordOf(graph: RouteGraph, stopId: string) {
  const stop = graph.stops.get(stopId);
  return { latitude: stop?.latitude ?? 0, longitude: stop?.longitude ?? 0 };
}

function segmentsFromPath(graph: RouteGraph, path: PathEdge[]): TripSegment[] {
  const segments: TripSegment[] = [];

  for (const edge of path) {
    const last = segments[segments.length - 1];

    if (edge.kind === 'ride') {
      if (last?.type === 'ride' && last.lineId === edge.lineId) {
        last.alightStopId = edge.toStopId;
        last.alightStopName = graph.stops.get(edge.toStopId)?.name ?? '';
        last.stopsCount += 1;
        last.minutes += edge.minutes;
        last.path.push(coordOf(graph, edge.toStopId));
        continue;
      }
      segments.push({
        type: 'ride',
        lineId: edge.lineId,
        lineCode: edge.lineCode,
        lineName: edge.lineName,
        lineColor: edge.lineColor,
        operatorShortName: edge.operatorShortName,
        fareFcfa: edge.fareFcfa,
        boardStopId: edge.fromStopId,
        boardStopName: graph.stops.get(edge.fromStopId)?.name ?? '',
        alightStopId: edge.toStopId,
        alightStopName: graph.stops.get(edge.toStopId)?.name ?? '',
        stopsCount: 1,
        minutes: edge.minutes,
        path: [coordOf(graph, edge.fromStopId), coordOf(graph, edge.toStopId)],
      });
    } else {
      if (last?.type === 'walk') {
        last.toStopId = edge.toStopId;
        last.toStopName = graph.stops.get(edge.toStopId)?.name ?? '';
        last.minutes += edge.minutes;
        last.path.push(coordOf(graph, edge.toStopId));
        continue;
      }
      segments.push({
        type: 'walk',
        fromStopId: edge.fromStopId,
        fromStopName: graph.stops.get(edge.fromStopId)?.name ?? '',
        toStopId: edge.toStopId,
        toStopName: graph.stops.get(edge.toStopId)?.name ?? '',
        minutes: edge.minutes,
        path: [coordOf(graph, edge.fromStopId), coordOf(graph, edge.toStopId)],
      });
    }
  }

  return segments;
}

// Calcule le meilleur itinéraire (le plus rapide) entre deux arrêts connus.
// Renvoie `null` si aucun chemin n'existe entre les deux dans le réseau
// actuel (arrêts non reliés, même indirectement).
export function planTrip(
  graph: RouteGraph,
  originStopId: string,
  destinationStopId: string
): TripPlan | null {
  const path = findShortestPath(graph, originStopId, destinationStopId);
  if (path === null) return null;
  if (path.length === 0) return { totalMinutes: 0, totalFareFcfa: 0, segments: [] };

  const segments = segmentsFromPath(graph, path);
  const totalMinutes = path.reduce((sum, edge) => sum + edge.minutes, 0);
  const totalFareFcfa = segments
    .filter((s): s is Extract<TripSegment, { type: 'ride' }> => s.type === 'ride')
    .reduce((sum, s) => sum + s.fareFcfa, 0);

  return { totalMinutes, totalFareFcfa, segments };
}

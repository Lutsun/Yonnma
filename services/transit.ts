import { supabase } from './supabase';
import { Line, Operator, Stop } from '../types/transit';

export async function getOperators(): Promise<Operator[]> {
  const { data, error } = await supabase.from('operators').select('*');
  if (error) throw error;
  return data;
}

export async function getLines(): Promise<Line[]> {
  const { data, error } = await supabase.from('lines').select('*');
  if (error) throw error;
  return data;
}

export async function getLineStops(lineId: string): Promise<Stop[]> {
  const { data, error } = await supabase
    .from('line_stops')
    .select('sequence, stops(id, name, location)')
    .eq('line_id', lineId)
    .order('sequence');
  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.stops.id,
    name: row.stops.name,
    latitude: row.stops.location.coordinates[1],
    longitude: row.stops.location.coordinates[0],
  }));
}

// Arrêts les plus proches d'un point (position de l'utilisateur), via la
// fonction PostGIS `nearby_stops` définie dans supabase/schema.sql.
export async function getNearbyStops(
  latitude: number,
  longitude: number,
  radiusMeters = 1500
): Promise<Stop[]> {
  const { data, error } = await supabase.rpc('nearby_stops', {
    lat: latitude,
    lng: longitude,
    radius_meters: radiusMeters,
  });
  if (error) throw error;
  return data;
}

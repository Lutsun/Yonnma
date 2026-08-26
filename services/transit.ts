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

// Arrêts d'une ligne, dans l'ordre, via la fonction PostGIS
// `get_line_stops` définie dans supabase/schema.sql.
export async function getLineStops(lineId: string): Promise<Stop[]> {
  const { data, error } = await supabase.rpc('get_line_stops', { p_line_id: lineId });
  if (error) throw error;
  return data;
}

// Recherche d'arrêts par nom, via la fonction PostGIS `search_stops`
// définie dans supabase/schema.sql.
export async function searchStops(query: string): Promise<Stop[]> {
  if (!query.trim()) return [];
  const { data, error } = await supabase.rpc('search_stops', { query: query.trim() });
  if (error) throw error;
  return data;
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

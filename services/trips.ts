import { supabase } from './supabase';
import { Trip } from '../types/transit';

export async function getSavedTrips(userId: string): Promise<Trip[]> {
  const { data, error } = await supabase
    .from('user_trips')
    .select('id, origin_label, destination_label, is_saved, created_at')
    .eq('user_id', userId)
    .eq('is_saved', true)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    originLabel: row.origin_label,
    destinationLabel: row.destination_label,
    isSaved: row.is_saved,
    createdAt: row.created_at,
  }));
}

export async function saveTrip(params: {
  userId: string;
  originLabel: string;
  originLatitude: number;
  originLongitude: number;
  destinationLabel: string;
  destinationLatitude: number;
  destinationLongitude: number;
}): Promise<void> {
  const { error } = await supabase.rpc('save_trip', {
    p_user_id: params.userId,
    p_origin_label: params.originLabel,
    p_origin_lat: params.originLatitude,
    p_origin_lng: params.originLongitude,
    p_destination_label: params.destinationLabel,
    p_destination_lat: params.destinationLatitude,
    p_destination_lng: params.destinationLongitude,
  });
  if (error) throw error;
}

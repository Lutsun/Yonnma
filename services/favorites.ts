import { supabase } from './supabase';
import { Line, Operator } from '../types/transit';

export type FavoriteLine = Line & { operator: Pick<Operator, 'name' | 'color'> };

export async function getFavoriteLines(userId: string): Promise<FavoriteLine[]> {
  const { data, error } = await supabase
    .from('favorite_lines')
    .select('lines(id, operator_id, code, name, color, operators(name, color))')
    .eq('user_id', userId);
  if (error) throw error;

  return (data ?? [])
    .map((row: any) => row.lines)
    .filter(Boolean)
    .map((line: any) => ({
      id: line.id,
      operator_id: line.operator_id,
      code: line.code,
      name: line.name,
      color: line.color,
      operator: { name: line.operators?.name ?? '', color: line.operators?.color ?? '' },
    }));
}

export async function getFavoriteLineIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('favorite_lines')
    .select('line_id')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((row) => row.line_id);
}

export async function addFavoriteLine(userId: string, lineId: string): Promise<void> {
  const { error } = await supabase
    .from('favorite_lines')
    .insert({ user_id: userId, line_id: lineId });
  if (error) throw error;
}

export async function removeFavoriteLine(userId: string, lineId: string): Promise<void> {
  const { error } = await supabase
    .from('favorite_lines')
    .delete()
    .eq('user_id', userId)
    .eq('line_id', lineId);
  if (error) throw error;
}

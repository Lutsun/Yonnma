export type Operator = {
  id: string;
  name: string;
  short_name: string;
  color: string;
};

export type Line = {
  id: string;
  operator_id: string;
  code: string;
  name: string;
  color: string | null;
};

export type Stop = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance_meters?: number;
  lines?: string[];
};

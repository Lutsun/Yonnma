import React, { createContext, useContext, useMemo, useState } from 'react';
import { Stop, TripPlan } from '../types/transit';

// Trajet actuellement affiché sur la carte d'accueil, calculé par le
// planificateur d'itinéraire (app/(modals)/itinerary.tsx). Un contexte
// simple suffit : un seul trajet actif à la fois, partagé entre l'écran
// de recherche et la carte qui l'affiche.
export type ActiveTrip = {
  origin: Stop;
  destination: Stop;
  plan: TripPlan;
};

type TripContextValue = {
  activeTrip: ActiveTrip | null;
  setActiveTrip: (trip: ActiveTrip) => void;
  clearActiveTrip: () => void;
};

const TripContext = createContext<TripContextValue | undefined>(undefined);

export function TripProvider({ children }: { children: React.ReactNode }) {
  const [activeTrip, setActiveTripState] = useState<ActiveTrip | null>(null);

  const value = useMemo<TripContextValue>(
    () => ({
      activeTrip,
      setActiveTrip: (trip) => setActiveTripState(trip),
      clearActiveTrip: () => setActiveTripState(null),
    }),
    [activeTrip]
  );

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTrip() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error('useTrip must be used within a TripProvider');
  return ctx;
}

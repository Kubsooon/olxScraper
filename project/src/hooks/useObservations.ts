import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Observation } from '../types';
import { fetchOffersForObservation, createObservation, deleteObservation, fetchAllObservations } from '../services/olxService';

export const useObservations = () => {
  const {
    data: fetchedObservations = [],
    isLoading,
    refetch,
  } = useQuery<Observation[]>({
    queryKey: ['observations'],
    queryFn: fetchAllObservations,
    staleTime: 60 * 1000, // 1 minute
  });

  // Local state so we can freely reorder observations without forcing a refetch
  const [observations, setObservations] = useState<Observation[]>([]);

  // Keep local state in sync with server data whenever it changes
  useEffect(() => {
    setObservations(fetchedObservations);
  }, [fetchedObservations]);

  const addObservation = async (observationData: any) => {
    // Check if observation with same parameters and category already exists
    const exists = observations.some(
      (obs) =>
        obs.categoryId === observationData.categoryId &&
        Object.keys(observationData).every(key => key === 'categoryId' || (obs as any)[key] === observationData[key])
    );
    if (exists) {
      return { success: false, message: 'This observation already exists' };
    }
    await createObservation(observationData);
    await refetch();
    return { success: true };
  };

  const removeObservation = async (id: string) => {
    await deleteObservation(id);
    await refetch();
  };

  const refreshObservation = async (id: string) => {
    const obs = observations.find((o) => o.id === id);
    if (!obs) return;
    await fetchOffersForObservation(obs);
    await refetch();
  };

  const refreshAllObservations = async () => {
    await Promise.all(observations.map(obs => fetchOffersForObservation(obs)));
    await refetch();
  };

  const loadObservations = refetch;

  return {
    observations,
    isLoading,
    addObservation,
    removeObservation,
    refreshObservation,
    refreshAllObservations,
    loadObservations,
    setObservations,
  };
};
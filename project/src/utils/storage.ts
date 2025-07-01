import { Observation } from '../types';

const STORAGE_KEY = 'olx-offer-tracker-observations';

export const saveObservations = (observations: Observation[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(observations));
};

export const getObservations = (): Observation[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
};
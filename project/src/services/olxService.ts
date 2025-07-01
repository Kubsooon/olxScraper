import { Observation, Offer } from '../types';

const API_URL = 'http://localhost:5000/api';

export const fetchOffersForObservation = async (observation: Observation): Promise<Offer[]> => {
  try {
    const response = await fetch(`${API_URL}/observations/${observation.id}/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch offers');
    }
    
    const data = await response.json();
    return data.offers;
  } catch (error) {
    console.error('Error fetching offers:', error);
    return [];
  }
};

export const createObservation = async (observationData: any) => {
  try {
    const response = await fetch(`${API_URL}/observations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(observationData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create observation');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating observation:', error);
    throw error;
  }
};

export const deleteObservation = async (id: string) => {
  try {
    const response = await fetch(`${API_URL}/observations/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete observation');
    }
  } catch (error) {
    console.error('Error deleting observation:', error);
    throw error;
  }
};

export const fetchCategories = async () => {
  const response = await fetch('/elektronika_kat.json');
  if (!response.ok) {
    throw new Error('Failed to fetch categories');
  }
  return response.json();
};

export const fetchPatternFilters = async () => {
  const response = await fetch('/pattern.json');
  if (!response.ok) {
    throw new Error('Failed to fetch pattern.json');
  }
  const pattern = await response.json();
  const offer = pattern.data[0];
  const filters: { key: string, label: string }[] = [];

  // Top-level fields (except 'params')
  for (const key in offer) {
    if (key === 'params') continue;
    filters.push({ key, label: key });
  }

  // Params section
  if (Array.isArray(offer.params)) {
    for (const param of offer.params) {
      filters.push({
        key: `params.${param.key}`,
        label: param.name || param.key
      });
    }
  }

  return filters;
};

export const fetchSampleOffers = async (categoryId: string) => {
  const response = await fetch(`/api/sample-offers?categoryId=${categoryId}`);
  if (!response.ok) throw new Error('Failed to fetch sample offers');
  return response.json();
};

export const fetchCategoryFilters = async (categoryId: string) => {
  const response = await fetch(`/api/category-filters?categoryId=${categoryId}`);
  if (!response.ok) throw new Error('Failed to fetch category filters');
  const data = await response.json();
  return data.filters;
};

export const updateObservation = async (id: string, data: any) => {
  const response = await fetch(`/api/observations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update observation');
  return response.json();
};

export const fetchAllObservations = async () => {
  const response = await fetch('/api/observations');
  if (!response.ok) throw new Error('Failed to fetch observations');
  return response.json();
};

export const fetchObservationById = async (id: string) => {
  const response = await fetch(`/api/observations/${id}`);
  if (!response.ok) throw new Error('Failed to fetch observation');
  return response.json();
};
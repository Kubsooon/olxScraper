export interface Offer {
  id: string;
  title: string;
  url: string;
  price: string;
  imageUrl?: string;
  timestamp: number;
  isNew?: boolean;
  lastRefreshTime?: string;
}

export interface Observation {
  id: string;
  categoryId: string;
  [key: string]: string | Offer[] | number; // Allow dynamic filter fields
  offers: Offer[];
  lastChecked: number;
}


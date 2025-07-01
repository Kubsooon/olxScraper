import React from 'react';
import { Observation } from '../types';
import { X, RefreshCw, Pencil, GripVertical } from 'lucide-react';
import OfferItem from './OfferItem';

interface ObservationCardProps {
  observation: Observation;
  onRemove: (id: string) => void;
  onRefresh: (id: string) => Promise<void>;
  isLoading: boolean;
  onEdit: (observation: Observation) => void;
}

const ObservationCard: React.FC<ObservationCardProps> = ({
  observation,
  onRemove,
  onRefresh,
  isLoading,
  onEdit,
}) => {
  const formatLastChecked = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleRefresh = (e: React.MouseEvent) => {
    e.preventDefault();
    onRefresh(observation.id);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.confirm('Are you sure you want to remove this observation?')) {
      onRemove(observation.id);
    }
  };

  const newOffersCount = observation.offers.filter(offer => offer.isNew).length;

  // Calculate average price
  const numericPrices = observation.offers
    .map(o => {
      const match = String(o.price).replace(/\s/g, '').match(/([\d,.]+)/);
      return match ? parseFloat(match[1].replace(',', '.')) : null;
    })
    .filter((p): p is number => typeof p === 'number' && !isNaN(p));
  const avgPrice = numericPrices.length > 0
    ? Math.round(numericPrices.reduce((a, b) => a + b, 0) / numericPrices.length)
    : null;

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden transition-all duration-200 hover:shadow-md">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <GripVertical className="h-5 w-5 text-gray-400 cursor-move" />
          <div>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(observation)
                .filter(([key]) => !['id', 'offers', 'lastChecked'].includes(key))
                .map(([key, value]) => (
                  <span key={key} className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-0.5 rounded">
                    {key}: {String(value)}
                  </span>
                ))}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            className="p-1 rounded-full text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleRemove}
            className="p-1 rounded-full text-gray-400 hover:text-red-500 dark:hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            onClick={() => onEdit(observation)}
            className="p-1 rounded-full text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Pencil className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 text-xs flex justify-between items-center">
        <div className="flex items-center gap-4">
          <span className="font-medium text-gray-900 dark:text-gray-100">{observation.offers.length} offers</span>
          {avgPrice !== null && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
              Avg: {avgPrice} zł
            </span>
          )}
          {newOffersCount > 0 && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
              {newOffersCount} new
            </span>
          )}
        </div>
        <div className="text-gray-500 dark:text-gray-400">
          Last checked: {formatLastChecked(observation.lastChecked)}
        </div>
      </div>
      <div className="max-h-[48rem] overflow-y-auto p-4">
        {observation.offers.length > 0 ? (
          observation.offers.map((offer) => (
            <OfferItem key={offer.id} offer={offer} avgPrice={avgPrice ?? undefined} />
          ))
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400 py-4">No offers found</p>
        )}
      </div>
    </div>
  );
};

export default ObservationCard;
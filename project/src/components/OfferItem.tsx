import React from 'react';
import { Offer } from '../types';
import { ExternalLink } from 'lucide-react';

interface OfferItemProps {
  offer: Offer;
  avgPrice?: number;
}

const OfferItem: React.FC<OfferItemProps> = ({ offer, avgPrice }) => {
  // Extract numeric price
  const match = String(offer.price).replace(/\s/g, '').match(/([\d,.]+)/);
  const priceNum = match ? parseFloat(match[1].replace(',', '.')) : null;
  const isLowPrice = avgPrice && priceNum && priceNum < avgPrice * 0.85;

  return (
    <div 
      className={`p-3 border rounded-md mb-2 transition-all duration-200 hover:shadow-md ${
        offer.isNew ? 'border-green-200 bg-green-50 animate-fade-slide-in' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start space-x-3">
        {offer.imageUrl && (
          <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md">
            <img 
              src={offer.imageUrl} 
              alt={offer.title} 
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center gap-2">
            <p className="text-sm font-medium text-gray-900 truncate">
              {offer.title}
            </p>
            <div className="flex flex-col gap-1 items-end min-w-[3.5rem]">
              {offer.isNew && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 w-12 justify-center">
                  New
                </span>
              )}
              {isLowPrice && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 w-12 justify-center">
                  Low
                </span>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Price: <span className="font-medium">{offer.price}</span>
          </p>
          <div className="mt-1">
            <a
              href={offer.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800"
            >
              View on OLX
              <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </div>
          {/* Show lastRefreshTime from OLX if present */}
          {offer.lastRefreshTime && (
            <p className="text-xs text-gray-400 mt-1">
              Ostatnie odświeżenie: {new Date(offer.lastRefreshTime).toLocaleString(undefined, { hour12: false })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfferItem;
import React, { useEffect, useState } from 'react';
import { fetchCategoryFilters } from '../services/olxService';
import KeywordChipsInput from './KeywordChipsInput';

interface EditObservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  observation: any;
  onSave: (fields: any) => void;
}

const EditObservationModal: React.FC<EditObservationModalProps> = ({ isOpen, onClose, observation, onSave }) => {
  if (!isOpen || !observation) return null;

  const [categoryFilters, setCategoryFilters] = useState<any[]>([]);
  const [fields, setFields] = useState<any>({ ...observation });
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);

  useEffect(() => {
    if (observation && observation.categoryId) {
      fetchCategoryFilters(observation.categoryId).then((filters) => {
        setCategoryFilters(filters);
        // If price filter exists, set slider range
        const priceFilter = filters.find((f: any) => f.key === 'price');
        if (priceFilter && priceFilter.values && priceFilter.values.length > 0) {
          // Try to get min/max from values
          const values = priceFilter.values.map((v: any) => parseInt(v.value, 10)).filter((v: number) => !isNaN(v));
          if (values.length > 1) {
            setPriceRange([Math.min(...values), Math.max(...values)]);
          }
        }
        // Only keep filter fields and categoryId and keywords
        const filterKeys = filters.map((f: any) => f.key).concat(['categoryId', 'keywords']);
        const filterFields = Object.fromEntries(
          Object.entries(observation).filter(([k]) => filterKeys.includes(k))
        );
        setFields(filterFields);
      });
    }
  }, [observation]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-lg relative">
        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" onClick={onClose}>&times;</button>
        <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Edit Observation</h2>
        <div className="space-y-4">
          {/* Category (disabled) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
            <input type="text" value={fields.categoryId} disabled className="w-full p-2 border rounded bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" />
          </div>
          {/* Keywords input */}
          <div>
            <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Keywords (title/description search)
            </label>
            <KeywordChipsInput
              value={fields.keywords || ''}
              onChange={val => setFields({ ...fields, keywords: val })}
              placeholder="e.g. iPhone 13; Samsung; Xiaomi Note"
            />
          </div>
          {/* Dynamic filters only, no Model/Memory/Condition */}
          {categoryFilters.map((filter: any, idx: number) => (
            filter.key === 'price' ? (
              // Only render the slider for the first price filter
              idx !== categoryFilters.findIndex((f: any) => f.key === 'price') ? null : (
                <div key={filter.key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{filter.label}</label>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Min:</span>
                      <input
                        type="range"
                        min={priceRange[0]}
                        max={priceRange[1]}
                        step={1}
                        value={fields.priceMin ?? priceRange[0]}
                        onChange={e => {
                          const min = Number(e.target.value);
                          setFields({
                            ...fields,
                            priceMin: min > (fields.priceMax ?? priceRange[1]) ? fields.priceMax ?? priceRange[1] : min
                          });
                        }}
                        className="flex-1"
                      />
                      <span className="w-12 text-right text-xs">{fields.priceMin ?? priceRange[0]} zł</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Max:</span>
                      <input
                        type="range"
                        min={priceRange[0]}
                        max={priceRange[1]}
                        step={1}
                        value={fields.priceMax ?? priceRange[1]}
                        onChange={e => {
                          const max = Number(e.target.value);
                          setFields({
                            ...fields,
                            priceMax: max < (fields.priceMin ?? priceRange[0]) ? fields.priceMin ?? priceRange[0] : max
                          });
                        }}
                        className="flex-1"
                      />
                      <span className="w-12 text-right text-xs">{fields.priceMax === priceRange[1] || fields.priceMax == null ? '∞' : `${fields.priceMax} zł`}</span>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div key={filter.key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{filter.label}</label>
                <select
                  value={fields[filter.key] || ''}
                  onChange={e => setFields({ ...fields, [filter.key]: e.target.value })}
                  className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                >
                  <option value="">Wybierz...</option>
                  {filter.values && filter.values.length > 0 ? (
                    filter.values.map((val: any) => (
                      <option key={val.value} value={val.value}>{val.label}</option>
                    ))
                  ) : (
                    <option value="" disabled>Brak wartości</option>
                  )}
                </select>
              </div>
            )
          ))}
        </div>
        <div className="flex justify-end mt-6 gap-2">
          <button className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600" onClick={onClose}>Cancel</button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => onSave(fields)}>Save</button>
        </div>
      </div>
    </div>
  );
};

export default EditObservationModal; 
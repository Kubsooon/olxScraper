import React, { useState, useEffect } from 'react';
import { PlusCircle } from 'lucide-react';
import { fetchCategories, fetchCategoryFilters } from '../services/olxService';
import KeywordChipsInput from './KeywordChipsInput';
import { useQuery } from '@tanstack/react-query';

interface FilterFormProps {
  onAddObservation: (filters: Record<string, any>) => Promise<any>;
  isLoading: boolean;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  filterValues: any;
  setFilterValues: (vals: any) => void;
}

const FilterForm: React.FC<FilterFormProps> = ({ onAddObservation, isLoading, selectedCategory, setSelectedCategory, filterValues, setFilterValues }) => {
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    fetchCategories().then((data) => setCategories([data]));
  }, []);

  // Helper to flatten categories for a flat <option> list
  const flattenCategories = (cats: any[], depth = 0): { id: string, name: string }[] => {
    return cats.flatMap((cat) => [
      { id: String(cat.id), name: `${'— '.repeat(depth)}${cat.name}` },
      ...(cat.subcategories && cat.subcategories.length > 0 ? flattenCategories(cat.subcategories, depth + 1) : [])
    ]);
  };
  const flatCategoryOptions = flattenCategories(categories);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;
    const observationData = {
      ...filterValues,
      categoryId: selectedCategory,
    };
    await onAddObservation(observationData);
  };

  // Helper to find category name by id
  function getCategoryNameById(categories: any[], id: string): string {
    for (const cat of categories) {
      if (String(cat.id) === id) return cat.name;
      if (cat.subcategories && cat.subcategories.length > 0) {
        const found = getCategoryNameById(cat.subcategories, id);
        if (found) return found;
      }
    }
    return '';
  }

  // React Query for category filters
  const { data: categoryFilters = [], isLoading: filtersLoading, refetch: refetchFilters } = useQuery({
    queryKey: ['categoryFilters', selectedCategory],
    queryFn: () => fetchCategoryFilters(selectedCategory),
    enabled: !!selectedCategory,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Handler for Pobierz filtry
  const handleFetchFilters = async () => {
    if (!selectedCategory) return;
    await refetchFilters();
    setFilterValues({});
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      {/* Category Dropdown and Pobierz filtry button */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex-1">
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            id="category"
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              // Clear previously chosen filter values when switching category
              setFilterValues({});
            }}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
            disabled={isLoading || categories.length === 0}
          >
            <option value="">Select Category</option>
            {flatCategoryOptions.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="ml-2 px-4 py-2 bg-blue-500 text-white rounded shadow hover:bg-blue-600 disabled:bg-gray-300"
          disabled={!selectedCategory}
          onClick={handleFetchFilters}
        >
          Pobierz filtry
        </button>
      </div>
      {/* Keywords input */}
      <div>
        <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 mb-1">
          Keywords (title/description search)
        </label>
        <KeywordChipsInput
          value={filterValues.keywords || ''}
          onChange={val => setFilterValues({ ...filterValues, keywords: val })}
          placeholder="e.g. iPhone 13; Samsung; Xiaomi Note"
          disabled={isLoading}
        />
      </div>
      {/* Render filter dropdowns for category filters */}
      {categoryFilters && categoryFilters.length > 0 && (
        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {categoryFilters.map((filter: any) => (
            filter.key === 'price' ? (
              <div key={filter.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{filter.label}</label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Min:</span>
                    <input
                      type="range"
                      min={0}
                      max={10000}
                      step={1}
                      value={filterValues.priceMin ?? 0}
                      onChange={e => {
                        const min = Number(e.target.value);
                        setFilterValues({
                          ...filterValues,
                          priceMin: min > (filterValues.priceMax ?? 10000) ? filterValues.priceMax ?? 10000 : min
                        });
                      }}
                      className="flex-1"
                    />
                    <span className="w-12 text-right text-xs">{filterValues.priceMin ?? 0} zł</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Max:</span>
                    <input
                      type="range"
                      min={0}
                      max={10000}
                      step={1}
                      value={filterValues.priceMax ?? 10000}
                      onChange={e => {
                        const max = Number(e.target.value);
                        setFilterValues({
                          ...filterValues,
                          priceMax: max < (filterValues.priceMin ?? 0) ? filterValues.priceMin ?? 0 : max
                        });
                      }}
                      className="flex-1"
                    />
                    <span className="w-12 text-right text-xs">{filterValues.priceMax === 10000 || filterValues.priceMax == null ? '∞' : `${filterValues.priceMax} zł`}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div key={filter.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{filter.label}</label>
                <select
                  value={filterValues[filter.key] || ''}
                  onChange={e => setFilterValues({ ...filterValues, [filter.key]: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                  disabled={isLoading || !filter.values || filter.values.length === 0}
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
      )}
      <h2 className="text-lg font-medium text-gray-900 mb-4">
        {selectedCategory && categories.length > 0
          ? `Śledź nowe ogłoszenia dla kategorii ${getCategoryNameById(categories, selectedCategory)}`
          : 'Śledź nowe ogłoszenia dla kategorii'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
       

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            disabled={isLoading}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            {isLoading ? 'Adding...' : 'Start Tracking'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FilterForm;
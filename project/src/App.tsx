import { useState, useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import FilterForm from './components/FilterForm';
import Dashboard from './components/Dashboard';
import { useObservations } from './hooks/useObservations';
import PriceHistoryPage from './components/PriceHistoryPage';

const DEFAULT_REFRESH_INTERVAL = 5 * 60_000;

function App() {
  const {
    observations,
    isLoading,
    addObservation,
    removeObservation,
    refreshObservation,
    refreshAllObservations,
    loadObservations,
    setObservations
  } = useObservations();

  // Filter state moved up
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categoryFilters, setCategoryFilters] = useState<any[]>([]);
  const [filterValues, setFilterValues] = useState<any>({});

  // Auto-refresh interval state
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(() => {
    const saved = localStorage.getItem('autoRefreshInterval');
    return saved ? Number(saved) : DEFAULT_REFRESH_INTERVAL;
  });
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    console.log('Interval effect triggered with:', {
      autoRefreshInterval,
      observationsCount: observations.length
    });
    
    localStorage.setItem('autoRefreshInterval', String(autoRefreshInterval));
    
    // Clear any existing interval
    if (intervalRef.current) {
      console.log('Clearing existing interval:', intervalRef.current);
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Only set up interval if we have observations
    if (observations.length > 0) {
      console.log(`Setting up new interval: ${autoRefreshInterval}ms`);
      const newIntervalId = window.setInterval(() => {
        console.log('Auto-refresh triggered at:', new Date().toISOString());
        refreshAllObservations();
      }, autoRefreshInterval);
      
      intervalRef.current = newIntervalId;
      console.log('New interval set:', newIntervalId);
    }

    return () => {
      if (intervalRef.current) {
        console.log('Cleaning up interval:', intervalRef.current);
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefreshInterval, refreshAllObservations]);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header autoRefreshInterval={autoRefreshInterval} onIntervalChange={setAutoRefreshInterval} />
        <main className="max-w-[100rem] mx-auto px-4 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={
              <div className="py-6">
                <FilterForm
                  onAddObservation={addObservation}
                  isLoading={isLoading}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  categoryFilters={categoryFilters}
                  setCategoryFilters={setCategoryFilters}
                  filterValues={filterValues}
                  setFilterValues={setFilterValues}
                />
                <Dashboard
                  observations={observations}
                  onRemoveObservation={removeObservation}
                  onRefreshObservation={refreshObservation}
                  onRefreshAll={refreshAllObservations}
                  isLoading={isLoading}
                  loadObservations={loadObservations}
                  setObservations={setObservations}
                />
              </div>
            } />
            <Route path="/price-history" element={<PriceHistoryPage />} />
          </Routes>
        </main>
        <footer className="bg-white border-t border-gray-200 py-4">
          <div className="max-w-[100rem] mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-center text-sm text-gray-500">
              OLX Offer Tracker &copy; {new Date().getFullYear()} - Automatically refreshes hourly
            </p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
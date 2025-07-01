import React, { useState } from 'react';
import HelpModal from './HelpModal';
import { Info, LineChart, List } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const REFRESH_OPTIONS = [
  { label: '1 min', value: 60_000 },
  { label: '5 min', value: 5 * 60_000 },
  { label: '15 min', value: 15 * 60_000 },
  { label: '30 min', value: 30 * 60_000 },
  { label: '1 h', value: 60 * 60_000 },
  { label: '4 h', value: 4 * 60 * 60_000 },
  { label: '24 h', value: 24 * 60 * 60_000 },
];

interface HeaderProps {
  autoRefreshInterval: number;
  onIntervalChange: (interval: number) => void;
}

const Header: React.FC<HeaderProps> = ({ autoRefreshInterval, onIntervalChange }) => {
  const [helpOpen, setHelpOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const onChartPage = location.pathname.startsWith('/price-history');
  return (
    <header className="bg-white shadow">
      <div className="max-w-[100rem] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <h1 className="text-xl font-semibold text-gray-900">OLX Offer Tracker</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(onChartPage ? '/' : '/price-history')}
              className="p-1 rounded-full border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-400"
              title={onChartPage ? 'Go to Observations' : 'Go to Price History'}
              aria-label={onChartPage ? 'Go to Observations' : 'Go to Price History'}
            >
              {onChartPage ? <List className="h-5 w-5" /> : <LineChart className="h-5 w-5" />}
            </button>
            <button
              type="button"
              className="p-1 rounded-full border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-400"
              title="Help & Info"
              onClick={() => setHelpOpen(true)}
              aria-label="Show help"
            >
              <Info className="h-5 w-5" />
            </button>
            <label htmlFor="refresh-interval" className="text-sm text-gray-700">Auto-refresh:</label>
            <select
              id="refresh-interval"
              value={autoRefreshInterval}
              onChange={e => onIntervalChange(Number(e.target.value))}
              className="border rounded px-2 py-1 text-sm"
            >
              {REFRESH_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </header>
  );
};

export default Header;
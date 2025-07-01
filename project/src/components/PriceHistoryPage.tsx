import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { List } from 'lucide-react';

interface Observation {
  id: string;
  categoryId: string;
  [key: string]: any;
}

interface Offer {
  id: string;
  last_refresh_time: string;
  title: string;
  description: string;
  url: string;
  filters: any;
  value: number;
  previous_value: number | null;
  stan: string;
}

const API_URL = 'http://localhost:5000/api';

type TimeRange = '1m' | '1h' | '4h' | '1d' | 'all';

const TIME_RANGES: { [key in TimeRange]: { label: string; ms: number | null } } = {
  '1m': { label: '1 Minute', ms: 60 * 1000 },
  '1h': { label: '1 Hour', ms: 60 * 60 * 1000 },
  '4h': { label: '4 Hours', ms: 4 * 60 * 60 * 1000 },
  '1d': { label: '1 Day', ms: 24 * 60 * 60 * 1000 },
  'all': { label: 'Auto', ms: null }
};

const PriceHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [observations, setObservations] = useState<Observation[]>([]);
  const [selectedObs, setSelectedObs] = useState<string>('');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('1h');
  const [useAveraging, setUseAveraging] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(() => {
    // Try to read from localStorage, fallback to 60s
    const stored = localStorage.getItem('olx-offer-tracker-auto-refresh-interval');
    return stored ? parseInt(stored, 10) : 60000;
  });

  useEffect(() => {
    fetch(`${API_URL}/observations`)
      .then(res => res.json())
      .then(data => setObservations(data));
  }, []);

  useEffect(() => {
    if (!selectedObs) return;
    setLoading(true);
    fetch(`${API_URL}/offers/by-observation/${selectedObs}`)
      .then(res => res.json())
      .then(data => setOffers(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [selectedObs]);

  // Auto-refresh effect
  useEffect(() => {
    if (!selectedObs) return;
    const interval = setInterval(() => {
      fetch(`${API_URL}/offers/by-observation/${selectedObs}`)
        .then(res => res.json())
        .then(data => setOffers(Array.isArray(data) ? data : []));
    }, autoRefreshInterval);
    return () => clearInterval(interval);
  }, [selectedObs, autoRefreshInterval]);

  // Prepare data for chart (always show all data)
  const rawData = Array.isArray(offers)
    ? offers
        .filter(o => typeof o.value === 'number')
        .map(o => ({
          x: new Date(o.last_refresh_time).getTime(),
          y: o.value,
          label: o.title,
        }))
        .sort((a, b) => a.x - b.x)
    : [];

  // Averaging logic
  let chartData = rawData;
  if (useAveraging && rawData.length > 0 && timeRange !== 'all' && TIME_RANGES[timeRange].ms) {
    const step = TIME_RANGES[timeRange].ms!;
    const minX = rawData[0].x;
    const maxX = rawData[rawData.length - 1].x;
    const buckets: { x: number; values: number[] }[] = [];
    for (let t = Math.ceil(minX / step) * step; t <= maxX; t += step) {
      buckets.push({ x: t, values: [] });
    }
    if (buckets.length === 0 || buckets[0].x > minX) buckets.unshift({ x: minX, values: [] });
    if (buckets[buckets.length - 1].x < maxX) buckets.push({ x: maxX, values: [] });

    rawData.forEach(d => {
      const idx = buckets.findIndex(b => d.x <= b.x);
      if (idx !== -1) {
        buckets[idx].values.push(d.y);
      }
    });
    // Compute average for each bucket and filter out empty buckets
    chartData = buckets
      .filter(b => b.values.length > 0)
      .map(b => ({
        x: b.x,
        y: b.values.reduce((a, v) => a + v, 0) / b.values.length,
        label: `Avg (${b.values.length})`,
      }));
  }

  // SVG chart dimensions
  const width = 800;
  const height = 400;
  const padding = { top: 40, right: 60, bottom: 60, left: 80 };
  const minY = Math.min(...chartData.map(d => d.y), 0);
  const maxY = Math.max(...chartData.map(d => d.y), 1);
  const minX = chartData.length > 0 ? chartData[0].x : Date.now();
  const maxX = chartData.length > 0 ? chartData[chartData.length - 1].x : Date.now();

  // Calculate x-axis ticks based on selected time step
  let xTicks: number[] = [];
  const maxVisibleTicks = 20;
  if (chartData.length > 0) {
    let allTicks: number[] = [];
    if (timeRange === 'all' || !TIME_RANGES[timeRange].ms) {
      // Auto: 6 ticks
      const nTicks = 6;
      const step = (maxX - minX) / nTicks;
      allTicks = Array.from({ length: nTicks + 1 }, (_, i) => minX + i * step);
    } else {
      const step = TIME_RANGES[timeRange].ms!;
      const firstTick = Math.ceil(minX / step) * step;
      for (let t = firstTick; t <= maxX; t += step) {
        allTicks.push(t);
      }
      // Always include minX and maxX for edge labels
      if (!allTicks.includes(minX)) allTicks.unshift(minX);
      if (!allTicks.includes(maxX)) allTicks.push(maxX);
      // Fallback: if too few ticks, use 6 evenly spaced ticks
      if (allTicks.length < 3) {
        const nTicks = 6;
        const fallbackStep = (maxX - minX) / nTicks;
        allTicks = Array.from({ length: nTicks + 1 }, (_, i) => minX + i * fallbackStep);
      }
    }
    // Limit to maxVisibleTicks by sampling evenly
    if (allTicks.length > maxVisibleTicks) {
      xTicks = Array.from({ length: maxVisibleTicks }, (_, i) => {
        const idx = Math.round(i * (allTicks.length - 1) / (maxVisibleTicks - 1));
        return allTicks[idx];
      });
    } else {
      xTicks = allTicks;
    }
  }
  // Calculate scrollable width
  const visibleTicks = Math.min(xTicks.length, maxVisibleTicks);
  const barWidthPx = 40;
  const activityBarWidthPx = 60;
  const chartScrollableWidth = barWidthPx * xTicks.length;
  const activityChartScrollableWidth = activityBarWidthPx * xTicks.length;
  // Show every label (since we now limit ticks)
  const labelStep = 1;

  // Activity bar chart data: count offers per tick interval
  let activityData: { x: number; count: number }[] = [];
  if (xTicks.length > 1 && rawData.length > 0) {
    for (let i = 0; i < xTicks.length - 1; i++) {
      const start = xTicks[i];
      const end = xTicks[i + 1];
      const count = rawData.filter(d => d.x >= start && d.x < end).length;
      activityData.push({ x: start, count });
    }
  }
  const maxActivity = Math.max(...activityData.map(a => a.count), 1);
  const activityChartWidth = 200;
  const activityChartHeight = height;
  const barWidth = activityData.length > 0 ? (activityChartWidth - 40) / activityData.length : 0;

  const getX = (x: number) => padding.left + ((x - minX) / (maxX - minX || 1)) * (width - padding.left - padding.right);
  const getY = (y: number) => height - padding.bottom - ((y - minY) / (maxY - minY || 1)) * (height - padding.top - padding.bottom);

  // Format date for x-axis based on time range
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    switch (timeRange) {
      case '1m':
        return date.toLocaleTimeString('pl-PL', { 
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      case '1h':
        return date.toLocaleTimeString('pl-PL', { 
          hour: '2-digit',
          minute: '2-digit'
        });
      case '4h':
        return date.toLocaleTimeString('pl-PL', { 
          hour: '2-digit',
          minute: '2-digit'
        });
      case '1d':
        return date.toLocaleDateString('pl-PL', { 
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit'
        });
      default:
        return date.toLocaleDateString('pl-PL', { 
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
    }
  };

  // Format price for y-axis
  const formatPrice = (price: number) => {
    return `${price.toLocaleString('pl-PL')} zł`;
  };

  // Generate y-axis ticks
  const yTicks = chartData.length > 0 ? [
    minY,
    ...Array.from({ length: 4 }, (_, i) => minY + (maxY - minY) * (i + 1) / 5),
    maxY
  ] : [];

  return (
    <div className="py-8">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Price History</h2>
      <div className="mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Observation</label>
          <select
            className="w-full max-w-md p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            value={selectedObs}
            onChange={e => setSelectedObs(e.target.value)}
          >
            <option value="">-- Select --</option>
            {observations.map(obs => (
              <option key={obs.id} value={obs.categoryId}>
                {obs.categoryId} {Object.entries(obs).filter(([k]) => !['id','offers','lastChecked','categoryId'].includes(k)).map(([k,v]) => `${k}:${v}`).join(' ')}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time Step</label>
          <div className="flex gap-2">
            {Object.entries(TIME_RANGES).map(([key, { label }]) => (
              <button
                key={key}
                onClick={() => setTimeRange(key as TimeRange)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  timeRange === key
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useAveraging}
              onChange={() => setUseAveraging(v => !v)}
              className="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Averaging</span>
          </label>
        </div>
      </div>
      {loading && <p>Loading price history...</p>}
      {!loading && chartData.length > 1 && (
        <div className="overflow-x-auto w-full flex gap-8">
          {/* Price Chart */}
          <svg width={chartScrollableWidth} height={height} className="bg-white dark:bg-gray-800 rounded shadow min-w-[800px]">
            {/* Axes */}
            <line x1={padding.left} y1={height-padding.bottom} x2={width-padding.right} y2={height-padding.bottom} stroke="#888" />
            <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height-padding.bottom} stroke="#888" />
            
            {/* X-axis ticks and labels */}
            {xTicks.map((tick, i) => (
              <g key={`x-${i}`}>
                <line 
                  x1={getX(tick)} 
                  y1={height-padding.bottom} 
                  x2={getX(tick)} 
                  y2={height-padding.bottom + 5} 
                  stroke="#888" 
                />
                {i % labelStep === 0 && (
                  <text 
                    x={getX(tick)} 
                    y={height-padding.bottom + 20} 
                    textAnchor="middle" 
                    fill="#666"
                    className="text-xs"
                  >
                    {formatDate(tick)}
                  </text>
                )}
              </g>
            ))}

            {/* Y-axis ticks and labels */}
            {yTicks.map((tick, i) => (
              <g key={`y-${i}`}>
                <line 
                  x1={padding.left} 
                  y1={getY(tick)} 
                  x2={padding.left - 5} 
                  y2={getY(tick)} 
                  stroke="#888" 
                />
                <text 
                  x={padding.left - 10} 
                  y={getY(tick)} 
                  textAnchor="end" 
                  dominantBaseline="middle"
                  fill="#666"
                  className="text-xs"
                >
                  {formatPrice(tick)}
                </text>
              </g>
            ))}

            {/* Axis labels */}
            <text 
              x={width/2} 
              y={height - 10} 
              textAnchor="middle" 
              fill="#666"
              className="text-sm font-medium"
            >
              Date
            </text>
            <text 
              x={-height/2} 
              y={20} 
              textAnchor="middle" 
              fill="#666"
              className="text-sm font-medium"
              transform="rotate(-90)"
            >
              Price (PLN)
            </text>

            {/* Line */}
            <polyline
              fill="none"
              stroke="#2563eb"
              strokeWidth={2}
              points={chartData.map(d => `${getX(d.x)},${getY(d.y)}`).join(' ')}
            />
            
            {/* Dots */}
            {chartData.map((d, i) => (
              <circle key={i} cx={getX(d.x)} cy={getY(d.y)} r={4} fill="#2563eb" />
            ))}

            {/* Price labels */}
            {chartData.map((d, i) => (
              <text 
                key={i} 
                x={getX(d.x)} 
                y={getY(d.y) - 10} 
                fontSize="10" 
                textAnchor="middle" 
                fill="#2563eb"
                className="text-xs"
              >
                {formatPrice(d.y)}
              </text>
            ))}
          </svg>
          {/* Activity Bar Chart */}
          <svg width={activityChartScrollableWidth} height={activityChartHeight} className="bg-white dark:bg-gray-800 rounded shadow min-w-[400px]">
            {/* Y axis */}
            <line x1={40} y1={padding.top} x2={40} y2={activityChartHeight-padding.bottom} stroke="#888" />
            {/* X axis */}
            <line x1={40} y1={activityChartHeight-padding.bottom} x2={activityChartWidth-10} y2={activityChartHeight-padding.bottom} stroke="#888" />
            {/* Bars */}
            {activityData.map((a, i) => (
              <rect
                key={i}
                x={40 + i * activityBarWidthPx + 8}
                y={activityChartHeight-padding.bottom - (a.count / maxActivity) * (activityChartHeight-padding.top-padding.bottom)}
                width={activityBarWidthPx - 16}
                height={(a.count / maxActivity) * (activityChartHeight-padding.top-padding.bottom)}
                fill="#60a5fa"
              />
            ))}
            {/* Bar labels */}
            {activityData.map((a, i) => (
              i % labelStep === 0 ? (
                <text
                  key={i}
                  x={40 + i * activityBarWidthPx + activityBarWidthPx/2}
                  y={activityChartHeight-padding.bottom - (a.count / maxActivity) * (activityChartHeight-padding.top-padding.bottom) - 6}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#2563eb"
                >
                  {a.count > 0 ? a.count : ''}
                </text>
              ) : null
            ))}
            {/* X axis labels */}
            {activityData.map((a, i) => (
              i % labelStep === 0 ? (
                <text
                  key={i}
                  x={40 + i * activityBarWidthPx + activityBarWidthPx/2}
                  y={activityChartHeight-padding.bottom + 16}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#666"
                >
                  {formatDate(a.x)}
                </text>
              ) : null
            ))}
            {/* Y axis label */}
            <text
              x={10}
              y={padding.top}
              textAnchor="start"
              fontSize="12"
              fill="#666"
              className="font-medium"
            >
              Activity
            </text>
          </svg>
        </div>
      )}
      {!loading && selectedObs && chartData.length <= 1 && (
        <p className="text-gray-500 mt-4">Not enough price data to display a graph for this observation.</p>
      )}
    </div>
  );
};

export default PriceHistoryPage; 
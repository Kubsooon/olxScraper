import React, { useState } from 'react';
import ObservationCard from './ObservationCard';
import { Observation } from '../types';
import { RefreshCw } from 'lucide-react';
import EditObservationModal from './EditObservationModal';
import { deleteObservation, createObservation } from '../services/olxService';

interface DashboardProps {
  observations: Observation[];
  onRemoveObservation: (id: string) => void;
  onRefreshObservation: (id: string) => Promise<void>;
  onRefreshAll: () => Promise<void>;
  isLoading: boolean;
  loadObservations: () => Promise<void>;
  setObservations: React.Dispatch<React.SetStateAction<Observation[]>>;
}

const Dashboard: React.FC<DashboardProps> = ({
  observations,
  onRemoveObservation,
  onRefreshObservation,
  onRefreshAll,
  isLoading,
  setObservations,
}) => {
  const [editingObservation, setEditingObservation] = useState<Observation | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleEdit = (obs: Observation) => {
    setEditingObservation(obs);
  };

  const handleSave = async (fields: any) => {
    if (!editingObservation) return;
    try {
      await deleteObservation(editingObservation.id);
      const newObservation = await createObservation(fields);
      setObservations(prev => [...prev.filter(o => o.id !== editingObservation.id), newObservation]);
      setEditingObservation(null);
    } catch (e) {
      alert('Failed to update observation');
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    setObservations(prev => {
      const newObservations = [...prev];
      const [draggedItem] = newObservations.splice(draggedIndex, 1);
      newObservations.splice(dropIndex, 0, draggedItem);
      return newObservations;
    });
    setDraggedIndex(null);
  };

  return (
    <div className="py-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-medium text-gray-900 dark:text-white">
          Your Observations
          {observations.length > 0 && ` (${observations.length})`}
        </h2>
        {observations.length > 0 && (
          <button
            onClick={onRefreshAll}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            <RefreshCw className={`mr-1.5 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh All
          </button>
        )}
      </div>

      {observations.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No observations yet. Use the form above to start tracking listings.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {observations.map((observation, index) => (
            <div
              key={observation.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={() => setDraggedIndex(null)}
              className={`transition-transform duration-200 ${
                draggedIndex === index ? 'opacity-50' : ''
              }`}
            >
              <ObservationCard
                observation={observation}
                onRemove={onRemoveObservation}
                onRefresh={onRefreshObservation}
                isLoading={isLoading}
                onEdit={handleEdit}
              />
            </div>
          ))}
        </div>
      )}
      <EditObservationModal
        isOpen={!!editingObservation}
        onClose={() => setEditingObservation(null)}
        observation={editingObservation}
        onSave={handleSave}
      />
    </div>
  );
};

export default Dashboard;
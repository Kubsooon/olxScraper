import React from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-xl relative max-h-[90vh] overflow-y-auto">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
          onClick={onClose}
          aria-label="Close help"
        >
          ×
        </button>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">OLX Offer Tracker — Help & Info</h2>
        <div className="space-y-4 text-gray-800 dark:text-gray-200 text-sm">
          <p>
            <strong>What does this app do?</strong><br />
            This app lets you track new OLX offers in any category, with powerful filters and live auto-refresh. You can:
          </p>
          <ul className="list-disc pl-6">
            <li><strong>Track any category:</strong> Choose a category and set filters to watch for new offers.</li>
            <li><strong>Dynamic filters:</strong> Filters are loaded from OLX and adapt to your chosen category.</li>
            <li><strong>Price range:</strong> Use a double slider to set min/max price.</li>
            <li><strong>Keyword search:</strong> Enter keywords to match in title/description. Use <code>;</code> to separate OR groups (e.g. <code>iphone 13; samsung s22</code>), and spaces for AND (all words must match).</li>
            <li><strong>Draggable cards:</strong> Drag and drop observation cards to reorder them as you like.</li>
            <li><strong>Auto-refresh:</strong> Set how often all observations refresh (1 min to 24h).</li>
            <li><strong>Dark mode:</strong> Toggle dark/light theme in the header.</li>
            <li><strong>Edit observations:</strong> Click the pencil icon to edit filters for any observation.</li>
            <li><strong>Offer tags:</strong> "New" for new offers, "Low" for offers at least 15% below average price.</li>
          </ul>
          <p>
            <strong>How to use:</strong><br />
            1. Select a category and click <b>Pobierz filtry</b>.<br />
            2. Set your filters and keywords.<br />
            3. Click <b>Start Tracking</b> to add an observation.<br />
            4. Drag cards to reorder, edit or remove as needed.<br />
            5. Use the auto-refresh dropdown to set how often offers update.<br />
          </p>
          <p>
            <strong>Tips:</strong><br />
            - Use the <b>Keywords</b> field for advanced searching. For example, <code>iphone 13; samsung s22</code> will match either "iphone 13" or "samsung s22".<br />
            - You can track multiple observations at once, each with its own filters.<br />
            - Offers are cached and marked as "new" when first seen.<br />
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
            This help will be updated as new features are added!
          </p>
        </div>
      </div>
    </div>
  );
};

export default HelpModal; 
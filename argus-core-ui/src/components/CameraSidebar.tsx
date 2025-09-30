import React, { useState, useEffect } from 'react';
import { getCameras } from '../services/api';
import type { Camera } from '../services/api';

interface CameraSidebarProps {
  selectedCameraId: number | null;
  onSelectCamera: (id: number) => void;
}

const CameraSidebar: React.FC<CameraSidebarProps> = ({ selectedCameraId, onSelectCamera }) => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchCameras = async () => {
      try {
        const response = await getCameras();
        setCameras(response.data);
      } catch (error) {
        console.error("Failed to fetch cameras:", error);
        // Add some mock cameras for demo purposes
        setCameras([
          { id: 1, name: "Main Entrance", location: "Building A - Front Door", is_active: 1 },
          { id: 2, name: "Parking Lot", location: "Building A - Parking Area", is_active: 1 },
          { id: 3, name: "Hallway", location: "Building A - Floor 1", is_active: 1 },
          { id: 4, name: "Emergency Exit", location: "Building A - Side Door", is_active: 0 },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchCameras();
  }, []);

  const filteredCameras = cameras.filter(camera =>
    camera.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    camera.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <aside className="bg-gray-900 p-4 rounded-lg shadow-inner w-full">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
          <span className="ml-2 text-gray-400">Loading Cameras...</span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="bg-gray-900 p-4 rounded-lg shadow-inner w-full">
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-3 text-teal-300">Camera Feeds</h2>
        
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search cameras..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
          <div className="absolute right-3 top-2.5 text-gray-400">
            🔍
          </div>
        </div>
      </div>

      {/* Camera List */}
      <div className="space-y-2">
        {filteredCameras.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-400">No cameras found. Click below to add demo cameras.</p>
            <button
              onClick={() => setCameras([
                { id: 1, name: "Main Entrance", location: "Building A - Front Door", is_active: 1 },
                { id: 2, name: "Parking Lot", location: "Building A - Parking Area", is_active: 1 },
                { id: 3, name: "Hallway", location: "Building A - Floor 1", is_active: 1 }
              ])}
              className="mt-3 bg-teal-500 hover:bg-teal-600 text-white text-sm px-3 py-1 rounded"
            >
              Add Demo Cameras
            </button>
          </div>
        ) : (
          filteredCameras.map((cam) => (
            <div key={cam.id} className="relative">
              <button
                onClick={() => onSelectCamera(cam.id)}
                className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                  selectedCameraId === cam.id
                    ? 'bg-teal-500 text-white shadow-lg transform scale-105'
                    : 'bg-gray-700 hover:bg-gray-600 hover:transform hover:scale-102'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-bold text-sm">{cam.name}</div>
                    <div className="text-xs text-gray-300 mt-1">{cam.location}</div>
                  </div>
                  
                  {/* Status Indicator */}
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      cam.is_active ? 'bg-green-400' : 'bg-red-400'
                    }`}></div>
                    <span className="text-xs">
                      {cam.is_active ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </div>
              </button>
              
              {/* Selection Indicator */}
              {selectedCameraId === cam.id && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-400 rounded-r"></div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Camera Stats */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <div className="text-xs text-gray-400 space-y-1">
          <div className="flex justify-between">
            <span>Total Cameras:</span>
            <span>{cameras.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Active:</span>
            <span className="text-green-400">{cameras.filter(c => c.is_active).length}</span>
          </div>
          <div className="flex justify-between">
            <span>Inactive:</span>
            <span className="text-red-400">{cameras.filter(c => !c.is_active).length}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default CameraSidebar;

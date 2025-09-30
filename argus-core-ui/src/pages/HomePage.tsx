// src/pages/HomePage.tsx
import React, { useState, useEffect } from 'react';
import CameraSidebar from '../components/CameraSidebar';
import { getIncidents, simulateCamera } from '../services/api';

// Enhanced video feed component with monitoring features
const VideoFeed: React.FC<{ 
  selectedCameraId: number | null;
  isStreaming: boolean;
  zoomLevel: number;
  onToggleStream: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  lastResult?: { first_prediction?: string; probability?: number; alert_types?: string[] } | null;
}> = ({ selectedCameraId, isStreaming, zoomLevel, onToggleStream, onZoomIn, onZoomOut, onAnalyze, isAnalyzing, lastResult }) => {
  const [detectionStatus, setDetectionStatus] = useState<string>('Monitoring...');
  const [lastAlert, setLastAlert] = useState<string | null>(null);

  useEffect(() => {
    // Simulate detection status updates
    const interval = setInterval(() => {
      if (isStreaming) {
        const statuses = [
          'Monitoring...',
          'Analyzing frames...',
          'No anomalies detected',
          'Processing video stream...'
        ];
        setDetectionStatus(statuses[Math.floor(Math.random() * statuses.length)]);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isStreaming]);

  if (!selectedCameraId) {
    return (
      <div className="bg-black flex items-center justify-center h-full rounded-lg border-2 border-dashed border-gray-600">
        <div className="text-center">
          <div className="text-6xl mb-4">📹</div>
          <p className="text-gray-400 text-lg">Please select a camera from the sidebar</p>
          <p className="text-gray-500 text-sm mt-2">Choose a camera to start monitoring</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black w-full h-full rounded-lg relative overflow-hidden">
      {/* Video Stream Area */}
      <div className="w-full h-full flex items-center justify-center relative">
        {isStreaming ? (
          <div className="relative">
            {/* Simulated video feed */}
            <div 
              className="bg-gray-800 border-2 border-gray-600 rounded-lg flex items-center justify-center"
              style={{ 
                width: `${300 + zoomLevel * 50}px`, 
                height: `${200 + zoomLevel * 35}px` 
              }}
            >
              <div className="text-center text-gray-400">
                <div className="text-4xl mb-2">📹</div>
                <p className="text-sm">Camera {selectedCameraId}</p>
                <p className="text-xs">Live Stream</p>
              </div>
            </div>
            
            {/* Detection overlay */}
            <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
              LIVE
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500">
            <div className="text-6xl mb-4">⏸️</div>
            <p className="text-lg">Stream Paused</p>
            <p className="text-sm">Click play to start monitoring</p>
          </div>
        )}
      </div>

      {/* Status Information */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-75 p-3 rounded-lg">
        <h3 className="text-white font-bold text-sm">Camera {selectedCameraId}</h3>
        <p className="text-gray-300 text-xs">{detectionStatus}</p>
        {lastAlert && (
          <p className="text-red-400 text-xs mt-1">⚠️ {lastAlert}</p>
        )}
      </div>

      {/* Zoom Level Indicator */}
      <div className="absolute top-4 right-4 bg-black bg-opacity-75 p-2 rounded-lg">
        <p className="text-white text-xs">Zoom: {zoomLevel}x</p>
      </div>

      {/* Feed Controls */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <div className="bg-black bg-opacity-75 p-3 rounded-lg flex space-x-3">
          <button 
            onClick={onToggleStream}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isStreaming 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {isStreaming ? '⏸️ Pause' : '▶️ Play'}
          </button>
          
          <button 
            onClick={onZoomOut}
            disabled={zoomLevel <= 0}
            className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-sm transition-colors"
          >
            🔍- Zoom Out
          </button>
          
          <button 
            onClick={onZoomIn}
            disabled={zoomLevel >= 5}
            className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-sm transition-colors"
          >
            🔍+ Zoom In
          </button>

          <button
            onClick={onAnalyze}
            disabled={!selectedCameraId || isAnalyzing}
            className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {isAnalyzing ? 'Analyzing…' : 'Analyze Random Clip'}
          </button>
        </div>
      </div>

      {/* Detection Status Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-green-500 to-blue-500 h-1">
        <div className="h-full bg-white opacity-30 animate-pulse"></div>
      </div>

      {/* Last analysis result */}
      {lastResult && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-black/75 text-white px-4 py-2 rounded-lg text-xs">
          <span>First: {lastResult.first_prediction || 'N/A'} • Prob: {lastResult.probability?.toFixed(2) ?? '—'} • Alerts: {lastResult.alert_types?.join(', ') || 'None'}</span>
        </div>
      )}
    </div>
  );
};

// Recent incidents component
const RecentIncidents: React.FC = () => {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const response = await getIncidents();
        setIncidents(response.data.slice(0, 5)); // Show only recent 5
      } catch (error) {
        console.error('Failed to fetch incidents:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchIncidents();
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-3 text-teal-300">Recent Incidents</h3>
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-3 text-teal-300">Recent Incidents</h3>
      {incidents.length === 0 ? (
        <p className="text-gray-400 text-sm">No recent incidents</p>
      ) : (
        <div className="space-y-2">
          {incidents.map((incident) => (
            <div key={incident.id} className="bg-gray-700 p-2 rounded text-sm">
              <div className="flex justify-between items-center">
                <span className="text-white font-medium">{incident.event_type}</span>
                <span className="text-gray-400 text-xs">
                  {new Date(incident.started_at).toLocaleTimeString()}
                </span>
              </div>
              <div className="text-gray-400 text-xs">
                Camera {incident.camera_id} • Score: {incident.score?.toFixed(2) || 'N/A'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const HomePage: React.FC = () => {
  const [selectedCameraId, setSelectedCameraId] = useState<number | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const handleToggleStream = () => {
    setIsStreaming(!isStreaming);
  };

  const handleZoomIn = () => {
    if (zoomLevel < 5) {
      setZoomLevel(zoomLevel + 1);
    }
  };

  const handleZoomOut = () => {
    if (zoomLevel > 0) {
      setZoomLevel(zoomLevel - 1);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedCameraId) return;
    setIsAnalyzing(true);
    try {
      const res = await simulateCamera(selectedCameraId, true);
      setLastResult({
        first_prediction: res.data.first_prediction,
        probability: res.data.probability,
        alert_types: res.data.alert_types,
      });
      setIsStreaming(true);
    } catch (e) {
      console.error('Simulation failed', e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Monitoring Area */}
      <div className="flex flex-col lg:flex-row gap-6" style={{ height: 'calc(100vh - 200px)' }}>
        {/* Camera Sidebar */}
        <div className="w-full lg:w-1/4">
          <CameraSidebar
            selectedCameraId={selectedCameraId}
            onSelectCamera={(id: number) => setSelectedCameraId(id)}
          />
        </div>
        
        {/* Video Feed */}
        <div className="w-full lg:w-3/4 h-full">
          <VideoFeed 
            selectedCameraId={selectedCameraId}
            isStreaming={isStreaming}
            zoomLevel={zoomLevel}
            onToggleStream={handleToggleStream}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
            lastResult={lastResult}
          />
        </div>
      </div>

      {/* Bottom Panel with Recent Incidents */}
      <div className="w-full">
        <RecentIncidents />
      </div>
    </div>
  );
};

export default HomePage;
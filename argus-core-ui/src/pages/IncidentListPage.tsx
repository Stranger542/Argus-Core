// src/pages/IncidentListPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getIncidents } from '../services/api'; // Import the api function

// Define an interface for the Incident object
interface Clip {
  id: number;
  file_path: string;
}
interface Incident {
  id: number;
  camera_id: number;
  event_type: string;
  score: number | null;
  started_at: string;
  status: string;
  clips: Clip[];
}

const IncidentListPage: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const response = await getIncidents();
        setIncidents(response.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to fetch incidents.');
      } finally {
        setLoading(false);
      }
    };
    fetchIncidents();
  }, []); // Runs once on page load

  if (loading) return <div className="page-container">Loading incidents...</div>;
  if (error) return <div className="page-container" style={{ color: 'var(--accent-red)'}}>{error}</div>;

  return (
    <div className="page-container incident-list-page">
      <h1>Incident History</h1>
      <p>Showing all recorded events from analyses.</p>

      <div className="incident-list">
        {incidents.length > 0 ? (
          incidents.map((incident) => (
            <Link 
              to={`/incidents/${incident.id}`} 
              key={incident.id} 
              className="incident-card info-card"
            >
              <div className="incident-card-header">
                <h2>{incident.event_type}</h2>
                <span className="incident-id">ID: {incident.id}</span>
              </div>
              <div className="incident-card-body">
                <div className="setting-item">
                  <label>Date & Time</label>
                  <p>{new Date(incident.started_at).toLocaleString()}</p>
                </div>
                <div className="setting-item">
                  <label>Camera</label>
                  <p>Camera {incident.camera_id}</p>
                </div>
                <div className="setting-item">
                  <label>Status</label>
                  <p className="status-badge">{incident.status}</p>
                </div>
              </div>
              <div className="incident-card-footer">
                <span>View Details &rarr;</span>
              </div>
            </Link>
          ))
        ) : (
          <div className="info-card">
            <h2>No Incidents Found</h2>
            <p>No incidents have been recorded yet. Analyze a video from the 'Feed' page to create one.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default IncidentListPage;
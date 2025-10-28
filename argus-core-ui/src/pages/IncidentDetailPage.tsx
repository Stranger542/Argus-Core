// src/pages/IncidentDetailPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
// Import the new downloadClip function
import { getIncidentById, downloadClip } from '../services/api';

// Define types for clarity
interface Clip {
  id: number;
  file_path: string;
}
interface AnomalyEvent {
  event: string;
  confidence: number;
  time: string;
}
interface Incident {
  id: number;
  camera_id: number;
  event_type: string;
  score: number | null;
  started_at: string;
  status: string;
  note: string | null;
  clips: Clip[];
}

const IncidentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Add a new state to track which clip is downloading
  const [downloading, setDownloading] = useState<number | null>(null);

  useEffect(() => {
    const fetchIncident = async () => {
      if (!id) {
        setError("No incident ID provided.");
        setLoading(false);
        return;
      }
      try {
        const response = await getIncidentById(Number(id));
        setIncident(response.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to fetch incident details.');
      } finally {
        setLoading(false);
      }
    };
    fetchIncident();
  }, [id]);

  // --- NEW: Function to handle the download click ---
  const handleDownload = async (clip: Clip) => {
    setDownloading(clip.id); // Show loading state on the button
    try {
      const response = await downloadClip(clip.id);

      // Try to get filename from the server's response
      let filename = `incident_${incident?.id}_clip_${clip.id}.mp4`; // Fallback
      const contentDisposition = response.headers['content-disposition'];
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch.length === 2) {
          filename = filenameMatch[1];
        }
      }

      // Create a temporary link to trigger the browser's download prompt
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();

      // Clean up the temporary link
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error("Download failed:", err);
      alert("Failed to download clip. You may need to log in again.");
    } finally {
      setDownloading(null); // Clear loading state
    }
  };

  if (loading) return <div className="page-container">Loading incident details...</div>;
  if (error) return <div className="page-container" style={{ color: 'var(--accent-red)'}}>{error}</div>;
  if (!incident) return <div className="page-container">No incident found.</div>;

  // Safely parse anomaly events
  let anomalyEvents: AnomalyEvent[] = [];
  if (incident.note) {
    try {
      anomalyEvents = JSON.parse(incident.note);
    } catch (e) {
      console.error("Failed to parse anomaly events from note:", e);
    }
  }

  return (
    <div className="page-container incident-detail-page">
      <h1>Incident #{incident.id}</h1>

      <div className="info-card">
        <div className="incident-detail-grid">
          {/* Column 1: Core Details */}
          <div className="incident-detail-column">
            {/* ... (all other details remain the same) ... */}
            <h2>Incident Details</h2>
            <div className="setting-item">
              <label>Event Type(s)</label>
              <p style={{ color: 'var(--accent-red)', fontWeight: '600' }}>
                {incident.event_type}
              </p>
            </div>
            <div className="setting-item">
              <label>Date & Time</label>
              <p>{new Date(incident.started_at).toLocaleString()}</p>
            </div>
            <div className="setting-item">
              <label>Status</label>
              <p><span className="status-badge">{incident.status}</span></p>
            </div>
            <div className="setting-item">
              <label>Camera ID</label>
              <p>{incident.camera_id}</p>
            </div>
            <div className="setting-item">
              <label>Confidence Score</label>
              <p>{incident.score ? incident.score.toFixed(2) : 'N/A'}</p>
            </div>
          </div>

          {/* Column 2: Evidence & Logs */}
          <div className="incident-detail-column">
            <h2>Evidence & Logs</h2>
            
            <div className="setting-item">
              <label>Evidence Clip(s)</label>
              <ul className="evidence-list">
                {incident.clips && incident.clips.length > 0 ? (
                  incident.clips.map((clip: Clip) => (
                    <li key={clip.id}>
                      {/* --- MODIFIED: Changed <a> to <button> --- */}
                      <button
                        onClick={() => handleDownload(clip)}
                        className="evidence-link"
                        disabled={downloading === clip.id}
                      >
                        {downloading === clip.id 
                          ? 'Downloading...' 
                          : `Download Clip #${clip.id}`
                        }
                      </button>
                    </li>
                  ))
                ) : (
                  <li>No clips available.</li>
                )}
              </ul>
            </div>

            {/* ... (anomaly log remains the same) ... */}
            {anomalyEvents.length > 0 && (
              <div className="setting-item">
                <label>Detected Anomaly Events (Log)</label>
                <ul className="anomaly-log-list">
                  {anomalyEvents.map((ev, idx) => (
                    <li key={idx}>
                      <strong>{ev.event}</strong> 
                      (Conf: {ev.confidence.toFixed(2)})
                      @ {new Date(ev.time).toLocaleTimeString()}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
       <Link to="/incidents" className="back-link">&larr; Back to all incidents</Link>
    </div>
  );
};

export default IncidentDetailPage;
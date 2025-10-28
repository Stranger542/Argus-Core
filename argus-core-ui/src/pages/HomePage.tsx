import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';
// Import detectAnomalies and other necessary API functions
import { getRandomVideo, detectAnomalies, getIncidentById } from '../services/api';

const HomePage: React.FC = () => {
  const [selectedFeed, setSelectedFeed] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [detectedAnomalies, setDetectedAnomalies] = useState<any[]>([]);
  // Incident ID is not directly set by /api/detect, remove for now
  // const [incidentId, setIncidentId] = useState<number | null>(null);
  const [showAnalysisCompletePopup, setShowAnalysisCompletePopup] = useState(false); // Renamed state for clarity

  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const feeds = [ // Mock data
    { id: 1, name: 'Feed 1 - Lobby (Live)' },
    { id: 2, name: 'Feed 2 - Parking (Live)' },
    { id: 3, name: 'Feed 3 - Entrance (Offline)' },
    { id: 4, name: 'Feed 4 - Warehouse (Live)' },
    { id: 5, name: 'Feed 5 - Roof (Live)' }
  ];

  const handleFeedSelect = async (feedName: string) => {
    setSelectedFeed(feedName);
    setDetectedAnomalies([]); // Clear previous anomalies
    setIsPlaying(false);
    setVideoUrl(null);

    try {
      // 1. Get random video URL
      const videoResponse = await getRandomVideo();
      const relativeVideoUrl = videoResponse.data.video_url; // e.g., /datasets/.../video.mp4
      const fullVideoUrl = `http://localhost:8000${relativeVideoUrl}`;
      setVideoUrl(fullVideoUrl);

      // Start playing the video
      if (videoRef.current) {
        videoRef.current.src = fullVideoUrl;
        videoRef.current.load(); // Ensure the new source is loaded
        videoRef.current.play().catch(e => console.error("Video play failed:", e)); // Play and catch potential errors
        setIsPlaying(true);
      }

      // 2. Call the NEW detection endpoint in the background
      console.log(`Sending video URL to backend for analysis: ${relativeVideoUrl}`);
      const detectionResponse = await detectAnomalies(relativeVideoUrl); // <-- Use detectAnomalies

      // 3. Set the detected anomalies for display
      if (detectionResponse.data && Array.isArray(detectionResponse.data)) {
         console.log("Anomalies received:", detectionResponse.data);
         setDetectedAnomalies(detectionResponse.data);
      } else {
         console.log("No anomalies detected or unexpected response format.");
         setDetectedAnomalies([]);
      }

    } catch (error: any) {
      console.error("Error during video selection or detection:", error);
      if (error.response && error.response.status === 401) {
        alert("Session expired. Please log in again.");
        localStorage.removeItem('access_token'); // Clear token on auth error
        navigate('/login');
      } else {
        const detail = error.response?.data?.detail || error.message || "An unknown error occurred.";
        alert(`Error during detection: ${detail}`);
        setDetectedAnomalies([]); // Clear anomalies on error
      }
    }
  };

  // Effect to handle video ending
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleEnded = () => {
      console.log("Video playback finished.");
      setIsPlaying(false);
      setShowAnalysisCompletePopup(true); // Show informational popup
    };

    videoElement.addEventListener('ended', handleEnded);
    return () => {
      videoElement.removeEventListener('ended', handleEnded); // Cleanup listener
    };
  }, [videoUrl]); // Re-attach listener if the video URL changes

  // Popup close handler
  const handlePopupClose = () => {
    setShowAnalysisCompletePopup(false);
    console.log("Analysis complete popup closed.");
  };

  // Mock seek function
  const handleTimestampSelect = (time: string) => {
    if (videoRef.current && videoRef.current.duration) {
      // Basic mock: Seek to a fraction based on index, or use actual time if parsable
      try {
          // Attempt to parse time string if it's like "HH:MM:SS" or just seconds
          let targetTime = 0;
          if (time.includes(':')) {
              const parts = time.split(':').map(Number);
              if (parts.length === 3) targetTime = parts[0]*3600 + parts[1]*60 + parts[2];
              else if (parts.length === 2) targetTime = parts[0]*60 + parts[1];
          } else {
              targetTime = parseFloat(time);
          }
          if (!isNaN(targetTime)) {
             videoRef.current.currentTime = Math.min(targetTime, videoRef.current.duration);
             console.log(`Seeking to specified time: ${targetTime}s`);
          } else {
              throw new Error("Invalid time format");
          }
      } catch {
          // Fallback mock seek
          const randomTime = Math.random() * videoRef.current.duration;
          videoRef.current.currentTime = randomTime;
          console.log(`Seeking to random time: ${randomTime.toFixed(2)}s (original time: ${time})`);
      }
      if (!isPlaying) {
          videoRef.current.play(); // Start playing if paused
          setIsPlaying(true);
      }
    }
  };

  // Video controls
  const togglePlayPause = () => {
      if (videoRef.current) { if (isPlaying) videoRef.current.pause(); else videoRef.current.play(); setIsPlaying(!isPlaying); }
  };
  const rewind = () => { if (videoRef.current) videoRef.current.currentTime -= 10; };
  const fastForward = () => { if (videoRef.current) videoRef.current.currentTime += 10; };
  const previousVideo = () => { handleFeedSelect(selectedFeed || feeds[0].name); }; // Reload current/first feed
  const nextVideo = () => { handleFeedSelect(selectedFeed || feeds[0].name); }; // Reload current/first feed

  // Logout handlers
  const handleLogoutConfirm = () => {
      setShowLogoutDialog(false); localStorage.removeItem('access_token'); navigate('/login');
  };
  const handleLogoutCancel = () => { setShowLogoutDialog(false); };

  return (
    <div className="main-layout" style={{ marginTop: '30px' }}>
      {/* Left Sidebar */}
      <aside className="sidebar left">
        <h2>Active Feeds</h2>
        <ul className="feed-list">
          {feeds.map((feed) => (
            <li key={feed.id} className={`feed-item ${selectedFeed === feed.name ? 'selected' : ''}`}>
              <button
                onClick={() => handleFeedSelect(feed.name)}
                className={selectedFeed === feed.name ? 'selected' : ''}
              >
                {feed.name}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Center Video */}
      <main className="center-video" style={{ flex: 1, padding: '20px 5px' }}>
        {selectedFeed ? (
          <>
            <div className="video-container" style={{ height: '80vh' }}>
              {/* Added key prop to video element to force re-render on src change */}
              <video ref={videoRef} className="video-player" controls muted key={videoUrl}>
                {videoUrl && <source src={videoUrl} type="video/mp4" />}
                Your browser does not support the video tag.
              </video>
            </div>
            <div className="video-controls">
              <button onClick={previousVideo} title="Restart/Prev Video"> ⏮ </button>
              <button onClick={rewind} title="Rewind 10s">⏪</button>
              <button onClick={togglePlayPause} title={isPlaying ? "Pause" : "Play"}>
                {isPlaying ? '⏸️' : '▶️'}
              </button>
              <button onClick={fastForward} title="Forward 10s">⏩</button>
              <button onClick={nextVideo} title="Restart/Next Video">⏭</button>
            </div>
          </>
        ) : (
          <div className="placeholder" style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Select a feed to view live surveillance
          </div>
        )}
      </main>

      {/* Right Sidebar */}
      <aside className="sidebar right">
        <h2>Anomalies Detected</h2>
        <ul className="timestamp-list">
          {detectedAnomalies.length > 0 ? (
            detectedAnomalies.map((ts, index) => (
              <li key={index} className="timestamp-item">
                {/* Pass the actual timestamp string to the handler */}
                <button onClick={() => handleTimestampSelect(ts.time)}>
                  <div className="timestamp-event">{ts.event} {ts.confidence ? `(Confidence: ${ts.confidence.toFixed(2)})` : ''}</div>
                  {/* Format the ISO timestamp string */}
                  <div className="timestamp-time">{new Date(ts.time).toLocaleString()}</div>
                </button>
              </li>
            ))
          ) : (
            <li>{selectedFeed && !videoUrl ? 'Loading...' : (selectedFeed ? 'Analyzing...' : 'No anomalies detected yet.')}</li>
          )}
        </ul>
      </aside>

      {/* Logout Button */}
      <button
        onClick={() => setShowLogoutDialog(true)}
        style={{ /* styles */
          position: 'fixed', bottom: '80px', right: '50px',
          background: 'var(--accent-red)', color: 'var(--text-primary)',
          border: 'none', borderRadius: '50%', width: '50px', height: '50px',
          fontSize: '1.2rem', cursor: 'pointer',
          boxShadow: '0 4px 15px rgba(215, 38, 56, 0.4)',
          transition: 'all 0.3s ease', zIndex: 100
        }}
        title="Logout" aria-label="Logout" > ⏻ </button>

      {/* Logout Dialog */}
      {showLogoutDialog && (
        <div style={{ /* styles */
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 200
         }} onClick={handleLogoutCancel}>
          <div style={{ /* styles */
              background: 'var(--glass-bg)', padding: '2rem', borderRadius: '20px',
              backdropFilter: 'var(--blur)', border: '1px solid var(--glass-border)',
              textAlign: 'center', maxWidth: '300px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
           }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Are you sure you want to log out?</h3>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={handleLogoutConfirm} style={{ padding: '0.75rem 1.5rem', background: 'var(--accent-red)', color: 'var(--text-primary)', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '500' }}>Yes</button>
              <button onClick={handleLogoutCancel} style={{ padding: '0.75rem 1.5rem', background: 'var(--accent-blue)', color: 'var(--text-primary)', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '500' }}>No</button>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Complete/Email Pop-up Dialog */}
      {showAnalysisCompletePopup && (
        <div style={{ /* styles */
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 200
        }}>
          <div style={{ /* styles */
              background: 'var(--glass-bg)', padding: '2rem', borderRadius: '20px',
              backdropFilter: 'var(--blur)', border: '1px solid var(--glass-border)',
              textAlign: 'center', maxWidth: '300px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
          }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Analysis Complete</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Anomaly detection finished. Check the timestamps on the right.
            </p>
            <button onClick={handlePopupClose} style={{ padding: '0.75rem 1.5rem', background: 'var(--accent-blue)', color: 'var(--text-primary)', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '500' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
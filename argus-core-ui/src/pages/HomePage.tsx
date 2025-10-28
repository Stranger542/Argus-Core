// src/pages/HomePage.tsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';
import { getRandomVideo, detectAnomalies } from '../services/api';

const HomePage: React.FC = () => {
  const [selectedFeed, setSelectedFeed] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  // const [showLogoutDialog, setShowLogoutDialog] = useState(false); // <-- REMOVED
  const [detectedAnomalies, setDetectedAnomalies] = useState<any[]>([]);
  const [showAnalysisCompletePopup, setShowAnalysisCompletePopup] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const feeds = [
    { id: 1, name: 'Feed 1 - Lobby (Live)' },
    { id: 2, name: 'Feed 2 - Parking (Live)' },
    { id: 3, name: 'Feed 3 - Entrance (Offline)' },
    { id: 4, name: 'Feed 4 - Warehouse (Live)' },
    { id: 5, name: 'Feed 5 - Roof (Live)' }
  ];

  const handleFeedSelect = async (feedName: string) => {
    // ... (this function remains the same)
    setSelectedFeed(feedName);
    setDetectedAnomalies([]); 
    setIsPlaying(false);
    setVideoUrl(null);

    try {
      const videoResponse = await getRandomVideo();
      const relativeVideoUrl = videoResponse.data.video_url; 
      const fullVideoUrl = `http://localhost:8000${relativeVideoUrl}`;
      setVideoUrl(fullVideoUrl);

      if (videoRef.current) {
        videoRef.current.src = fullVideoUrl;
        videoRef.current.load(); 
        videoRef.current.play().catch(e => console.error("Video play failed:", e)); 
        setIsPlaying(true);
      }

      console.log(`Sending video URL to backend for analysis: ${relativeVideoUrl}`);
      const detectionResponse = await detectAnomalies(relativeVideoUrl); 

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
        localStorage.removeItem('access_token'); 
        navigate('/login');
      } else {
        const detail = error.response?.data?.detail || error.message || "An unknown error occurred.";
        alert(`Error during detection: ${detail}`);
        setDetectedAnomalies([]); 
      }
    }
  };

  useEffect(() => {
    // ... (this function remains the same)
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleEnded = () => {
      console.log("Video playback finished.");
      setIsPlaying(false);
      setShowAnalysisCompletePopup(true); 
    };

    videoElement.addEventListener('ended', handleEnded);
    return () => {
      videoElement.removeEventListener('ended', handleEnded); 
    };
  }, [videoUrl]);

  const handlePopupClose = () => {
    // ... (this function remains the same)
    setShowAnalysisCompletePopup(false);
    console.log("Analysis complete popup closed.");
  };

  const handleTimestampSelect = (time: string) => {
    // ... (this function remains the same)
    if (videoRef.current && videoRef.current.duration) {
      try {
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
          const randomTime = Math.random() * videoRef.current.duration;
          videoRef.current.currentTime = randomTime;
          console.log(`Seeking to random time: ${randomTime.toFixed(2)}s (original time: ${time})`);
      }
      if (!isPlaying) {
          videoRef.current.play(); 
          setIsPlaying(true);
      }
    }
  };

  const togglePlayPause = () => {
      // ... (this function remains the same)
      if (videoRef.current) { if (isPlaying) videoRef.current.pause(); else videoRef.current.play(); setIsPlaying(!isPlaying); }
  };
  const rewind = () => { if (videoRef.current) videoRef.current.currentTime -= 10; };
  const fastForward = () => { if (videoRef.current) videoRef.current.currentTime += 10; };
  const previousVideo = () => { handleFeedSelect(selectedFeed || feeds[0].name); };
  const nextVideo = () => { handleFeedSelect(selectedFeed || feeds[0].name); };

  // --- LOGOUT HANDLERS REMOVED ---
  // const handleLogoutConfirm = () => { ... }; // <-- REMOVED
  // const handleLogoutCancel = () => { ... }; // <-- REMOVED

  return (
    // Note: The marginTop style is removed as the parent container handles padding
    <div className="main-layout"> 
      {/* Left Sidebar */}
      <aside className="sidebar left">
        {/* ... (sidebar content remains the same) ... */}
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
        {/* ... (video player content remains the same) ... */}
        {selectedFeed ? (
          <>
            <div className="video-container" style={{ height: '80vh' }}>
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
        {/* ... (sidebar content remains the same) ... */}
        <h2>Anomalies Detected</h2>
        <ul className="timestamp-list">
          {detectedAnomalies.length > 0 ? (
            detectedAnomalies.map((ts, index) => (
              <li key={index} className="timestamp-item">
                <button onClick={() => handleTimestampSelect(ts.time)}>
                  <div className="timestamp-event">{ts.event} {ts.confidence ? `(Confidence: ${ts.confidence.toFixed(2)})` : ''}</div>
                  <div className="timestamp-time">{new Date(ts.time).toLocaleString()}</div>
                </button>
              </li>
            ))
          ) : (
            <li>{selectedFeed && !videoUrl ? 'Loading...' : (selectedFeed ? 'Analyzing...' : 'No anomalies detected yet.')}</li>
          )}
        </ul>
      </aside>

      {/* --- LOGOUT BUTTON AND DIALOG REMOVED --- */}

      {/* Analysis Complete/Email Pop-up Dialog */}
      {showAnalysisCompletePopup && (
        // ... (this dialog remains the same) ...
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 200
        }}>
          <div style={{
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
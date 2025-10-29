// src/pages/HomePage.tsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';
import { getRandomVideo, detectAnomalies } from '../services/api';

const HomePage: React.FC = () => {
  const [selectedFeed, setSelectedFeed] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [detectedAnomalies, setDetectedAnomalies] = useState<any[]>([]);
  const [showAnalysisCompletePopup, setShowAnalysisCompletePopup] = useState(false);
  const [showEmailAlertPopup, setShowEmailAlertPopup] = useState(false);

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
    setDetectedAnomalies([]);
    setIsPlaying(false);
    setVideoUrl(null);
    setShowAnalysisCompletePopup(false);
    setShowEmailAlertPopup(false);

    try {
      // 1. Get random video URL
      const videoResponse = await getRandomVideo();
      const relativeVideoUrl = videoResponse.data.video_url;
      const fullVideoUrl = `http://localhost:8000${relativeVideoUrl}`;
      setVideoUrl(fullVideoUrl);

      // Start playing the video
      if (videoRef.current) {
        videoRef.current.src = fullVideoUrl;
        videoRef.current.load();
        videoRef.current.play().catch(e => console.error("Video play failed:", e));
        setIsPlaying(true);
      }

      // 2. Call the detection endpoint
      console.log(`Sending video URL to backend for analysis: ${relativeVideoUrl}`);
      const detectionResponse = await detectAnomalies(relativeVideoUrl);

      // --- 3. PROCESS UPDATED RESPONSE ---
      const responseData = detectionResponse.data;

      // Check if the response format is as expected
      if (responseData && typeof responseData === 'object' && Array.isArray(responseData.events)) {
        console.log("Anomalies received:", responseData.events);
        setDetectedAnomalies(responseData.events);

        // Trigger email pop-up based on the backend flag
        if (responseData.email_sent_attempted === true) {
          console.log("Backend confirmed email attempt, showing pop-up.");
          setShowEmailAlertPopup(true);
        } else {
          console.log("Backend indicated no email was sent.");
        }
      } else {
        console.log("No anomalies detected or unexpected response format:", responseData);
        setDetectedAnomalies([]);
      }
      // --- END OF CHANGE ---

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

  // ... (useEffect for video end, handlePopupClose, handleTimestampSelect, video controls remain unchanged) ...
  useEffect(() => {
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
    setShowAnalysisCompletePopup(false);
    console.log("Analysis complete popup closed.");
  };
  const handleTimestampSelect = (time: string) => {
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
      if (videoRef.current) { if (isPlaying) videoRef.current.pause(); else videoRef.current.play(); setIsPlaying(!isPlaying); }
  };
  const rewind = () => { if (videoRef.current) videoRef.current.currentTime -= 10; };
  const fastForward = () => { if (videoRef.current) videoRef.current.currentTime += 10; };
  const previousVideo = () => { handleFeedSelect(selectedFeed || feeds[0].name); };
  const nextVideo = () => { handleFeedSelect(selectedFeed || feeds[0].name); };


  return (
    <div className="main-layout">
      {/* ... (Sidebars, Video Player remain unchanged) ... */}
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
      <main className="center-video">
        {selectedFeed ? (
          <>
            <div className="video-container">
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
      <aside className="sidebar right">
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

      {/* --- Email Alert Pop-up (Unchanged JSX, logic moved to handleFeedSelect) --- */}
      {showEmailAlertPopup && (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 200
        }} onClick={() => setShowEmailAlertPopup(false)}>
          <div style={{
              background: 'var(--glass-bg)', padding: '2rem', borderRadius: '20px',
              backdropFilter: 'var(--blur)', border: '1px solid var(--glass-border)',
              textAlign: 'center', maxWidth: '300px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: 'var(--accent-blue)', marginBottom: '1rem' }}>Alert Sent!</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              An email with the evidence clip has been successfully sent.
            </p>
            <button onClick={() => setShowEmailAlertPopup(false)} style={{ padding: '0.75rem 1.5rem', background: 'var(--accent-blue)', color: 'var(--text-primary)', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '500' }}>
              OK
            </button>
          </div>
        </div>
      )}

      {/* --- Playback Finished Pop-up (Unchanged JSX) --- */}
      {showAnalysisCompletePopup && (
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
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Playback Finished</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              The video has finished playing.
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
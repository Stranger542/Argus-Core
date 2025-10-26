import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';  // For redirect
import './App.css';  // Global styles
import { getRandomVideo } from '../services/api'; // Import the new API function

const HomePage: React.FC = () => {
  const [selectedFeed, setSelectedFeed] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null); // State for the video URL
  const [isPlaying, setIsPlaying] = useState(false);  // For play/pause toggle
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);  // For dialog
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();  // For navigation

  // Mock data from screenshots
  const feeds = [
    { id: 1, name: 'Feed 1 - Lobby (Live)' },
    { id: 2, name: 'Feed 2 - Parking (Live)' },
    { id: 3, name: 'Feed 3 - Entrance (Offline)' },
    { id: 4, name: 'Feed 4 - Warehouse (Live)' },
    { id: 5, name: 'Feed 5 - Roof (Live)' }
  ];

  const timestamps = [
    { id: 1, event: 'Robbery Detected', time: 'Oct 2, 2025 2:30 PM' },
    { id: 2, event: 'Break-in Attempt', time: 'Oct 1, 2025 4:45 PM' },
    { id: 3, event: 'Unauthorized Entry', time: 'Sep 30, 2025 9:00 AM' },
    { id: 4, event: 'Anomaly Detected', time: 'Sep 29, 2025 11:15 AM' }
  ];

  const handleFeedSelect = async (feedName: string) => {
    setSelectedFeed(feedName);
    try {
      const response = await getRandomVideo();
      const fullVideoUrl = `http://localhost:8000${response.data.video_url}`;
      setVideoUrl(fullVideoUrl);
      if (videoRef.current) {
        videoRef.current.src = fullVideoUrl;
        videoRef.current.play(); // Autoplay the new video
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Error fetching random video:", error);
      // Handle error (e.g., show a message to the user)
    }
  };

  const handleTimestampSelect = (time: string) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.random() * 60;  // Mock seek
      console.log(`Seeking to ${time}`);
    }
  };

  // Functions for 5-button controls
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const rewind = () => {
    if (videoRef.current) videoRef.current.currentTime -= 10;
  };

  const fastForward = () => {
    if (videoRef.current) videoRef.current.currentTime += 10;
  };

  const previousVideo = () => {
    console.log('Switch to previous video');  // Mock - replace with real logic later
  };

  const nextVideo = () => {
    console.log('Switch to next video');  // Mock - replace with real logic later
  };

  // Logout handlers
  const handleLogoutConfirm = () => {
    setShowLogoutDialog(false);
    navigate('/login');  // Redirect to login
  };

  const handleLogoutCancel = () => {
    setShowLogoutDialog(false);  // Close dialog, stay on page
  };

  return (
    <div className="main-layout" style={{ marginTop: '30px' }}>  {/* Moved down to avoid header overlap */}
      {/* Left Sidebar */}
      <aside className="sidebar left">
        <h2>Active Feeds</h2>
        <ul className="feed-list">
          {feeds.map((feed) => (
            <li key={feed.id} className={selectedFeed === feed.name ? 'feed-item selected' : 'feed-item'}>
              <button onClick={() => handleFeedSelect(feed.name)}>{feed.name}</button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Center Video */}
      <main className="center-video" style={{ flex: 1, padding: '20px 5px' }}>  {/* Full flex to occupy space */}
        {selectedFeed ? (
          <>
            <div className="video-container" style={{ height: '80vh' }}>  {/* Larger height to occupy more space */}
              <video ref={videoRef} className="video-player" controls autoPlay muted>
                {videoUrl && <source src={videoUrl} type="video/mp4" />}
                Live feed: {selectedFeed}
              </video>
              <div className="anomaly-overlay">Anomaly Detected</div>  {/* Red box overlay */}
            </div>
            <div className="video-controls">
              <button onClick={previousVideo} data-tooltip="Previous Video"> ⏮ </button>
              <button onClick={rewind} data-tooltip="Rewind 10s">⏪</button>
              <button onClick={togglePlayPause} data-tooltip={isPlaying ? "Pause" : "Play"}>
                {isPlaying ? '⏸️' : '▶️'}
              </button>
              <button onClick={fastForward} data-tooltip="Forward 10s">⏩</button>
              <button onClick={nextVideo} data-tooltip="Next Video">⏭</button>
            </div>
          </>
        ) : (
          <div className="placeholder" style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Select a feed to view live surveillance</div>
        )}
      </main>

      {/* Right Sidebar */}
      <aside className="sidebar right">
        <h2>Approved Timestamps</h2>
        <ul className="timestamp-list">
          {timestamps.map((ts) => (
            <li key={ts.id} className="timestamp-item">
              <button onClick={() => handleTimestampSelect(ts.time)}>
                <div className="timestamp-event">{ts.event}</div>
                <div className="timestamp-time">{ts.time}</div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Logout Button - Bottom Right Fixed - Moved up */}
      <button
        onClick={() => setShowLogoutDialog(true)}
        style={{
          position: 'fixed',
          bottom: '80px',  // Moved up to avoid overlap
          right: '50px',
          background: 'var(--accent-red)',
          color: 'var(--text-primary)',
          border: 'none',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          fontSize: '1.2rem',
          cursor: 'pointer',
          boxShadow: '0 4px 15px rgba(215, 38, 56, 0.4)',
          transition: 'all 0.3s ease',
          zIndex: 100
        }}
        title="Logout"
        aria-label="Logout"
      >
        ⏻
      </button>

      {/* Centered Dialog Box */}
      {showLogoutDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200
          }}
          onClick={handleLogoutCancel}  // Close on outside click
        >
          <div
            style={{
              background: 'var(--glass-bg)',
              padding: '2rem',
              borderRadius: '20px',
              backdropFilter: 'var(--blur)',
              border: '1px solid var(--glass-border)',
              textAlign: 'center',
              maxWidth: '300px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}  // Prevent close on dialog click
          >
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Are you sure you want to log out?</h3>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={handleLogoutConfirm}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'var(--accent-red)',
                  color: 'var(--text-primary)',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Yes
              </button>
              <button
                onClick={handleLogoutCancel}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'var(--accent-blue)',
                  color: 'var(--text-primary)',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
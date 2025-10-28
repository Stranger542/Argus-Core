import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'  // For redirect
import { useAuth } from '../context/AuthProvider'
import { getRandomVideo, detectAnomalies, getIncidentById } from '../services/api';
import './App.css'  // Global styles

const HomePage: React.FC = () => {
  const [selectedFeed, setSelectedFeed] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)  // For play/pause toggle
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)  // For dialog
  const [framesCount, setFramesCount] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  // Canvas used to capture frames from the video element
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  // requestAnimationFrame id so we can cancel when stopping
  const rafRef = useRef<number | null>(null)
  // store captured frame blobs (kept in ref to avoid re-renders)
  const framesRef = useRef<Blob[]>([])
  const [detectedAnomalies, setDetectedAnomalies] = useState<any[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [showAnalysisCompletePopup, setShowAnalysisCompletePopup] = useState(false)
  const navigate = useNavigate()  // For navigation
  const { user, signOut } = useAuth()
  const feeds = [ // Mock data
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
    setSelectedFeed(feedName)
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
  // Capture loop: draw video to canvas and export PNG blob
  const startCapture = () => {
    const video = videoRef.current
    let canvas = canvasRef.current
    if (!video) return

    console.log('startCapture called', { videoAvailable: !!video })

    if (!canvas) {
      // create a hidden canvas if one doesn't exist yet
      canvas = document.createElement('canvas')
      canvas.style.display = 'none'
      document.body.appendChild(canvas)
      canvasRef.current = canvas
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // size canvas to video dimensions (fallback to client size)
    canvas.width = video.videoWidth || video.clientWidth || 640
    canvas.height = video.videoHeight || video.clientHeight || 360

    const loop = () => {
      if (!video || video.paused || video.ended) return
      try {
        // small debug log to show we're attempting to draw (won't spam heavily)
        if (framesRef.current.length % 30 === 0) {
          console.log('capture loop running — captured so far', framesRef.current.length)
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      } catch (e) {
        // drawing might fail if cross-origin restrictions apply
        console.warn('drawImage failed (CORS?).', e)
        return
      }

      // Export current frame as PNG blob (async)
      canvas.toBlob((blob) => {
        if (blob) {
          // store blob for later retrieval; keep recent N if desired
          framesRef.current.push(blob)
          setFramesCount(framesRef.current.length)
          // For quick debugging, expose the blob size and a preview URL
          const url = URL.createObjectURL(blob)
          // Log instead of creating DOM elements to keep UI minimal
          console.log('Captured frame blob:', { size: blob.size, url })
          // revoke the object URL after a short time to avoid leaks
          setTimeout(() => URL.revokeObjectURL(url), 5000)

          // send the frame to backend for analysis/ingest
          sendFrame(blob)
        }
      }, 'image/png')

      rafRef.current = requestAnimationFrame(loop)
    }

    // kick off
    rafRef.current = requestAnimationFrame(loop)
  }

  const stopCapture = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  // Attach play/pause listeners so captures start/stop automatically
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onPlay = () => {
      console.log('video onPlay event')
      setIsPlaying(true)
      startCapture()
    }
    const onPause = () => {
      console.log('video onPause/ended event')
      setIsPlaying(false)
      stopCapture()
    }
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    v.addEventListener('ended', onPause)
    return () => {
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
      v.removeEventListener('ended', onPause)
      stopCapture()
    }
  }, [])

  // Functions for 5-button controls
  const togglePlayPause = () => {
    try{
      if (videoRef.current) {
        if (isPlaying) {
          videoRef.current.pause();
        } else {
           console.log("No anomalies detected or unexpected response format.");
           setDetectedAnomalies([]);
        }
  
      }
    } catch (error: any) {
      console.error("Error during video selection or detection:", error);
      if (error.response && error.response.status == 401) {
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
  const rewind = () => { if (videoRef.current) videoRef.current.currentTime -= 10; };
  const fastForward = () => { if (videoRef.current) videoRef.current.currentTime += 10; };
  const previousVideo = () => { handleFeedSelect(selectedFeed || feeds[0].name); }; // Reload current/first feed
  const nextVideo = () => { handleFeedSelect(selectedFeed || feeds[0].name); }; // Reload current/first feed

  // Logout handlers
  const handleLogoutConfirm = () => {
    setShowLogoutDialog(false)
    ;(async () => {
      try {
        await signOut()
      } catch (e) {
        console.warn('signOut failed', e)
      }
      navigate('/login')
    })()
  }

  const handleLogoutCancel = () => {
    setShowLogoutDialog(false);  // Close dialog, stay on page
  };

  // Helpers to access captured frame blobs
  const downloadLastFrame = () => {
    const frames = framesRef.current
    if (!frames || frames.length === 0) return
    const blob = frames[frames.length - 1]
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `frame-${Date.now()}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  const clearFrames = () => {
    framesRef.current = []
    setFramesCount(0)
  }

  // Send a captured PNG blob to the backend frames upload endpoint
  const sendFrame = async (blob: Blob) => {
    try {
      console.log('sendFrame called', { size: blob.size })
      const fd = new FormData()
      // camera id can be set dynamically; default to 1 for now
      fd.append('camera_id', '1')
      fd.append('timestamp', new Date().toISOString())
      // Convert PNG blob to JPG blob for better compatibility
      const jpgBlob = await new Promise<Blob>((resolve) => {
        const canvas = document.createElement('canvas')
        const img = new Image()
        img.onload = () => {
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(img, 0, 0)
            canvas.toBlob((blob) => {
              if (blob) resolve(blob)
            }, 'image/jpeg', 0.95)
          }
        }
        img.src = URL.createObjectURL(blob)
      })
      fd.append('file', jpgBlob, `frame-${Date.now()}.jpg`)

      const backendOrigin = `http://0.0.0.0:8000`  // hardcoded for dev

      const headers: Record<string, string> = {}
      // if (apiKey) headers['x-api-key'] = apiKey

      const res = await fetch(`${backendOrigin}/frames/upload-dev`, {
        method: 'POST',
        body: fd,
        mode: 'cors',
        credentials: 'include',
        headers: {
          ...headers,
          'Accept': 'application/json',
        }
      })
      console.log('upload response', { ok: res.ok, status: res.status })
      if (!res.ok) {
        console.warn('Frame upload failed', res.status, await res.text())
      }
    } catch (e) {
      console.warn('sendFrame error', e)
    }
  }

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
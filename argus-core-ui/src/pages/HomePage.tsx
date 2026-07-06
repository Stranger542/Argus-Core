import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';
import { uploadVideoForAnalysis, getClip, getIncident } from '../services/api';
import { QRCodeSVG } from 'qrcode.react';

const HomePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'qr'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | undefined>(undefined);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedAnomalies, setDetectedAnomalies] = useState<any[]>([]);
  const [showEmailAlertPopup, setShowEmailAlertPopup] = useState(false);
  
  const [sessionId, setSessionId] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (activeTab === 'qr' && !sessionId) {
      setSessionId(Math.random().toString(36).substring(7));
    }
  }, [activeTab, sessionId]);

  // --- SECURE WEBSOCKET LISTENER ---
  useEffect(() => {
    if (activeTab === 'qr' && sessionId) {
      const token = localStorage.getItem('access_token');
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      
      // Route through the Vite proxy and pass the secure token
      const wsUrl = `${protocol}//${window.location.host}/ws/live/${sessionId}/desktop?token=${token}`;
      const ws = new WebSocket(wsUrl);
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'frame') {
          if (videoRef.current) {
             videoRef.current.src = data.image;
          }
        } else if (data.type === 'alert') {
          console.warn("CRIME DETECTED:", data.event);
          setDetectedAnomalies(prev => [...prev, { event: data.event, confidence: data.confidence, time: new Date().toISOString() }]);
        }
      };
      
      return () => ws.close(); 
    }
  }, [activeTab, sessionId]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setVideoUrl(URL.createObjectURL(file)); 
      setDetectedAnomalies([]);
      setShowEmailAlertPopup(false);
      setIsPlaying(false);
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) { 
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };
  
  const rewind = () => { if (videoRef.current) videoRef.current.currentTime -= 10; };
  const fastForward = () => { if (videoRef.current) videoRef.current.currentTime += 10; };
  const restart = () => { 
    if (videoRef.current) { 
      videoRef.current.currentTime = 0; 
      videoRef.current.play(); 
    } 
  };

  const handleAnalyzeClick = async () => {
    if (!selectedFile) return;
    
    setIsAnalyzing(true);
    setDetectedAnomalies([]);

    try {
      const response = await uploadVideoForAnalysis(selectedFile);
      const { clip_id, incident_id } = response.data;

      if (clip_id) {
          const clipResponse = await getClip(clip_id);
          const secureBlobUrl = URL.createObjectURL(clipResponse.data);
          setVideoUrl(secureBlobUrl);
          
          if (videoRef.current) {
              videoRef.current.load();
              videoRef.current.play().catch(e => console.log("Auto-play prevented", e));
              setIsPlaying(true);
          }
      }

      if (incident_id) {
          let isProcessing = true;
          
          while (isProcessing) {
              await new Promise(resolve => setTimeout(resolve, 3000));
              
              try {
                  const statusRes = await getIncident(incident_id);
                  const incident = statusRes.data;

                  if (incident.status !== "analyzing") {
                      isProcessing = false;
                      setIsAnalyzing(false);
                      
                      if (incident.note) {
                          const parsedEvents = JSON.parse(incident.note);
                          setDetectedAnomalies(parsedEvents);
                      }
                      
                      if (incident.status === "detected_from_upload") {
                          setShowEmailAlertPopup(true);
                      }
                  }
              } catch (pollError) {
                  console.error("Error checking status:", pollError);
                  isProcessing = false; 
                  setIsAnalyzing(false);
              }
          }
      }

    } catch (error: any) {
      console.error("Error during analysis:", error);
      setIsAnalyzing(false);
      if (error.response?.status === 401) {
        alert("Session expired. Please log in again.");
        localStorage.removeItem('access_token');
        navigate('/login');
      } else {
        alert("Failed to analyze video. Check backend logs.");
      }
    }
  };

  return (
    <div className="main-layout">
      <aside className="sidebar left">
        <div style={{ 
          display: 'flex', 
          background: 'var(--bg-secondary)', 
          borderRadius: '8px', 
          padding: '4px', 
          marginBottom: '24px', 
          gap: '4px' 
        }}>
          <button 
            onClick={() => setActiveTab('upload')}
            style={{ 
              flex: 1, padding: '10px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s',
              background: activeTab === 'upload' ? '#F3F4F6' : 'transparent',
              color: activeTab === 'upload' ? '#111827' : 'var(--text-secondary)',
              boxShadow: activeTab === 'upload' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            📁 Upload
          </button>
          <button 
            onClick={() => setActiveTab('qr')}
            style={{ 
              flex: 1, padding: '10px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s',
              background: activeTab === 'qr' ? '#F3F4F6' : 'transparent',
              color: activeTab === 'qr' ? '#111827' : 'var(--text-secondary)',
              boxShadow: activeTab === 'qr' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            📱 Live QR
          </button>
        </div>

        {activeTab === 'upload' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Upload a local CCTV recording to scan for anomalies.
            </p>
            
            <input 
              type="file" 
              accept="video/mp4,video/avi,video/quicktime,video/webm"
              style={{ display: 'none' }}
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              style={{ 
                padding: '16px', borderRadius: '8px', 
                background: '#333333', 
                border: '1px dashed #00BFFF', 
                color: 'var(--text-primary)', 
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#404040'}
              onMouseOut={(e) => e.currentTarget.style.background = '#333333'}
            >
              {selectedFile ? selectedFile.name : 'Select Video File'}
            </button>

            <button 
              onClick={handleAnalyzeClick}
              disabled={!selectedFile || isAnalyzing}
              style={{ 
                padding: '14px', borderRadius: '8px', 
                background: isAnalyzing ? 'var(--bg-secondary)' : 'var(--accent-violet)', 
                color: 'white', border: 'none', 
                cursor: (!selectedFile || isAnalyzing) ? 'not-allowed' : 'pointer', 
                fontWeight: 'bold', fontSize: '1rem',
                opacity: (!selectedFile || isAnalyzing) ? 0.6 : 1,
                transition: 'all 0.2s'
              }}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Evidence'}
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Scan with your phone to start live stream
            </p>
            
          {sessionId && (
           <div style={{ background: 'white', padding: '10px', borderRadius: '8px', display: 'inline-block' }}>
               {/* Bake the redirect directly into the QR code! */}
               <QRCodeSVG 
                  value={`${window.location.origin}/login?redirect=${encodeURIComponent('/mobile-camera/' + sessionId)}`} 
                   size={160} 
                  />
               </div>
              )}
            
            <p style={{ marginTop: '20px', fontSize: '0.8rem', color: 'var(--accent-blue)' }}>
              Session: {sessionId}
            </p>
          </div>
        )}
      </aside>

      <main className="center-video">
        {videoUrl || activeTab === 'qr' ? (
          <>
            <div className="video-container">
              <video 
                ref={videoRef} 
                className="video-player" 
                src={videoUrl}
                controls={activeTab === 'upload'} 
                muted 
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            </div>
            
            {activeTab === 'upload' && (
              <div className="video-controls">
                <button onClick={restart} title="Restart"> ⏮ </button>
                <button onClick={rewind} title="Rewind 10s"> ⏪ </button>
                <button onClick={togglePlayPause} title={isPlaying ? "Pause" : "Play"}>
                  {isPlaying ? '⏸️' : '▶️'}
                </button>
                <button onClick={fastForward} title="Forward 10s"> ⏩ </button>
              </div>
            )}
          </>
        ) : (
          <div className="placeholder" style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Select an operational mode from the left panel.
          </div>
        )}
      </main>

      <aside className="sidebar right">
        <h2>Analysis Results</h2>
        <ul className="timestamp-list">
          {isAnalyzing ? (
            <li style={{ color: 'var(--accent-blue)' }}>Running 3D CNN inference...</li>
          ) : detectedAnomalies.length > 0 ? (
            detectedAnomalies.map((ts, index) => (
              <li key={index} className="timestamp-item" style={{ padding: '10px', background: 'rgba(215, 38, 56, 0.1)', borderRadius: '8px', marginBottom: '8px', border: '1px solid var(--accent-red)' }}>
                  <div className="timestamp-event">{ts.event} ({(ts.confidence * 100).toFixed(1)}%)</div>
                  <div className="timestamp-time">{new Date(ts.time).toLocaleTimeString()}</div>
              </li>
            ))
          ) : (
            <li>{selectedFile || activeTab === 'qr' ? 'No anomalies detected.' : 'Awaiting video...'}</li>
          )}
        </ul>
      </aside>

      {showEmailAlertPopup && (
         <div style={{ position: 'fixed', top: 20, right: 20, background: 'var(--accent-blue)', color: 'white', padding: '15px 25px', borderRadius: '8px', zIndex: 1000, boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
           🚨 Alert Sent! Evidence emailed to your account.
           <button onClick={() => setShowEmailAlertPopup(false)} style={{ marginLeft: '15px', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
         </div>
      )}
    </div>
  );
};

export default HomePage;
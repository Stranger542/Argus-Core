import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const MobileCameraPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [status, setStatus] = useState('Ready to Broadcast');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setStatus('Invalid Session ID');
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      // Append the destination to the URL so it cannot be lost
      const targetUrl = encodeURIComponent(`/mobile-camera/${sessionId}`);
      navigate(`/login?redirect=${targetUrl}`);
      return;
    }
  }, [sessionId, navigate]);

  // 2. The User-Triggered Camera Start
  const startBroadcast = async () => {
    try {
      setStatus('Requesting Camera...');
      
      // Request Camera FIRST (User tap guarantees browser allows this)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Connect Secure WebSocket AFTER camera is live
      const token = localStorage.getItem('access_token');
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/live/${sessionId}/mobile?token=${token}`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('🟢 Live Streaming to Argus Core');
        setIsBroadcasting(true);
        
        // Start pumping frames to the backend
        captureIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN && videoRef.current && canvasRef.current) {
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            
            if (context) {
               canvas.width = 224; 
               canvas.height = 224;
               context.drawImage(videoRef.current, 0, 0, 224, 224);
               const frameData = canvas.toDataURL('image/jpeg', 0.6);
               ws.send(frameData);
            }
          }
        }, 150); // ~6.6 FPS
      };
      
      ws.onerror = () => {
        setStatus('🔴 Connection Error');
        setIsBroadcasting(false);
      };
      ws.onclose = () => {
        setStatus('⚪ Disconnected');
        setIsBroadcasting(false);
      };

    } catch (err) {
      console.error("Camera error:", err);
      setStatus('🔴 Camera Access Denied');
    }
  };

  // 3. Cleanup everything if the user closes the app
  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
      if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  return (
    <div style={{ 
        background: '#0D0D0D', minHeight: '100vh', 
        display: 'flex', flexDirection: 'column', alignItems: 'center', 
        justifyContent: 'center', padding: '20px', fontFamily: 'sans-serif' 
    }}>
      <h2 style={{ color: 'white', marginBottom: '10px' }}>Argus Edge Node</h2>
      
      <p style={{ 
          color: status.includes('Live') ? '#00BFFF' : (status.includes('Error') || status.includes('Denied') ? '#D72638' : 'white'),
          fontWeight: 'bold', marginBottom: '20px', textAlign: 'center'
      }}>
        {status}
      </p>

      {/* BIG PLAY BUTTON to satisfy mobile browser autoplay blocks */}
      {!isBroadcasting && status !== '🔴 Camera Access Denied' && (
        <button 
          onClick={startBroadcast}
          style={{
            padding: '15px 30px', fontSize: '1.2rem', fontWeight: 'bold',
            background: 'var(--accent-violet)', color: 'white',
            border: 'none', borderRadius: '8px', marginBottom: '20px', cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(138, 43, 226, 0.4)'
          }}
        >
          Start Broadcast Feed
        </button>
      )}

      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        style={{ 
            width: '100%', maxWidth: '400px', 
            borderRadius: '16px', border: '2px solid rgba(255,255,255,0.1)',
            boxShadow: isBroadcasting ? '0 8px 32px rgba(0,191,255,0.2)' : 'none',
            display: isBroadcasting ? 'block' : 'none' // Hide black box until active
        }} 
      />
      
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '30px', fontSize: '0.8rem' }}>
        Keep this page open to continue broadcasting.
      </p>
    </div>
  );
};

export default MobileCameraPage;
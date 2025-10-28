import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { login } from '../services/api'; // Import the login function
import '../App.css';

interface Props {
  isDark?: boolean;
}

const LoginPage: React.FC<Props> = ({ isDark }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.message) {
      setMessage(location.state.message);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // --- THIS IS NO LONGER A BYPASS ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null); // Clear previous messages

    // The backend's OAuth2 form expects 'username' and 'password'
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    try {
      const response = await login(formData);
      
      // --- THIS IS THE KEY ---
      // Save the token on successful login
      localStorage.setItem('access_token', response.data.access_token);

      navigate('/feed'); // Go to homepage
    } catch (err: any) {
      console.error("Login failed:", err);
      if (err.response && (err.response.status === 401 || err.response.status === 400)) {
        setMessage("Incorrect email or password.");
      } else {
        setMessage("An error occurred. Please try again.");
      }
      setIsLoading(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', minHeight: 'calc(100vh - 60px)' }}>
      <form onSubmit={handleSubmit} style={{ 
        background: 'var(--glass-bg)', padding: '2.5rem', borderRadius: '20px', backdropFilter: 'var(--blur)', 
        border: '1px solid var(--glass-border)', width: '100%', maxWidth: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' 
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--accent-violet)', fontSize: '1.5rem' }}>Welcome Back</h2>
        {message && <p style={{ 
          color: message.includes("successful") ? 'var(--accent-blue)' : 'var(--accent-red)', 
          textAlign: 'center', marginBottom: '1rem', padding: '0.75rem', 
          background: message.includes("successful") ? 'rgba(0, 191, 255, 0.2)' : 'rgba(215, 38, 56, 0.2)', 
          borderRadius: '8px', 
          border: `1px solid ${message.includes("successful") ? 'var(--accent-blue)' : 'var(--accent-red)'}` 
        }}>{message}</p>}
        <input
          type="email"
          placeholder="Email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ 
            width: '100%', padding: '12px 16px', marginBottom: '1rem', border: '1px solid var(--glass-border)', 
            borderRadius: '12px', background: 'var(--glass-bg)', color: 'var(--text-primary)', fontSize: '1rem', 
            backdropFilter: 'var(--blur)' 
          }}
          required
          disabled={isLoading}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ 
            width: '100%', padding: '12px 16px', marginBottom: '1rem', border: '1px solid var(--glass-border)', 
            borderRadius: '12px', background: 'var(--glass-bg)', color: 'var(--text-primary)', fontSize: '1rem', 
            backdropFilter: 'var(--blur)' 
          }}
          required
          disabled={isLoading}
        />
        <button type="submit" style={{ 
          width: '100%', padding: '12px', background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-violet))', 
          border: 'none', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '1rem', cursor: 'pointer', 
          boxShadow: '0 4px 15px rgba(0, 191, 255, 0.3)', transition: 'all 0.3s',
          opacity: isLoading ? 0.7 : 1
        }} disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
        <p style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-secondary)' }}>
          No account? <Link to="/register" style={{ color: 'var(--accent-red)', textDecoration: 'none', fontWeight: '500' }}>Register here</Link>
        </p>
      </form>
    </div>
  );
};

export default LoginPage;
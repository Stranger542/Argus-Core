import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { login } from '../services/api'; 

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
    // 1. Handle Toast Messages
    if (location.state?.message) {
      setMessage(location.state.message);
      window.history.replaceState({}, document.title);
    }
    
    // 2. Auto-forward if already logged in!
    const token = localStorage.getItem('access_token');
    if (token) {
      const searchParams = new URLSearchParams(location.search);
      const redirectUrl = searchParams.get('redirect');
      if (redirectUrl) {
          navigate(redirectUrl, { replace: true });
      }
    }
  }, [location, navigate]);

  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null); 

    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    try {
      const response = await login(formData);
      localStorage.setItem('access_token', response.data.access_token);
      const searchParams = new URLSearchParams(location.search);
      const redirectUrl = searchParams.get('redirect');
      
      if (redirectUrl) {
          navigate(redirectUrl, { replace: true }); // Go to the camera!
      } else {
          navigate('/feed', { replace: true }); // Standard fallback
      }
      
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
    <div className="auth-page-gradient-bg">
      <form onSubmit={handleSubmit} className="auth-form">
        <img src="/argus-logo.png" alt="Argus Logo" className="auth-form-logo" />
        <h2>Welcome Back</h2>
        
        {message && (
          <p className={`auth-message ${message.includes("successful") ? 'success' : 'error'}`}>
            {message}
          </p>
        )}

        <input
          type="email"
          placeholder="Email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
        
        <p className="auth-redirect-link">
          No account? <Link to="/register">Register here</Link>
        </p>
      </form>
    </div>
  );
};

export default LoginPage;
// src/pages/LoginPage.tsx
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
    if (location.state?.message) {
      setMessage(location.state.message);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

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
      navigate('/feed');
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
    // This is the new full-page gradient container
    <div className="auth-page-gradient-bg">
      
      {/* This is the centered form card */}
      <form onSubmit={handleSubmit} className="auth-form">
        
        {/* --- 1. LOGO ADDED INSIDE THE FORM --- */}
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
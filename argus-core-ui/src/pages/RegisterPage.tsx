// src/pages/RegisterPage.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../services/api'; 

const Spinner = () => (
  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
    }

    setIsLoading(true);

    try {
      await register({ email, password });
      navigate('/login', { 
        state: { message: "Registration successful. Please log in." } 
      });

    } catch (err: any) {
      console.error("Registration failed:", err);
      if (err.response && err.response.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Registration failed. Please try again.");
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

        <h2>Create Account</h2>
        
        {error && <p className="auth-message error">{error}</p>}

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          disabled={isLoading}
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="6+ characters"
          required
          disabled={isLoading}
        />

        <label htmlFor="confirmPassword">Confirm Password</label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter password"
          required
          disabled={isLoading}
        />

        <button type="submit" disabled={isLoading}>
          {isLoading ? <Spinner /> : 'Create Account'}
        </button>

        <p className="auth-redirect-link">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </form>
    </div>
  )
}

export default RegisterPage;
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../services/api'; // Import the register function
import '../App.css';

import { getSupabase } from '../services/supabaseClient'

// Use Supabase to create a new user account
const registerUser = async (email: string, password: string) => {
  const client = await getSupabase()
  const { error } = await client.auth.signUp({ email, password })
  if (error) throw error
  return true
}

// Spinner Component (your code—kept as-is)
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

  // --- THIS IS NO LONGER A BYPASS ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Check if passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    // 2. Check for password length
    if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
    }

    setIsLoading(true);

    try {
      // 3. Call the register API
      // The backend expects a JSON object { email, password }
      await register({ email, password });

      // 4. On success, redirect to login with a success message
      navigate('/login', { 
        state: { message: "Registration successful. Please log in." } 
      });

    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', minHeight: 'calc(100vh - 60px)' }}>
      <form onSubmit={handleSubmit} style={{ 
        background: 'var(--glass-bg)', padding: '2.5rem', borderRadius: '20px', backdropFilter: 'var(--blur)', 
        border: '1px solid var(--glass-border)', width: '100%', maxWidth: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' 
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--accent-violet)', fontSize: '1.5rem' }}>Create Account</h2>
        
        {error && <p style={{ color: 'var(--accent-red)', textAlign: 'center', marginBottom: '1rem', padding: '0.75rem', background: 'rgba(215, 38, 56, 0.2)', borderRadius: '8px', border: '1px solid var(--accent-red)' }}>{error}</p>}

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: '500' }} htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ 
              width: '100%', padding: '12px 16px', border: '1px solid var(--glass-border)', borderRadius: '12px', 
              background: 'var(--glass-bg)', color: 'var(--text-primary)', fontSize: '1rem', backdropFilter: 'var(--blur)',
              transition: 'all 0.3s'
            }}
            placeholder="you@example.com"
            required
            disabled={isLoading}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: '500' }} htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ 
              width: '100%', padding: '12px 16px', border: '1px solid var(--glass-border)', borderRadius: '12px', 
              background: 'var(--glass-bg)', color: 'var(--text-primary)', fontSize: '1rem', backdropFilter: 'var(--blur)',
              transition: 'all 0.3s'
            }}
            placeholder="6+ characters"
            required
            disabled={isLoading}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: '500' }} htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{ 
              width: '100%', padding: '12px 16px', border: '1px solid var(--glass-border)', borderRadius: '12px', 
              background: 'var(--glass-bg)', color: 'var(--text-primary)', fontSize: '1rem', backdropFilter: 'var(--blur)',
              transition: 'all 0.3s'
            }}
            placeholder="Re-enter password"
            required
            disabled={isLoading}
          />
        </div>

        <button 
          type="submit"
          style={{ 
            width: '100%', padding: '12px', background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-violet))', 
            border: 'none', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '1rem', cursor: 'pointer', 
            boxShadow: '0 4px 15px rgba(0, 191, 255, 0.3)', transition: 'all 0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: isLoading ? 0.7 : 1
          }}
          disabled={isLoading}
        >
          {isLoading ? <Spinner /> : 'Create Account'}
        </button>

        <p style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-secondary)' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: '500' }}>Login here</Link>
        </p>
      </form>
    </div>
  )
}

export default RegisterPage;
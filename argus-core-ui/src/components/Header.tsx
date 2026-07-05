// src/components/Header.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Header: React.FC = () => {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const navigate = useNavigate();
  const handleLogoutConfirm = () => {
    setShowLogoutDialog(false);
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  const handleLogoutCancel = () => {
    setShowLogoutDialog(false);
  };
  const toggleTheme = () => {
    console.log("Theme toggled");
  };

  return (
    <>
      <header className="header">
        <h1>Argus Core</h1>
        <nav className="header-nav">
          <Link to="/feed">Feed</Link>
          <Link to="/about">About</Link>
          <Link to="/settings">Settings</Link>
        </nav>

        <div className="header-controls">
          {/* theme 
          */}
          <label className="theme-toggle" title="Toggle theme">
            <input type="checkbox" onChange={toggleTheme} />
            <span className="slider">
              <span className="sun">☀️</span>
              <span className="moon">🌙</span>
            </span>
          </label>
          
          <button 
            onClick={() => setShowLogoutDialog(true)} 
            className="logout-button" 
            title="Logout"
          >
            ⏻
          </button>
        </div>
      </header>

      {/* Logout Dialog */}
      {showLogoutDialog && (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 200
         }} onClick={handleLogoutCancel}>
          <div style={{
              background: 'var(--glass-bg)', padding: '2rem', borderRadius: '20px',
              backdropFilter: 'var(--blur)', border: '1px solid var(--glass-border)',
              textAlign: 'center', maxWidth: '300px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
           }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Are you sure?</h3>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={handleLogoutConfirm} style={{ padding: '0.75rem 1.5rem', background: 'var(--accent-red)', color: 'var(--text-primary)', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '500' }}>Logout</button>
              <button onClick={handleLogoutCancel} style={{ padding: '0.75rem 1.5rem', background: 'var(--accent-blue)', color: 'var(--text-primary)', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '500' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
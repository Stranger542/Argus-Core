// src/App.tsx
import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { NavLink } from 'react-router-dom' 

// Page Imports
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AboutPage from './pages/AboutPage'
import SettingsPage from './pages/SettingsPage'
import IncidentDetailPage from './pages/IncidentDetailPage'
import IncidentListPage from './pages/IncidentListPage' // <-- 1. IMPORT NEW PAGE

import './App.css'

// --- PrivateRoute Component ---
const PrivateRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const token = localStorage.getItem('access_token');
  return token ? children : <Navigate to="/login" replace />;
};

// --- ProtectedLayout Component ---
const ProtectedLayout: React.FC<{
  isDark: boolean;
  toggleTheme: () => void;
  handleLogout: () => void;
}> = ({ isDark, toggleTheme, handleLogout }) => {
  return (
    <div className="app-container">
      <header className="header">
        <h1>Argus Core</h1>
        
        <nav className="header-nav">
          <NavLink to="/feed">Feed</NavLink>
          {/* --- 2. ADD NAV LINK --- */}
          <NavLink to="/incidents">Incidents</NavLink> 
          <NavLink to="/about">About</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>

        <div className="header-controls">
          <label className="theme-toggle" title="Toggle theme">
            <input type="checkbox" checked={isDark} onChange={toggleTheme} />
            <span className="slider">
              <span className="icon sun">☀️</span>
              <span className="icon moon">🌙</span>
            </span>
          </label>
          <button 
            onClick={handleLogout} 
            className="logout-button" 
            title="Logout"
          >
            ⏻
          </button>
        </div>
      </header>

      <main className="content-container">
        <Outlet />
      </main>
    </div>
  );
};


function App() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    // ... (theme logic is unchanged)
    try {
      const saved = localStorage.getItem('theme')
      if (saved === 'light') return false
      if (saved === 'dark') return true
    } catch (e) {}
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return true
  });

  useEffect(() => {
    // ... (theme logic is unchanged)
    try {
      if (isDark) {
        document.documentElement.classList.remove('light')
        localStorage.setItem('theme', 'dark')
      } else {
        document.documentElement.classList.add('light')
        localStorage.setItem('theme', 'light')
      }
    } catch (e) {}
  }, [isDark]);

  const toggleTheme = () => setIsDark((v) => !v);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      localStorage.removeItem('access_token');
      window.location.href = '/login'; 
    }
  };

  return (
    <Router>
      <Routes>
        
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <ProtectedLayout 
                isDark={isDark} 
                toggleTheme={toggleTheme} 
                handleLogout={handleLogout} 
              />
            </PrivateRoute>
          }
        >
          <Route path="feed" element={<HomePage />} />
          
          {/* --- 3. ADD ROUTES --- */}
          <Route path="incidents" element={<IncidentListPage />} />
          <Route path="incidents/:id" element={<IncidentDetailPage />} /> 

          <Route path="about" element={<AboutPage />} />
          <Route path="settings" element={<SettingsPage />} />
          
          <Route index element={<Navigate to="/feed" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/feed" replace />} />

      </Routes>
    </Router>
  );
}

export default App;
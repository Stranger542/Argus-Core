import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import IncidentDetailPage from './pages/IncidentDetailPage'
import AboutPage from './pages/AboutPage'
import SettingsPage from './pages/SettingsPage'
import './App.css'
import { AuthProvider } from './context/AuthProvider'

const NavMenu: React.FC = () => {
  const { pathname } = useLocation()
  const show = pathname === '/feed' || pathname.startsWith('/about') || pathname.startsWith('/settings')
  if (!show) return null

  const linkBaseStyle: React.CSSProperties = {
    color: 'var(--text-primary)',
    textDecoration: 'none',
    position: 'relative',
    paddingBottom: 4,
    fontFamily: 'Roboto, Arial, sans-serif',
    fontWeight: 400,
  }

  const underlineStyle = (active: boolean): React.CSSProperties => ({
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: 2,
    background: '#ffffff',
    width: active ? '100%' : 0,
    transition: 'width 200ms ease',
  })
  return (
    <nav style={{ display: 'inline-flex', gap: '12px', marginLeft: '16px', alignItems: 'center' }}>
      <Link to="/feed" style={linkBaseStyle}>
        Home
        <span style={underlineStyle(pathname === '/feed')} />
      </Link>
      <Link to="/about" style={linkBaseStyle}>
        About
        <span style={underlineStyle(pathname.startsWith('/about'))} />
      </Link>
      <Link to="/settings" style={linkBaseStyle}>
        Settings
        <span style={underlineStyle(pathname.startsWith('/settings'))} />
      </Link>
    </nav>
  )
}

function App() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('theme')
      if (saved === 'light') return false
      if (saved === 'dark') return true
    } catch (e) {
      // ignore
    }
    // fallback to system preference
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return true
  })

  useEffect(() => {
    try {
      if (isDark) {
        document.documentElement.classList.remove('light')
        localStorage.setItem('theme', 'dark')
      } else {
        document.documentElement.classList.add('light')
        localStorage.setItem('theme', 'light')
      }
    } catch (e) {
      // ignore storage errors
    }
  }, [isDark])

  const toggleTheme = () => setIsDark((v) => !v)

  return (
    <Router>
      <AuthProvider>
        <div>
        <header className="header">
          <h1>Argus Core</h1>
          <NavMenu />
          <label className="theme-toggle">
            <input type="checkbox" checked={isDark} onChange={toggleTheme} />
            <span className="slider">
              <span className="icon sun">
                <img 
                src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAABqklEQVR4nN2VvS8EURTFf/G9KlkffwDRUVh0SqXEV6HgXxBbiAqJREKxhY9EqDQiGomtVBpEQ0UhQoREtUFCQdhl5SZHMph5OyPROMlNdu475573Zu7eB9GQApb4Q7wB739pkFf8Gl3AFFAWsH4NXAWsmWYC6HQZ7GiH6QCTuMKveFrabZdBE5ARcUa5YqAPWAX2FPa7FygSZ1aajGo4YYQDYBBoBk487/57HIs/JE3B4l4kgEcVOgeSQIciqZytPQAtRERMHzMPrAHlPhzLrYtzCVREMRiR8BAodfBs7Ujc4SgG+xL1huD2ibsbRNjQLiwWlbuXKB7CoFrcW3Xcj3oPnq6wP5LhSc+xEAYxcU1T6VevFmhVVEl0JkIihEGbuKd69qv3AwsSLYcwWBF3nghoBF6BHNDt4PVowr4ADUTEmHaWBaZ19E/UKpcVZzRK4RKgH6gBJjX/8zrNhSKnnO1+HKgDBqR1wqbipsR2exnaNSmfPd1hHbOlD2yYU37TMeq/fLA7n8FVrvdc7zM6mqUp2BjWPTeO9kw57uSEtHaaf3wnUwCuO9kXHzi4gwpgUgXSAAAAAElFTkSuQmCC" 
                style={{ width: '20px', height: '20px' }} // the image has to fit well into the circle, so align it
                alt="sun"/>
              </span>
              <span className="icon moon">
                <img 
                src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAABX0lEQVR4nOWUzypFURjFf/fS9ScpeQMDlHgBEykykJAMPILSJQ9gLAljSSFkYOoFzEx06TLw7z6AAfKvG0e71qndcY573e8OlFXf4Kx9Wuvb+9t7wX9AHTAFHAC3QBE4qZb4iESDSH0CrRbhFLDsCeaATe97xtr5moTegGmgBjgWt2QVH5fQK9DvHZXjboB6i3itd+au8xD74uYxYlJCec0hREF8J0ZsJQyxKD5jNbiWUFeEfxHfbDV4kFBThD8V32c1CDttiPCL4retBvmEI2oD3vWCBy0GezLIxqwtaO0RGKrUYFQiZ3q9PtLAjtY/gA2gg1/CXcO7H/ImrZ2E19bVBXAIrANHwES5UeFyaCDhn3bt4Ckmae9jbuE3rHomWXWetONeLwhdrVAGUp5JAFwCs0A30AI0Aj3AnObli/sRUxJjStCgRBX0b0XIaHC7wBXwrBd/roc3XI2M+rv4Am5ecq2YbereAAAAAElFTkSuQmCC" 
                style={{ width: '20px', height: '20px' }}
                alt="do-not-disturb-2" />
              </span>
            </span>
          </label>
        </header>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/feed" element={<HomePage />} />
            <Route path="/incidents" element={<IncidentDetailPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
      </div>
      </AuthProvider>
    </Router>
  )
}

export default App
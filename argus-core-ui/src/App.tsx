import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'  // New import
import { Navigate } from 'react-router-dom'
import './App.css'

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
      <div>
        <header className="header">
          <h1>Argus Core</h1>
          <label className="theme-toggle">
            <input type="checkbox" checked={isDark} onChange={toggleTheme} />
            <span className="slider">
              <span className="icon sun">☀️</span>
              <span className="icon moon">🌙</span>
            </span>
          </label>
        </header>
        <Routes>
          <Route path="/" element ={<Navigate to="/login" replace/>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/feed" element={<HomePage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
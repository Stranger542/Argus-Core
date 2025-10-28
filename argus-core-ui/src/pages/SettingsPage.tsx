// src/pages/SettingsPage.tsx
import React, { useState, useEffect } from 'react';
// Corrected the import name
import { getCurrentUser } from '../services/api';

interface UserInfo {
  id: number;
  email: string;
  is_active: number;
}

const SettingsPage: React.FC = () => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [notifications, setNotifications] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        // Corrected the function call
        const response = await getCurrentUser();
        setUserInfo(response.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to fetch user information.');
      } finally {
        setLoading(false);
      }
    };
    fetchUserInfo();

    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    // Apply theme to document
    if (newTheme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light'); // Ensure light class is added
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark'); // Ensure dark class is added
    }
  };

  const handleSaveSettings = () => {
    // Save settings to localStorage
    localStorage.setItem('notifications', notifications.toString());
    localStorage.setItem('autoRefresh', autoRefresh.toString());
    alert('Settings saved successfully!');
  };

  if (loading) return <div className="page-container">Loading settings...</div>;
  if (error) return <div className="page-container" style={{ color: 'var(--accent-red)'}}>{error}</div>;

  return (
    <div className="page-container settings-page-container">
      <h1>Settings</h1>
      
      <div className="settings-grid">
        {/* User Information */}
        <div className="info-card">
          <h2>User Information</h2>
          {userInfo && (
            <div className="setting-item-list">
              <div className="setting-item">
                <label>User ID</label>
                <p>{userInfo.id}</p>
              </div>
              <div className="setting-item">
                <label>Email</label>
                <p>{userInfo.email}</p>
              </div>
              <div className="setting-item">
                <label>Status</label>
                <p>{userInfo.is_active ? 'Active' : 'Inactive'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Appearance Settings */}
        <div className="info-card">
          <h2>Appearance</h2>
          <div className="setting-item-list">
            <div className="setting-item">
              <label>Theme</label>
              <div className="theme-buttons">
                <button
                  onClick={() => handleThemeChange('dark')}
                  className={theme === 'dark' ? 'active' : ''}
                >
                  Dark
                </button>
                <button
                  onClick={() => handleThemeChange('light')}
                  className={theme === 'light' ? 'active' : ''}
                >
                  Light
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="info-card">
          <h2>Notifications</h2>
          <div className="setting-item-list">
            <div className="setting-item toggle">
              <label>Email Notifications</label>
              <input
                type="checkbox"
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
              />
            </div>
            <div className="setting-item toggle">
              <label>Auto-refresh Data</label>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
            </div>
          </div>
        </div>

        {/* System Information */}
        <div className="info-card">
          <h2>System Information</h2>
          <div className="setting-item-list">
            <div className="setting-item">
              <label>Version</label>
              <p>Argus Core v1.0.0</p>
            </div>
            <div className="setting-item">
              <label>Last Updated</label>
              <p>{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="save-button-container">
        <button onClick={handleSaveSettings} className="save-button">
          Save Settings
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
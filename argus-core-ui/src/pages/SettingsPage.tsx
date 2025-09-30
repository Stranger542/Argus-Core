import React, { useState, useEffect } from 'react';
import { getUserInfo } from '../services/api';

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
        const response = await getUserInfo();
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
    } else {
      document.documentElement.classList.add('dark');
    }
  };

  const handleSaveSettings = () => {
    // Save settings to localStorage
    localStorage.setItem('notifications', notifications.toString());
    localStorage.setItem('autoRefresh', autoRefresh.toString());
    alert('Settings saved successfully!');
  };

  if (loading) return <div className="p-8">Loading settings...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8 text-teal-300">Settings</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* User Information */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
          <h2 className="text-xl font-semibold mb-4 text-teal-300">User Information</h2>
          {userInfo && (
            <div className="space-y-3">
              <div>
                <label className="block text-gray-300 text-sm font-medium">User ID</label>
                <p className="text-white">{userInfo.id}</p>
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium">Email</label>
                <p className="text-white">{userInfo.email}</p>
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium">Status</label>
                <p className="text-white">{userInfo.is_active ? 'Active' : 'Inactive'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Appearance Settings */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
          <h2 className="text-xl font-semibold mb-4 text-teal-300">Appearance</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Theme</label>
              <div className="flex space-x-4">
                <button
                  onClick={() => handleThemeChange('dark')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'bg-teal-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Dark
                </button>
                <button
                  onClick={() => handleThemeChange('light')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    theme === 'light'
                      ? 'bg-teal-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Light
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
          <h2 className="text-xl font-semibold mb-4 text-teal-300">Notifications</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-gray-300">Email Notifications</label>
              <input
                type="checkbox"
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
                className="w-4 h-4 text-teal-500 bg-gray-700 border-gray-600 rounded focus:ring-teal-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-gray-300">Auto-refresh Data</label>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 text-teal-500 bg-gray-700 border-gray-600 rounded focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        {/* System Information */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
          <h2 className="text-xl font-semibold mb-4 text-teal-300">System Information</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-gray-300 text-sm font-medium">Version</label>
              <p className="text-white">Argus Core v1.0.0</p>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium">Last Updated</label>
              <p className="text-white">{new Date().toLocaleDateString()}</p>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium">Browser</label>
              <p className="text-white">{navigator.userAgent.split(' ')[0]}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSaveSettings}
          className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;

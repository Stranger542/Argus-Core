import React, { useState, useEffect } from 'react';
import { getUser} from '../services/supabaseClient';

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
        const response = await getUser();
        // fill user info with response.user.id, response.user.email, response.user.is_active
        const userInfo: UserInfo = {
          id: parseInt(response.user.id),
          email: response.user.email || '',
          is_active: 1 // since User object has no "is_active" attribute
        }
        setUserInfo(userInfo);
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
    <div className="max-w-6xl w-full mx-auto p-8">
      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}`}</style>
      <div
        className="no-scrollbar"
        style={{
          maxHeight: 'calc(100vh - 100px)',
          minHeight: 'calc(100vh - 140px)',
          overflowY: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingTop: '72px',
          paddingRight: 4,
        }}
      >
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-teal-300" style={{ fontFamily: 'Inter, Roboto, Segoe UI, system-ui, -apple-system, Arial, sans-serif' }}>Settings</h1>
        <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-gray-700/60 to-transparent" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-12 items-start">
        {/* User Information */}
        <div id="profile" className="xl:col-span-4 bg-gray-800/95 p-8 rounded-2xl shadow-xl border border-gray-700/50">
          <div className="mb-2">
            <h2 className="text-xl font-semibold text-teal-300" style={{ fontFamily: 'Inter, Roboto, Segoe UI, system-ui, -apple-system, Arial, sans-serif', fontWeight: 700 }}>Profile</h2>
          </div>
          {userInfo && (
            <div className="rounded-xl border border-gray-700/60 bg-gray-900/10 divide-y divide-gray-700/60" style={{ display: 'grid', gridTemplateColumns: '280px 1fr' }}>
              <div className="px-6 py-4 text-gray-200 text-base font-semibold" style={{ fontFamily: 'Inter, Roboto, Segoe UI, system-ui, -apple-system, Arial, sans-serif' }}>User ID</div>
              <div className="px-6 py-4 text-gray-100 text-base font-mono text-right">{userInfo.id}</div>
              <div className="px-6 py-4 text-gray-200 text-base font-semibold" style={{ fontFamily: 'Inter, Roboto, Segoe UI, system-ui, -apple-system, Arial, sans-serif' }}>Email</div>
              <div className="px-6 py-4 text-gray-100 text-base text-right break-all">{userInfo.email}</div>
              <div className="px-6 py-4 text-gray-200 text-base font-semibold" style={{ fontFamily: 'Inter, Roboto, Segoe UI, system-ui, -apple-system, Arial, sans-serif' }}>Status</div>
              <div className="px-6 py-4 text-right">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${userInfo.is_active ? 'bg-teal-500/20 text-teal-300' : 'bg-gray-600/30 text-gray-300'}`}>
                  {userInfo.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          )}
        </div>

        

        {/* Notification Settings */}
        <div id="notifications" className="xl:col-span-4 bg-gray-800/95 p-8 rounded-2xl shadow-xl border border-gray-700/50">
          <div className="mb-2">
            <h2 className="text-xl font-semibold text-teal-300" style={{ fontFamily: 'Inter, Roboto, Segoe UI, system-ui, -apple-system, Arial, sans-serif', fontWeight: 700 }}>Notifications</h2>
          </div>
          <div className="rounded-xl border border-gray-700/60 bg-gray-900/10 divide-y divide-gray-700/60" style={{ display: 'grid', gridTemplateColumns: '280px 1fr' }}>
            <div className="px-6 py-4 text-gray-200 text-base font-semibold" style={{ fontFamily: 'Inter, Roboto, Segoe UI, system-ui, -apple-system, Arial, sans-serif' }}>Email Notifications</div>
            <div className="px-6 py-4 text-right">
              <div className="inline-flex items-center gap-3">
                <span className="text-gray-300 text-base">{notifications ? 'Enabled' : 'Disabled'}</span>
                <input
                  type="checkbox"
                  checked={notifications}
                  onChange={(e) => setNotifications(e.target.checked)}
                  className="w-5 h-5 text-teal-500 bg-gray-700 border-gray-600 rounded focus:ring-teal-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 text-gray-200 text-base font-semibold" style={{ fontFamily: 'Inter, Roboto, Segoe UI, system-ui, -apple-system, Arial, sans-serif' }}>Auto-refresh Data</div>
            <div className="px-6 py-4 text-right">
              <div className="inline-flex items-center gap-3">
                <span className="text-gray-300 text-base">{autoRefresh ? 'Enabled' : 'Disabled'}</span>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-5 h-5 text-teal-500 bg-gray-700 border-gray-600 rounded focus:ring-teal-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* System Information */}
        <div id="system" className="xl:col-span-4 bg-gray-800/95 p-8 rounded-2xl shadow-xl border border-gray-700/50">
          <div className="mb-2">
            <h2 className="text-xl font-semibold text-teal-300" style={{ fontFamily: 'Inter, Roboto, Segoe UI, system-ui, -apple-system, Arial, sans-serif', fontWeight: 700 }}>System</h2>
          </div>
          <div className="rounded-xl border border-gray-700/60 bg-gray-900/10 divide-y divide-gray-700/60" style={{ display: 'grid', gridTemplateColumns: '280px 1fr' }}>
            <div className="px-6 py-4 text-gray-200 text-base font-semibold" style={{ fontFamily: 'Inter, Roboto, Segoe UI, system-ui, -apple-system, Arial, sans-serif' }}>Version</div>
            <div className="px-6 py-4 text-gray-100 text-right">Argus Core v1.0.0</div>
            <div className="px-6 py-4 text-gray-200 text-base font-semibold" style={{ fontFamily: 'Inter, Roboto, Segoe UI, system-ui, -apple-system, Arial, sans-serif' }}>Last Updated</div>
            <div className="px-6 py-4 text-gray-100 text-right">{new Date().toLocaleDateString()}</div>
            <div className="px-6 py-4 text-gray-200 text-base font-semibold" style={{ fontFamily: 'Inter, Roboto, Segoe UI, system-ui, -apple-system, Arial, sans-serif' }}>Browser</div>
            <div className="px-6 py-4 text-gray-100 text-right">{navigator.userAgent.split(' ')[0]}</div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSaveSettings}
          className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-lg shadow-teal-500/20"
        >
          Save Settings
        </button>
      </div>
      </div>
    </div>
  );
};

export default SettingsPage;

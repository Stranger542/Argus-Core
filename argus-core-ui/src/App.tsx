import { BrowserRouter as Router, Routes, Route, Link, Outlet, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import IncidentDetailPage from './pages/IncidentDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SettingsPage from './pages/SettingsPage';
import AboutPage from './pages/AboutPage';

// --- Private Outlet Component ---
const PrivateRoutes = () => {
  const token = localStorage.getItem('authToken');

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  };

  if (!token) {
    return <Navigate to="/login" />;
  }

  return (
    <>
      <nav className="bg-gray-900/80 backdrop-blur-sm shadow-md p-4 flex justify-between items-center fixed top-0 left-0 right-0 z-10">
        <Link to="/" className="text-xl font-bold text-teal-400 hover:text-teal-300">
          Argus-Core
        </Link>
        <div className="flex items-center space-x-4">
          <Link to="/" className="text-gray-300 hover:text-white transition-colors">Home</Link>
          <Link to="/settings" className="text-gray-300 hover:text-white transition-colors">Settings</Link>
          <Link to="/about" className="text-gray-300 hover:text-white transition-colors">About</Link>
          <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg">
            Logout
          </button>
        </div>
      </nav>
      {/* Add padding-top to the main content to avoid being hidden by the fixed navbar */}
      <main className="pt-20">
        <Outlet />
      </main>
    </>
  );
};

// --- Main App Component ---
function App() {
  return (
    // This div now handles the global background styling
    <div className="bg-gray-900 text-gray-100 min-h-screen" style={{
      backgroundImage: 'radial-gradient(circle at 1px 1px, #2d3748 1px, transparent 0)',
      backgroundSize: '2rem 2rem'
    }}>
      <Router>
        <Routes>
          {/* Public Routes are rendered directly */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Private Routes are nested inside the gatekeeper component */}
          <Route element={<PrivateRoutes />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/incidents/:id" element={<IncidentDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/about" element={<AboutPage />} />
          </Route>
        </Routes>
      </Router>
    </div>
  );
}

export default App;


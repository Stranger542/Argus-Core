import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../services/api';

// A simple SVG spinner component for the loading state
const Spinner = () => (
  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); // State for loading
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true); // Start loading
    try {
      const response = await loginUser(email, password);
      localStorage.setItem('authToken', response.data.access_token);
      navigate('/');
      window.location.reload();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false); // Stop loading
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md">
        <form onSubmit={handleSubmit} className="bg-gray-900/70 backdrop-blur p-8 md:p-10 rounded-2xl shadow-2xl border border-gray-800">
          <h2 className="text-4xl font-extrabold mb-8 text-center text-white">Welcome Back</h2>
          
          {error && <p className="bg-red-500/80 text-white p-3 rounded-lg mb-6 text-center">{error}</p>}

          <div className="mb-6">
            <label className="block text-gray-200 mb-2 font-medium" htmlFor="email">Email</label>
            <input
              type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all placeholder-gray-400" required
              placeholder="you@example.com"
            />
          </div>

          <div className="mb-8">
            <label className="block text-gray-200 mb-2 font-medium" htmlFor="password">Password</label>
            <input
              type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all placeholder-gray-400" required
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-teal-800 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all flex items-center justify-center shadow-lg"
          >
            {isLoading ? <Spinner /> : 'Login'}
          </button>

          <p className="text-center mt-6 text-gray-400">
            No account? <Link to="/register" className="text-teal-400 hover:underline font-medium">Register here</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;

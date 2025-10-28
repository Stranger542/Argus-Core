import axios from 'axios';

// Create a base axios instance
const api = axios.create({
  baseURL: 'http://localhost:8000', // Your FastAPI backend URL (port 8000)
});

// IMPORTANT: Use an interceptor to add the auth token to every request
api.interceptors.request.use(
  (config) => {
    // Get the token from local storage
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    // Optionally handle global request errors (e.g., redirect to login on 401)
    if (error.response && error.response.status === 401) {
      console.error("Authentication Error - Redirecting to login");
      // Uncomment the line below if you want automatic redirect on any 401
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// --- Authentication API Functions ---
/**
 * Logs in a user.
 */
export const login = (formData: FormData) => {
  return api.post('/token', formData);
};

/**
 * Registers a new user.
 */
export const register = (userData: any) => {
  return api.post('/users/register', userData);
};

// --- App API Functions ---

/**
 * Fetches a random video URL from the backend datasets.
 */
export const getRandomVideo = () => {
  return api.get('/api/videos/random');
};

/**
 * Asks the backend to analyze a video specified by its relative URL.
 * Returns a list of detected anomaly events.
 */
export const detectAnomalies = (videoUrl: string) => {
  // videoUrl should be like "/datasets/ucf_crime/test/Fighting/Fighting001.mp4"
  return api.post('/api/detect', { video_url: videoUrl });
};


/**
 * (Kept for potential future use or direct testing, but not used by HomePage)
 * Triggers the backend simulation for a given camera, including incident creation and email.
 */
export const simulateCamera = (cameraId: number, sendEmail: boolean) => {
  return api.post(`/api/simulate/cameras/${cameraId}?send_email=${sendEmail}`);
};

/**
 * Fetches the details for a specific incident.
 */
export const getIncidentById = (id: number) => {
  return api.get(`/incidents/${id}`);
};

/**
 * Fetches the current user's details (e.g., to display email).
 */
export const getCurrentUser = () => {
  return api.get('/users/me');
};

/**
 * Fetches the list of incidents.
 */
export const getIncidents = (limit: number = 100) => {
    return api.get(`/incidents?limit=${limit}`);
};

/**
 * Fetches the list of cameras.
 */
export const getCameras = () => {
    return api.get('/cameras');
};
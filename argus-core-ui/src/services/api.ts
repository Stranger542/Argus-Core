import axios from 'axios';

// Load API base URL from Vite env, with a safe default for local dev
const API_BASE_URL: string = (import.meta as any)?.env?.VITE_API_URL || 'http://localhost:8000';

if (!(import.meta as any)?.env?.VITE_API_URL) {
  // eslint-disable-next-line no-console
  console.warn('[Argus-Core] VITE_API_URL not set. Falling back to http://localhost:8000');
}

// Centralized Axios client
const apiClient = axios.create({ baseURL: API_BASE_URL });

// Use an interceptor to dynamically add the auth token to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    if (!config.headers) config.headers = {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


// --- INTERFACES ---
export interface Clip {
  id: number;
  file_path: string;
}

export interface Incident {
  id: number;
  camera_id: number;
  event_type: string;
  score?: number;
  started_at: string;
  status: string;
  clips: Clip[];
}

export interface Camera {
  id: number;
  name: string;
  location: string;
  is_active: number;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
}

// --- API FUNCTIONS ---

// Auth Functions
export const registerUser = (email: string, password: string) => {
  return apiClient.post('/users/register', { email, password });
};

export const loginUser = (email: string, password: string) => {
  const params = new URLSearchParams();
  params.append('username', email);
  params.append('password', password);
  return apiClient.post<AuthToken>('/token', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
};

// Incident Functions
export const getIncidents = () => {
  return apiClient.get<Incident[]>('/incidents?limit=100');
};

export const getIncidentById = (id: number) => {
  return apiClient.get<Incident>(`/incidents/${id}`);
};

// Camera Functions
export const getCameras = () => {
  return apiClient.get<Camera[]>('/cameras');
};

// User Functions
export const getUserInfo = () => {
  return apiClient.get('/users/me');
};

// Simulation Function: run server-side analysis on random dataset video for a camera
export const simulateCamera = (cameraId: number, sendEmail = true) => {
  return apiClient.post(`/simulate/cameras/${cameraId}?send_email=${sendEmail}`);
};

export const getRandomVideo = () => {
  return apiClient.get<{ video_url: string }>('/api/videos/random');
};
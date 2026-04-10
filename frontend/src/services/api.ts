import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' }
});

// Attach auth token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fera_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('fera_token');
      localStorage.removeItem('fera_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

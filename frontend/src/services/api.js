import axios from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-backend-domain.vercel.app/api'
  : 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
};

export const terraformAPI = {
  generate: (request) => api.post('/generate', request),
  validate: (code) => api.get('/validate', { params: { code } }),
  getTemplates: () => api.get('/templates'),
};

export const projectAPI = {
  create: (project) => api.post('/projects', project),
  getAll: () => api.get('/projects'),
};

export default api;
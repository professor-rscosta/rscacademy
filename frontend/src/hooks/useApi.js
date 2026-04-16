import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 120000, // 2 minutos para PDFs grandes
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - attach token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('rsc_token');
    if (token && !config.headers['Authorization']) {
      config.headers['Authorization'] = 'Bearer ' + token;
    }
    return config;
  },
  err => Promise.reject(err)
);

// Response interceptor – handle global errors
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('rsc_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

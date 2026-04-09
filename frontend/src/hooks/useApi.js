import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 120000, // 2 minutos para PDFs grandes
  headers: { 'Content-Type': 'application/json' },
});

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

import axios from 'axios';
import Cookies from 'js-cookie';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001/api',
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: ajoute le JWT à chaque requête
apiClient.interceptors.request.use(
  (config) => {
    const token = Cookies.get('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Les données du CRM sont privées et changent souvent :
    // on empêche le navigateur de réutiliser une ancienne réponse.
    if ((config.method ?? 'get').toLowerCase() === 'get') {
      config.headers['Cache-Control'] = 'no-cache';
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: gère le 401 sans casser le login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url: string = error.config?.url ?? '';
    const isLoginCall = url.includes('/auth/login');
    const hadToken = !!error.config?.headers?.Authorization;

    // Redirige seulement si on avait un token (donc il est expiré/invalide),
    // pas pour un échec de login, et pas si on est déjà sur /login.
    if (status === 401 && hadToken && !isLoginCall && typeof window !== 'undefined') {
      Cookies.remove('auth_token');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
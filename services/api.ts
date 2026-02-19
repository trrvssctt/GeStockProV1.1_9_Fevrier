
import { authBridge } from './authBridge';

// Use Vite env var when available; fallback to localhost
// Ensure the base URL ends with `/api` so frontend requests target the API routes.
const rawBackend = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3000';
const BACKEND_URL = rawBackend.endsWith('/api') ? rawBackend : `${rawBackend.replace(/\/+$/, '')}/api`;

export interface ApiError {
  error: string;
  message: string;
  status: number;
}

export const apiClient = {
  async request(endpoint: string, options: RequestInit = {}) {
    const session = authBridge.getSession();
    
    const headers = {
      'Content-Type': 'application/json',
      ...(session?.token ? { 'Authorization': `Bearer ${session.token}` } : {}),
      ...options.headers,
    };

    try {
      const response = await fetch(`${BACKEND_URL}${endpoint}`, { ...options, headers });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Construction d'une erreur riche basée sur la réponse du Kernel
        const errorContext: ApiError = {
          error: data.error || 'UnknownError',
          message: data.message || 'Une erreur inattendue est survenue sur le serveur.',
          status: response.status
        };
        
        // Gestion spécifique des sessions expirées
        if (response.status === 401 || response.status === 403) {
          if (data.message?.toLowerCase().includes('expirée')) {
            authBridge.clearSession();
            window.location.reload();
          }
        }

        throw errorContext;
      }

      return data;
    } catch (err: any) {
      if (err.status) throw err; // C'est déjà une ApiError
      
      // Erreur réseau (Backend injoignable)
      throw {
        error: 'NetworkError',
        message: 'Impossible de joindre le Kernel AlwaysData. Vérifiez votre connexion internet.',
        status: 0
      } as ApiError;
    }
  },

  get: (e: string) => apiClient.request(e, { method: 'GET' }),
  post: (e: string, b: any) => apiClient.request(e, { method: 'POST', body: JSON.stringify(b) }),
  put: (e: string, b: any) => apiClient.request(e, { method: 'PUT', body: JSON.stringify(b) }),
  delete: (e: string) => apiClient.request(e, { method: 'DELETE' }),
};

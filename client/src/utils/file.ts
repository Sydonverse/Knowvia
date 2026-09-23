import { api } from '../services/api';

/**
 * Resolves a file URL to ensure absolute connectivity in production.
 * If the URL is relative (e.g., /uploads/xyz.pdf) and a remote API/Socket URL is configured,
 * it prepends the backend origin.
 * Automatically appends the user's active session token for authenticated downloads.
 */
export const getFileUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  let finalUrl = url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    // Derive backend origin from VITE_SOCKET_URL or VITE_API_BASE_URL if set
    const remoteOrigin =
      import.meta.env.VITE_SOCKET_URL ||
      (import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL.replace(/\/api(\/v1)?\/?$/, '') : '');

    if (remoteOrigin && url.startsWith('/')) {
      finalUrl = `${remoteOrigin.replace(/\/$/, '')}${url}`;
    }
  }

  // If accessing uploads and we have a session token, attach it so authenticated static download succeeds
  if (finalUrl.includes('/uploads/')) {
    const token = api.getToken();
    if (token && !finalUrl.includes('token=')) {
      const sep = finalUrl.includes('?') ? '&' : '?';
      finalUrl = `${finalUrl}${sep}token=${encodeURIComponent(token)}`;
    }
  }

  return finalUrl;
};

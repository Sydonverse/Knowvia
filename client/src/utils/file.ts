/**
 * Resolves a file URL to ensure absolute connectivity in production.
 * If the URL is relative (e.g., /uploads/xyz.pdf) and a remote API/Socket URL is configured,
 * it prepends the backend origin.
 */
export const getFileUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  // Derive backend origin from VITE_SOCKET_URL or VITE_API_BASE_URL if set
  const remoteOrigin =
    import.meta.env.VITE_SOCKET_URL ||
    (import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL.replace(/\/api(\/v1)?\/?$/, '') : '');

  if (remoteOrigin && url.startsWith('/')) {
    return `${remoteOrigin.replace(/\/$/, '')}${url}`;
  }

  return url;
};

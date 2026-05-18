export const BACKEND_WS_URL = process.env.NEXT_PUBLIC_BACKEND_WS_URL || 'ws://localhost:8000';
export const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8000';

if (!process.env.NEXT_PUBLIC_BACKEND_WS_URL || !process.env.NEXT_PUBLIC_BACKEND_API_URL) {
  console.warn(
    "Warning: Missing required environment variables NEXT_PUBLIC_BACKEND_WS_URL or NEXT_PUBLIC_BACKEND_API_URL. " +
    "Falling back to local development defaults."
  );
}

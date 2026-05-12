export const BACKEND_WS_URL = process.env.NEXT_PUBLIC_BACKEND_WS_URL;
export const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

if (!BACKEND_WS_URL || !BACKEND_API_URL) {
  const missing = !BACKEND_WS_URL ? 'NEXT_PUBLIC_BACKEND_WS_URL' : 'NEXT_PUBLIC_BACKEND_API_URL';
  throw new Error(
    `Missing required environment variable: ${missing}\n` +
    "Copy .env.local.example to .env.local and fill in the values."
  );
}

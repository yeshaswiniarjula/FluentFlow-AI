import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FluentFlow AI — Real-time English Conversation Tutor',
  description: 'Practice English conversations with an AI tutor powered by Groq LLM and Deepgram TTS. Get instant grammar corrections and fluency feedback.',
  keywords: ['English tutor', 'AI conversation', 'language learning', 'speech recognition', 'Groq', 'Deepgram'],
  authors: [{ name: 'FluentFlow AI' }],
  openGraph: {
    title: 'FluentFlow AI',
    description: 'Real-time AI-powered English conversation tutor',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

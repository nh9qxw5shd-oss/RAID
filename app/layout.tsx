import type { Metadata, Viewport } from 'next';
import './globals.css';
import PwaInit from '@/components/PwaInit';

export const metadata: Metadata = {
  title: 'Incident Debrief — RAID',
  description:
    'Structured, collaborative incident debriefs. Reality · Actions · Inactions · Directives.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    apple: '/icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'RAID',
  },
};

export const viewport: Viewport = {
  themeColor: '#E05206',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <PwaInit />
        {children}
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from 'next';
import './globals.css';
import PwaInit from '@/components/PwaInit';
import { withBase } from '@/lib/basePath';
import { SessionProvider } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Incident Debrief — RAID',
  description:
    'Structured, collaborative incident debriefs. Reality · Actions · Inactions · Directives.',
  manifest: withBase('/manifest.json'),
  icons: {
    icon: withBase('/favicon.svg'),
    apple: withBase('/icon.svg'),
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
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Incident Debrief — RAID',
  description:
    'Structured, collaborative incident debriefs. Reality · Actions · Inactions · Directives.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}

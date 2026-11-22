import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'GreenForce OS', template: '%s · GreenForce OS' },
  description:
    'Jurisdiction-aware compliance for construction — from project address to compliance passport.',
};

export const viewport: Viewport = { themeColor: '#1d5444' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

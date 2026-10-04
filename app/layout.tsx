import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import AndroidInstallPrompt from '@/components/AndroidInstallPrompt';

export const metadata: Metadata = {
  title: 'Tailoram | Nigerian Fashion Marketplace',
  description: 'Connect with verified fashion designers and bespoke tailors in Lagos, Abuja & across Nigeria. Custom native wear, Agbada, Senator, Ankara, Aso Ebi, and Ready-to-Wear.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192.png',
    shortcut: '/icons/icon-192.png',
    apple: '/icons/icon-512.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Tailoram',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#0c0a09',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-lagos-cream text-lagos-dark antialiased">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 pb-16 md:pb-0">
            {children}
          </main>
          <Footer />
          <MobileBottomNav />
          <AndroidInstallPrompt />
        </AuthProvider>
      </body>
    </html>
  );
}

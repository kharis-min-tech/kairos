import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { AuthProvider } from '@/lib/auth/auth-context'; // Added import
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Kairos — Church Administration',
  description: 'Multi-branch church administration platform',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        {/* AuthProvider must wrap everything that uses useAuth */}
        <AuthProvider>
          <Providers>{children}</Providers>
        </AuthProvider>
        
        <Toaster
          richColors
          position="top-right"
          toastOptions={{
            classNames: {
              success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
            },
          }}
        />
      </body>
    </html>
  );
}

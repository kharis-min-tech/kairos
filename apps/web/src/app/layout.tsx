import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Providers } from '@/components/providers';
import { Toaster } from 'sonner';
import { cookies, headers } from 'next/headers';
import { LANGUAGE_COOKIE, LANGUAGE_HEADER, asLanguage } from '@/lib/language';
import { serverTranslator } from '@/lib/server-translate';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

// The tab title is as user-facing as the page, and it is declared in a server
// component, so it goes through the server-side lookup rather than the hook.
export async function generateMetadata(): Promise<Metadata> {
  const t = await serverTranslator();
  return {
    title: t('common:metaTitle', 'Kairos: Church Administration'),
    description: t('common:metaDescription', 'Multi-branch church administration platform'),
    icons: {
      icon: '/logo.png',
      apple: '/logo.png',
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read here so the server renders the reader's language rather than English
  // followed by a switch. 'system' cannot be resolved server-side -- the
  // browser's Accept-Language is a weaker signal than the explicit choice --
  // so it falls through to English and the client corrects it in one step.
  //
  // The path's language outranks the cookie: a shared /fr link has to render
  // French for whoever opens it, not whatever their own last visit stored.
  const fromPath = (await headers()).get(LANGUAGE_HEADER);
  const pref = (await cookies()).get(LANGUAGE_COOKIE)?.value;
  const language = fromPath
    ? asLanguage(fromPath)
    : pref && pref !== 'system'
      ? asLanguage(pref)
      : 'en';

  return (
    <html lang={language} suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <Providers initialLanguage={language}>{children}</Providers>
        <Toaster
          richColors
          position="top-right"
          duration={5000}
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

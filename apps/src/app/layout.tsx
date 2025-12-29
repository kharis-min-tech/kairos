import './global.css';
import { CognitoAuthProvider } from '../components/auth-provider';

export const metadata = {
  title: 'KCMS - Kharis Church Management System',
  description: 'Church management system for Kharis Church',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body>
        <CognitoAuthProvider>
          {children}
        </CognitoAuthProvider>
      </body>
    </html>
  );
}

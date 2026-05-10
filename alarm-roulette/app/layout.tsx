import type { Metadata } from 'next';
import '../css/styles.css';
import { BottomNav } from '@/components/alarms/BottomNav';

export const metadata: Metadata = {
  title: 'Alarm Roulette',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,600;0,700;1,600&display=swap"
          rel="stylesheet"
        />
        <script
          src="https://kit.fontawesome.com/a89918f07b.js"
          crossOrigin="anonymous"
          async
        />
      </head>
      <body>
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
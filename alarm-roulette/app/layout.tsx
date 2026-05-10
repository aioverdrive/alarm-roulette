import type { Metadata } from 'next';
import '@/css/styles.css';
import { AppShell } from '@/components/alarms/AppShell';

export const metadata: Metadata = {
  title: 'Alarm Roulette',
  description: 'Social alarm app',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
    <head>
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link
    rel="preconnect"
    href="https://fonts.gstatic.com"
    crossOrigin="anonymous"
  />

  <link
    href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap"
    rel="stylesheet"
  />

  {/* Font Awesome */}
  <script
    src="https://kit.fontawesome.com/a89918f07b.js"
    crossOrigin="anonymous"
    async
  />
</head>

      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
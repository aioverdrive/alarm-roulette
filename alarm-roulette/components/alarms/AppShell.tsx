'use client';

import { usePathname } from 'next/navigation';
import { BottomNav } from '@/components/alarms/BottomNav';

const NAV_ROUTES = ['/alarm', '/friends', '/upload'];

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const showBottomNav = NAV_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  return (
    <>
      <main>{children}</main>

      {showBottomNav && <BottomNav />}
    </>
  );
}
"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/alarm',   icon: 'fa-solid fa-bell',       label: 'Alarm'   },
  { href: '/friends', icon: 'fa-solid fa-user-group', label: 'Friends' },
  { href: '/upload',  icon: 'fa-solid fa-microphone', label: 'Upload'  },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="nav">
      {NAV_ITEMS.map(({ href, icon, label }) => (
        <Link
          key={href}
          href={href}
          className="nav-link"
          style={{ color: pathname.startsWith(href) ? '#FCBA04' : '#fafafa' }}
        >
          <span suppressHydrationWarning>
            <i className={icon} suppressHydrationWarning />
          </span>
          <span className="nav-text">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
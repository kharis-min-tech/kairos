'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Members', href: '/members', icon: '👥' },
  { name: 'Departments', href: '/departments', icon: '🏢' },
  { name: 'Fellowships', href: '/fellowships', icon: '🤝' },
  { name: 'Events', href: '/events', icon: '📅' },
  { name: 'Finance', href: '/finance', icon: '💰' },
  { name: 'Forms', href: '/forms', icon: '📝' },
  { name: 'Reports', href: '/reports', icon: '📈' },
  { name: 'Security', href: '/security', icon: '🔒' },
  { name: 'Settings', href: '/settings', icon: '⚙️' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col w-64 bg-white shadow-lg">
      <div className="flex items-center justify-center h-16 px-4 bg-primary-600">
        <h1 className="text-xl font-bold text-white font-heading">
          Kairos Admin
        </h1>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                group flex items-center px-2 py-2 text-sm font-medium rounded-md
                ${
                  isActive
                    ? 'bg-primary-100 text-primary-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

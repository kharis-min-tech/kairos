'use client';

import Link from 'next/link';
import { Church } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — visible on lg+ */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center bg-gradient-to-br from-primary to-purple-900 p-12 text-white">
        <Link href="/" className="flex items-center gap-3 mb-8">
          <Church size={48} />
          <span className="text-4xl font-bold tracking-tight">Kairos</span>
        </Link>
        <p className="max-w-md text-center text-lg text-purple-200">
          Church administration made simple. Manage your congregation, track attendance, and grow your community.
        </p>
      </div>

      {/* Right panel — auth form */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center bg-background px-4 py-8">
        {/* Mobile logo */}
        <Link href="/" className="mb-8 flex items-center gap-2 lg:hidden">
          <Church size={32} className="text-primary" />
          <span className="text-2xl font-bold text-primary">Kairos</span>
        </Link>

        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}

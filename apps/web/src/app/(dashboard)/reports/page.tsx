'use client';

import { BarChart3, Users, HandCoins, CalendarCheck, Heart } from 'lucide-react';
import { Card, CardBody } from '@/components/ui';

const reportLinks = [
  {
    href: '/dashboard',
    icon: <BarChart3 size={20} />,
    label: 'Dashboard',
    description: 'Overview stats and trends for your role',
    color: 'bg-purple-100 text-primary',
  },
  {
    href: '/attendance/reports',
    icon: <CalendarCheck size={20} />,
    label: 'Attendance Reports',
    description: 'Service and fellowship attendance trends',
    color: 'bg-blue-100 text-secondary',
  },
  {
    href: '/donations/reports',
    icon: <HandCoins size={20} />,
    label: 'Donation Reports',
    description: 'Giving summaries by purpose and branch',
    color: 'bg-amber-100 text-amber-600',
  },
  {
    href: '/members',
    icon: <Users size={20} />,
    label: 'Member Reports',
    description: 'Member directory with export to CSV',
    color: 'bg-green-100 text-green-600',
  },
  {
    href: '/evangelism/souls',
    icon: <Heart size={20} />,
    label: 'Evangelism Reports',
    description: 'Soul conversion funnel and follow-up status',
    color: 'bg-red-100 text-red-600',
  },
];

export default function ReportsPage() {
  return (
    <section aria-label="Reports">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">View reports and analytics across all modules</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reportLinks.map((item) => (
          <a key={item.href} href={item.href} className="block group">
            <Card>
              <CardBody>
                <div className="flex items-center gap-3 py-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.color}`}>
                    {item.icon}
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors">{item.label}</h2>
                    <p className="text-xs text-gray-500">{item.description}</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </a>
        ))}
      </div>
    </section>
  );
}

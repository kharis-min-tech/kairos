'use client';

import Link from 'next/link';
import { Heart, Users, UserPlus } from 'lucide-react';
import { Card, CardBody } from '@/components/ui';

export default function OutreachPage() {
  return (
    <section aria-label="Outreach and evangelism">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Outreach &amp; Evangelism</h1>
        <p className="text-sm text-gray-500 mt-1">Manage outreach programs and soul tracking</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/evangelism/outreach" className="block group">
          <Card>
            <CardBody>
              <div className="flex items-center gap-3 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-primary">
                  <Heart size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors">Outreach Programs</h2>
                  <p className="text-xs text-gray-500">Create and manage outreach events</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </Link>

        <Link href="/evangelism/souls" className="block group">
          <Card>
            <CardBody>
              <div className="flex items-center gap-3 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-secondary">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors">Soul Tracking</h2>
                  <p className="text-xs text-gray-500">Capture souls and track follow-ups</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </Link>

        <Link href="/evangelism/followups" className="block group">
          <Card>
            <CardBody>
              <div className="flex items-center gap-3 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                  <Users size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors">Follow-up Board</h2>
                  <p className="text-xs text-gray-500">Kanban board for soul status tracking</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </Link>
      </div>
    </section>
  );
}

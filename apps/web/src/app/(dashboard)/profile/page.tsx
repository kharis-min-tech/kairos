'use client';

import { User } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui';

export default function ProfilePage() {
  return (
    <section aria-label="User profile">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">View and manage your personal information</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white">
              <User size={24} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Member Profile</h2>
              <p className="text-xs text-gray-500">Your profile details will appear here once connected to the API</p>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 py-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Name</p>
              <p className="text-sm text-gray-900 mt-1">—</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Email</p>
              <p className="text-sm text-gray-900 mt-1">—</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Phone</p>
              <p className="text-sm text-gray-900 mt-1">—</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Home Branch</p>
              <p className="text-sm text-gray-900 mt-1">—</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Role</p>
              <p className="text-sm text-gray-900 mt-1">—</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Status</p>
              <p className="text-sm text-gray-900 mt-1">—</p>
            </div>
          </div>
        </CardBody>
      </Card>
    </section>
  );
}

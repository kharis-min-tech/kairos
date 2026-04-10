'use client';

import { Card, CardHeader, CardBody } from '@/components/ui';

export default function SettingsPage() {
  return (
    <section aria-label="Settings">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account preferences</p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-900">Account</h2>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-gray-500 py-4">Account settings will be available here. You can update your password and notification preferences.</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-900">Notifications</h2>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-gray-500 py-4">Configure which notifications you receive via email and in-app.</p>
          </CardBody>
        </Card>
      </div>
    </section>
  );
}

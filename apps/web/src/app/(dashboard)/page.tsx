import { Breadcrumbs } from '@/components/layout';

export default function DashboardPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: 'Dashboard' }]} />
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-2 text-gray-600">Welcome to Kairos Church Administration.</p>
    </>
  );
}

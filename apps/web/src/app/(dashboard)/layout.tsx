import { AppShell } from '@/components/layout';
import { ProtectedRoute } from '@/lib/auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Layers, Plus } from 'lucide-react';
import { departments } from '@kairos/api-client';
import type { BranchDepartment } from '@kairos/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardBody, Skeleton, Badge } from '@/components/ui';

interface EnrichedDept extends BranchDepartment {
  departmentName?: string;
  leadName?: string;
  deputyName?: string;
  memberCount?: number;
}

function DepartmentCard({ dept }: { dept: BranchDepartment }) {
  const enriched = dept as EnrichedDept;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-primary" />
            <h2 className="text-sm font-semibold text-gray-900">{enriched.departmentName || `Department #${dept.departmentId}`}</h2>
          </div>
          <Badge variant={dept.isActive ? 'active' : 'inactive'}>
            {dept.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </CardHeader>
      <CardBody>
        <p className="text-xs text-gray-700">Lead: {enriched.leadName || `Member #${dept.leadMemberId}`}</p>
        {dept.deputyMemberId && (
          <p className="text-xs text-gray-700">Deputy: {enriched.deputyName || `Member #${dept.deputyMemberId}`}</p>
        )}
        {typeof enriched.memberCount === 'number' && (
          <p className="text-xs text-gray-500 mt-1">{enriched.memberCount} member{enriched.memberCount !== 1 ? 's' : ''}</p>
        )}
      </CardBody>
    </Card>
  );
}

export default function DepartmentsPage() {
  const [data, setData] = useState<BranchDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    departments.list({ limit: 100 })
      .then((res) => setData(res.data))
      .catch(() => setError('Failed to load departments'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section aria-label="Department management">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
          <p className="text-sm text-gray-500 mt-1">Manage church departments and assignments</p>
        </div>
        <Button>
          <Plus size={16} className="mr-2" />
          Add Department
        </Button>
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))}
        </div>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.length === 0 ? (
            <p className="text-sm text-gray-500 col-span-full text-center py-12">No departments found.</p>
          ) : (
            data.map((dept) => (
              <DepartmentCard key={dept.branchDepartmentId} dept={dept} />
            ))
          )}
        </div>
      )}
    </section>
  );
}

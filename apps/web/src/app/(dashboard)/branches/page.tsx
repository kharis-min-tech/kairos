'use client';

import { useEffect, useState } from 'react';
import { Building2, Plus } from 'lucide-react';
import { branches } from '@kairos/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardBody, Skeleton, Badge } from '@/components/ui';

interface BranchItem {
  branch_id: number;
  branch_name: string;
  branch_type: string;
  is_active: boolean;
  contact_email?: string;
  contact_phone?: string;
}

export default function BranchesPage() {
  const [data, setData] = useState<BranchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    branches.list({ limit: 100 })
      .then((res) => setData(res.data as BranchItem[]))
      .catch(() => setError('Failed to load branches'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section aria-label="Branch management">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branches</h1>
          <p className="text-sm text-gray-500 mt-1">Manage church branches and locations</p>
        </div>
        <Button>
          <Plus size={16} className="mr-2" />
          Add Branch
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
            <p className="text-sm text-gray-500 col-span-full text-center py-12">No branches found.</p>
          ) : (
            data.map((branch) => (
              <Card key={branch.branch_id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 size={18} className="text-primary" />
                      <h2 className="text-sm font-semibold text-gray-900">{branch.branch_name}</h2>
                    </div>
                    <Badge variant={branch.is_active ? 'active' : 'inactive'}>
                      {branch.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardBody>
                  <p className="text-xs text-gray-500">Type: {branch.branch_type}</p>
                  {branch.contact_email && (
                    <p className="text-xs text-gray-500 mt-1">{branch.contact_email}</p>
                  )}
                  {branch.contact_phone && (
                    <p className="text-xs text-gray-500 mt-1">{branch.contact_phone}</p>
                  )}
                </CardBody>
              </Card>
            ))
          )}
        </div>
      )}
    </section>
  );
}

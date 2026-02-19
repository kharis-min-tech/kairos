'use client';

import { useEffect, useState } from 'react';
import { UsersRound, Plus } from 'lucide-react';
import { fellowships } from '@kairos/api-client';
import type { Fellowship } from '@kairos/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardBody, Skeleton, Badge } from '@/components/ui';

export default function FellowshipsPage() {
  const [data, setData] = useState<Fellowship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fellowships.list({ limit: 100 })
      .then((res) => setData(res.data))
      .catch(() => setError('Failed to load fellowships'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section aria-label="Fellowship management">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fellowships</h1>
          <p className="text-sm text-gray-500 mt-1">Manage fellowship groups and membership</p>
        </div>
        <Button>
          <Plus size={16} className="mr-2" />
          Add Fellowship
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
            <p className="text-sm text-gray-500 col-span-full text-center py-12">No fellowships found.</p>
          ) : (
            data.map((f) => (
              <Card key={f.fellowship_id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UsersRound size={18} className="text-primary" />
                      <h2 className="text-sm font-semibold text-gray-900">{f.fellowship_name}</h2>
                    </div>
                    <Badge variant={f.is_active ? 'active' : 'inactive'}>
                      {f.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardBody>
                  {f.description && (
                    <p className="text-xs text-gray-500 mb-2">{f.description}</p>
                  )}
                  {f.meeting_schedule && (
                    <p className="text-xs text-gray-500 mt-1">Schedule: {f.meeting_schedule}</p>
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

'use client';

import { Suspense } from 'react';
import { Spinner } from '@/components/ui';
import OutreachProgramDetailPage from './program-detail';

export default function Page() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Spinner size="lg" /></div>}>
      <OutreachProgramDetailPage />
    </Suspense>
  );
}

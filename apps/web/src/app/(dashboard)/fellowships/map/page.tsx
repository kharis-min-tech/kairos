'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const FellowshipMap = dynamic(() => import('@/components/fellowship-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-sm text-muted-foreground">Loading map...</p>
      </div>
    </div>
  ),
});

export default function FellowshipMapPage() {
  return (
    <Suspense fallback={<div className="flex h-[calc(100vh-4rem)] items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>}>
      <FellowshipMap />
    </Suspense>
  );
}

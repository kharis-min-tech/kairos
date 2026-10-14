'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useTranslation } from 'react-i18next';

/**
 * next/dynamic's `loading` runs at module scope, so it cannot call
 * useTranslation inline -- it has to render a component that can.
 */
function MapLoading() {
  const { t } = useTranslation(['fellowships', 'common']);
  return (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-sm text-muted-foreground">{t('fellowships:loadingMap')}</p>
      </div>
    </div>
  );
}

const FellowshipMap = dynamic(() => import('@/components/fellowship-map'), {
  ssr: false,
  loading: () => <MapLoading />,
});

export default function FellowshipMapPage() {  const { t } = useTranslation(['fellowships', 'common']);

  return (
    <Suspense fallback={<div className="flex h-[calc(100vh-4rem)] items-center justify-center"><p className="text-muted-foreground">{t('fellowships:loading')}</p></div>}>
      <FellowshipMap />
    </Suspense>
  );
}

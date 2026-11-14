import type { Metadata } from 'next';

import { serverTranslator } from '@/lib/server-translate';
import { AcceptableUseBody } from '@/components/legal/acceptable-use-body';

export async function generateMetadata(): Promise<Metadata> {
  const t = await serverTranslator();
  return {
    title: t('legalAcceptableUse:metaTitle', 'Acceptable Use Policy | Kharis Church'),
    description: t('legalAcceptableUse:metaDescription', 'How members are expected to use Kairos, the internal Kharis Church platform.'),
  };
}

export default function AcceptableUsePage() {
  return <AcceptableUseBody />;
}

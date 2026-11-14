import type { Metadata } from 'next';

import { serverTranslator } from '@/lib/server-translate';
import { ConfidentialityBody } from '@/components/legal/confidentiality-body';

export async function generateMetadata(): Promise<Metadata> {
  const t = await serverTranslator();
  return {
    title: t('legalConfidentiality:metaTitle', 'Confidentiality & Data Handling Undertaking | Kharis Church'),
    description: t('legalConfidentiality:metaDescription', 'Written undertaking required from anyone granted a leadership or administrative role in Kairos.'),
  };
}

export default function ConfidentialityPage() {
  return <ConfidentialityBody />;
}

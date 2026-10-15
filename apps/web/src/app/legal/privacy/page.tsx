import type { Metadata } from 'next';

import { serverTranslator } from '@/lib/server-translate';
import { PrivacyBody } from '@/components/legal/privacy-body';

export async function generateMetadata(): Promise<Metadata> {
  const t = await serverTranslator();
  return {
    title: t('legalPrivacy:metaTitle', 'Privacy Notice | Kharis Church'),
    description: t('legalPrivacy:metaDescription', 'How Kharis Church handles your personal data in Kairos.'),
  };
}

export default function PrivacyPage() {
  return <PrivacyBody />;
}

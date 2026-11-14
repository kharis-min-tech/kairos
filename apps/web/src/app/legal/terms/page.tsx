import type { Metadata } from 'next';

import { serverTranslator } from '@/lib/server-translate';
import { TermsBody } from '@/components/legal/terms-body';

export async function generateMetadata(): Promise<Metadata> {
  const t = await serverTranslator();
  return {
    title: t('legalTerms:metaTitle', 'Terms & Conditions | Kharis Church'),
    description: t('legalTerms:metaDescription', 'Terms of use for Kairos, the Kharis Church administration platform.'),
  };
}

export default function TermsPage() {
  return <TermsBody />;
}

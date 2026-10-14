import type { Metadata } from 'next';
import { TermsBody } from '@/components/legal/terms-body';

export const metadata: Metadata = {
  title: 'Terms & Conditions | Kharis Church',
  description: 'Terms of use for Kairos, the Kharis Church administration platform.',
};

export default function TermsPage() {
  return <TermsBody />;
}

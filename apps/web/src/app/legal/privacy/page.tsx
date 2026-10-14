import type { Metadata } from 'next';
import { PrivacyBody } from '@/components/legal/privacy-body';

export const metadata: Metadata = {
  title: 'Privacy Notice | Kharis Church',
  description: 'How Kharis Church handles your personal data in Kairos.',
};

export default function PrivacyPage() {
  return <PrivacyBody />;
}

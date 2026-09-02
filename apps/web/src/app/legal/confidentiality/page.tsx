import type { Metadata } from 'next';
import { ConfidentialityBody } from '@/components/legal/confidentiality-body';

export const metadata: Metadata = {
  title: 'Confidentiality & Data Handling Undertaking | Kharis Church',
  description:
    'Written undertaking required from anyone granted a leadership or administrative role in Kairos.',
};

export default function ConfidentialityPage() {
  return <ConfidentialityBody />;
}

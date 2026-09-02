import type { Metadata } from 'next';
import { AcceptableUseBody } from '@/components/legal/acceptable-use-body';

export const metadata: Metadata = {
  title: 'Acceptable Use Policy | Kharis Church',
  description:
    'How members are expected to use Kairos, the internal Kharis Church platform.',
};

export default function AcceptableUsePage() {
  return <AcceptableUseBody />;
}

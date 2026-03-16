import FellowshipDetailPage from './fellowship-detail';


export function generateStaticParams() {
  // Dummy param to satisfy static export
  return [{ fellowshipId: 'dummy' }];
}

export default function Page() {
  return <FellowshipDetailPage />;
}

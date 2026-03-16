import BranchDetailPage from './branch-detail';


export function generateStaticParams() {
  // Dummy param to satisfy static export
  return [{ branchId: 'dummy' }];
}

export default function Page() {
  return <BranchDetailPage />;
}

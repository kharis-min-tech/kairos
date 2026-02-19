interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
}

function Skeleton({ className = '', width, height }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200 ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export { Skeleton };
export type { SkeletonProps };

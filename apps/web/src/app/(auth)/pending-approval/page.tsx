import Link from 'next/link';
import { KharisCardHeader } from '../kharis-logo';

export default function PendingApprovalPage() {
  return (
    <>
      <KharisCardHeader
        heading="Account pending approval"
        subtitle="Your email has been verified. A church administrator will review and approve your account shortly."
      />

      <div className="rounded-2xl bg-card p-8 shadow-[0_8px_40px_rgba(26,28,28,0.06)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
        <div className="space-y-5">
          <div className="rounded-lg bg-[#5D3FD3]/5 p-5 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#5D3FD3]/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-[#5D3FD3]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">
              You&apos;ll receive a notification once your account is approved.
            </p>
          </div>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-muted-foreground/10" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-3 text-xs uppercase tracking-wider text-muted-foreground/40">
                or
              </span>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground/70">
            Already approved?{' '}
            <Link href="/login" className="font-semibold text-[#5D3FD3] hover:opacity-80">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

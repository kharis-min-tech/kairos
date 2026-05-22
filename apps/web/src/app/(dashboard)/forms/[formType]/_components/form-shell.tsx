'use client';

import Link from 'next/link';
import { Button, Card, CardContent, buttonVariants, cn } from '@kairos/ui';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

interface FormShellProps {
  title: string;
  description: string;
  branchName?: string | null;
  submitted: boolean;
  successTitle: string;
  successMessage: string;
  onSubmitAnother: () => void;
  children: React.ReactNode;
}

export function FormShell({
  title,
  description,
  branchName,
  submitted,
  successTitle,
  successMessage,
  onSubmitAnother,
  children,
}: FormShellProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-2">
      <div className="flex items-center gap-3">
        <Link
          href="/forms"
          aria-label="Back to forms"
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      {branchName ? (
        <p className="text-xs text-muted-foreground">
          Submitting for branch{' '}
          <span className="font-semibold text-[#5D3FD3]">{branchName}</span>
        </p>
      ) : null}

      {submitted ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <CheckCircle2 className="h-12 w-12 text-[#16A34A]" aria-hidden />
            <div>
              <h2 className="text-lg font-semibold text-foreground">{successTitle}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{successMessage}</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={onSubmitAnother} className="bg-[#5D3FD3] hover:bg-[#451ebb]">
                Submit another
              </Button>
              <Link href="/forms" className={cn(buttonVariants({ variant: 'outline' }))}>
                Back to forms
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        children
      )}
    </div>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kairos/ui';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export default function MembersImportPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.activeRole);
  const canImport = user?.systemRole === 'admin' || activeRole === 'pastor';

  useEffect(() => {
    if (user !== null && !canImport) router.replace('/members');
  }, [user, canImport, router]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setResult(null);
    setError(null);
  }

  async function handleImport() {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.members.importCsv(file);
      setResult(res.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed. Please check your CSV format.');
    } finally {
      setIsLoading(false);
    }
  }

  if (user !== null && !canImport) return null;

  async function handleDownloadTemplate() {
    const csvContent = [
      'firstName,lastName,middleName,email,phone,gender,dateOfBirth,address,city,postalCode,homeBranchId,emergencyContactName,emergencyContactRelationship,emergencyContactPhone',
      'John,Doe,,john.doe@example.com,+1234567890,Male,1990-01-15,123 Main St,Lagos,100001,branch-uuid-here,Jane Doe,Spouse,+0987654321',
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'members-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between pb-6">
        <div>
          <Link href="/members" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-1">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Members
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Import Members</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Upload a CSV file to bulk-import church members</p>
        </div>
      </div>

      {/* Template download */}
      <Card>
        <CardHeader>
          <CardTitle>Step 1 — Download Template</CardTitle>
          <CardDescription>Use the provided CSV template for correct formatting</CardDescription>
        </CardHeader>
        <CardContent>
          <button
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-2 rounded-lg border border-input/15 bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download CSV Template
          </button>
          <p className="mt-2 text-xs text-muted-foreground">
            Required columns: firstName, lastName, email, homeBranchId. All other columns are optional.
          </p>
        </CardContent>
      </Card>

      {/* Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Step 2 — Upload CSV File</CardTitle>
          <CardDescription>Select your filled-in CSV file</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label={file ? `Selected file: ${file.name}. Click to change.` : 'Choose CSV file'}
            className="flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 transition-colors hover:border-primary/50 hover:bg-muted/50 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <svg className="h-10 w-10 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            {file ? (
              <p className="mt-2 text-sm font-medium text-foreground">{file.name}</p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Click to select a CSV file</p>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileChange}
          />

          {error && (
            <div role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button
            onClick={handleImport}
            disabled={!file || isLoading}
            variant="success"
          >
            {isLoading ? 'Importing…' : 'Import Members'}
          </Button>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Import Complete</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg bg-emerald-500/10 p-3">
              <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{result.imported} member(s) imported successfully</p>
            </div>
            {result.errors.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">Errors ({result.errors.length} rows skipped):</p>
                <ul className="max-h-48 space-y-0.5 overflow-y-auto rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                  {result.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            <Link href="/members">
              <Button variant="outline">View Members</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

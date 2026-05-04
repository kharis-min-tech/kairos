'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@kairos/ui';
import { useAuthStore } from '@/lib/auth-store';
import { useRecordManualDonation } from '@/hooks/use-donations';

interface ImportError {
  row: number;
  field: string;
  message: string;
}

interface ImportResult {
  success: number;
  errors: ImportError[];
}

export default function DonationImportPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.activeRole);
  const isAdmin = user?.systemRole === 'admin' && activeRole === 'admin';
  const isPastor = user?.systemRole === 'pastor' || activeRole === 'pastor';

  useEffect(() => {
    if (user && !isAdmin && !isPastor) {
      router.replace('/donations');
    }
  }, [user, isAdmin, isPastor, router]);

  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const recordDonation = useRecordManualDonation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast.error('Please select a CSV file');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const downloadTemplate = (preset?: 'current-tax-year' | 'last-tax-year') => {
    let rows = [
      ['member_id', 'amount', 'donation_purpose', 'payment_method', 'donation_date', 'is_anonymous', 'description'],
      ['123', '100.00', 'Tithe', 'Cash', '2026-02-20', 'false', ''],
      ['456', '50.00', 'Offering', 'Bank Transfer', '2026-02-19', 'false', ''],
      ['', '200.00', 'Building Fund', 'Check', '2026-02-18', 'true', 'Anonymous donation'],
    ];

    if (preset === 'current-tax-year') {
      rows = [
        ['member_id', 'amount', 'donation_purpose', 'payment_method', 'donation_date', 'is_anonymous', 'description'],
        ['123', '1000.00', 'Tithe', 'Bank Transfer', '2025-04-06', 'false', 'Current tax year'],
      ];
    } else if (preset === 'last-tax-year') {
      rows = [
        ['member_id', 'amount', 'donation_purpose', 'payment_method', 'donation_date', 'is_anonymous', 'description'],
        ['123', '1000.00', 'Tithe', 'Bank Transfer', '2024-04-06', 'false', 'Last tax year'],
      ];
    }

    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = preset ? `donation-import-${preset}.csv` : 'donation-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file to import');
      return;
    }

    setImporting(true);
    const errors: ImportError[] = [];
    let successCount = 0;

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error('CSV file is empty or invalid');
        setImporting(false);
        return;
      }

      const headers = lines[0]!.split(',').map(h => h.trim());
      
      // Validate required columns
      const requiredColumns = ['amount', 'donation_purpose', 'payment_method', 'donation_date'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));
      
      if (missingColumns.length > 0) {
        toast.error(`Missing required columns: ${missingColumns.join(', ')}`);
        setImporting(false);
        return;
      }

      // Process each row
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i]!.split(',').map(v => v.trim());
        const row: Record<string, string> = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] ?? '';
        });

        // Validate and record donation
        try {
          const amount = parseFloat(row['amount'] ?? '');
          if (isNaN(amount) || amount <= 0) {
            errors.push({ row: i + 1, field: 'amount', message: 'Invalid amount' });
            continue;
          }

          const validPurposes = ['Offering', 'Tithe', 'Building Fund', 'Other'];
          if (!validPurposes.includes(row['donation_purpose'] ?? '')) {
            errors.push({ row: i + 1, field: 'donation_purpose', message: 'Invalid purpose' });
            continue;
          }

          const validPaymentMethods = ['Cash', 'Check', 'Bank Transfer', 'Mobile Money'];
          if (!validPaymentMethods.includes(row['payment_method'] ?? '')) {
            errors.push({ row: i + 1, field: 'payment_method', message: 'Invalid payment method' });
            continue;
          }

          if (!row['donation_date'] || !/^\d{4}-\d{2}-\d{2}$/.test(row['donation_date'])) {
            errors.push({ row: i + 1, field: 'donation_date', message: 'Invalid date format (use YYYY-MM-DD)' });
            continue;
          }

          if (row['donation_purpose'] === 'Other' && !row['description']) {
            errors.push({ row: i + 1, field: 'description', message: 'Description required for "Other" purpose' });
            continue;
          }

          // Record donation
          await recordDonation.mutateAsync({
            memberId: row['member_id'] || null,
            amount,
            donationPurpose: row['donation_purpose'] as any,
            paymentMethod: row['payment_method'] as any,
            donationDate: row['donation_date']!,
            isAnonymous: row['is_anonymous'] === 'true',
            description: row['description'] || undefined,
          });

          successCount++;
        } catch (error: any) {
          errors.push({ 
            row: i + 1, 
            field: 'general', 
            message: error?.message || 'Failed to record donation' 
          });
        }
      }

      setResult({ success: successCount, errors });
      
      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} donation(s)!`);
      }
      if (errors.length > 0) {
        toast.error(`${errors.length} row(s) failed to import`);
      }
    } catch (error) {
      toast.error('Failed to process CSV file. Please check the format.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Import Donations</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Upload a CSV file to bulk import donations
          </p>
        </div>
        <Link href="/donations">
          <Button variant="outline" size="sm">← Back to Donations</Button>
        </Link>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Required Columns:</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li><code className="bg-muted px-1 py-0.5 rounded">amount</code> - Donation amount (e.g., 100.00)</li>
                <li><code className="bg-muted px-1 py-0.5 rounded">donation_purpose</code> - Offering, Tithe, Building Fund, or Other</li>
                <li><code className="bg-muted px-1 py-0.5 rounded">payment_method</code> - Cash, Check, Bank Transfer, or Mobile Money</li>
                <li><code className="bg-muted px-1 py-0.5 rounded">donation_date</code> - Date in YYYY-MM-DD format</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium mb-2">Optional Columns:</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li><code className="bg-muted px-1 py-0.5 rounded">member_id</code> - Member ID (leave empty for anonymous)</li>
                <li><code className="bg-muted px-1 py-0.5 rounded">is_anonymous</code> - true or false (default: false)</li>
                <li><code className="bg-muted px-1 py-0.5 rounded">description</code> - Additional notes (required if purpose is Other)</li>
              </ul>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" onClick={() => downloadTemplate()}>
                Download CSV Template
              </Button>
              <Button variant="outline" onClick={() => downloadTemplate('current-tax-year')}>
                Current Tax Year (6 Apr 2025 - 5 Apr 2026)
              </Button>
              <Button variant="outline" onClick={() => downloadTemplate('last-tax-year')}>
                Last Tax Year (6 Apr 2024 - 5 Apr 2025)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select CSV File</label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="mt-1 block w-full text-sm text-gray-900 border border-input/15 rounded-lg cursor-pointer bg-background"
              />
              {file && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleImport} disabled={!file || importing}>
                {importing ? 'Importing...' : 'Import Donations'}
              </Button>
              {file && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setFile(null);
                    setResult(null);
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950">
                  <p className="text-sm text-muted-foreground">Successfully Imported</p>
                  <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                    {result.success}
                  </p>
                </div>
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-950">
                  <p className="text-sm text-muted-foreground">Errors</p>
                  <p className="text-3xl font-bold text-rose-600 dark:text-rose-400">
                    {result.errors.length}
                  </p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Errors:</h3>
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 max-h-64 overflow-y-auto dark:border-rose-800 dark:bg-rose-950">
                    <ul className="space-y-2 text-sm">
                      {result.errors.map((err, idx) => (
                        <li key={idx} className="text-rose-800 dark:text-rose-200">
                          <span className="font-medium">Row {err.row}</span> - {err.field}: {err.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {result.success > 0 && result.errors.length === 0 && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950">
                  <p className="text-sm text-emerald-800 dark:text-emerald-200">
                    ✅ {result.success} donation{result.success !== 1 ? 's' : ''} imported successfully!
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

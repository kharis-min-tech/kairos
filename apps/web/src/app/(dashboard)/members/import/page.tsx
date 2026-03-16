'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload, ArrowLeft, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button, Alert, Card, CardHeader, CardContent, SelectInput } from '@/components/ui';
import { PageHeader } from '@/components/shared';
import { useAuth } from '@/lib/auth';
import { useImportMembers } from '@/hooks/use-members';

interface ImportError { row: number; field: string; message: string; }

const REQUIRED_FIELDS = [
  'first_name', 'last_name', 'email', 'phone',
  'date_of_birth', 'gender', 'address', 'home_branch_id',
];

type Step = 'upload' | 'mapping' | 'preview' | 'result';

/**
 * Parse a single CSV line handling quoted values that may contain commas.
 */
function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      values.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  values.push(current.trim());
  return values;
}

export default function CSVImportPage() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importMembers = useImportMembers();
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [createdCount, setCreatedCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mappedRows, setMappedRows] = useState<Record<string, string>[]>([]);

  const parseFile = useCallback((csvFile: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter((l) => l.trim() !== '');
      if (lines.length === 0) return;
      const headerLine = lines[0];
      if (!headerLine) return;
      const headers = parseCsvLine(headerLine);
      setCsvHeaders(headers);
      const dataRows = lines.slice(1).map((line) => parseCsvLine(line));
      setCsvRows(dataRows);
      const autoMap: Record<string, string> = {};
      REQUIRED_FIELDS.forEach((field) => {
        const match = headers.find((h) => h.toLowerCase().replace(/[\s-]/g, '_') === field);
        if (match) autoMap[field] = match;
      });
      setColumnMapping(autoMap);
      setStep('mapping');
    };
    reader.readAsText(csvFile);
  }, []);

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      setErrorMsg('Please upload a CSV file.');
      return;
    }
    setErrorMsg('');
    setFile(selectedFile);
    parseFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  };

  const handlePreview = () => {
    setErrorMsg('');
    const unmapped = REQUIRED_FIELDS.filter((f) => !columnMapping[f]);
    if (unmapped.length > 0) {
      setErrorMsg(`Please map all required fields: ${unmapped.join(', ')}`);
      return;
    }
    const mapped = csvRows.map((row) => {
      const obj: Record<string, string> = {};
      REQUIRED_FIELDS.forEach((field) => {
        const csvCol = columnMapping[field];
        if (!csvCol) {
          obj[field] = '';
          return;
        }
        const colIndex = csvHeaders.indexOf(csvCol);
        obj[field] = colIndex >= 0 && colIndex < row.length ? (row[colIndex] ?? '') : '';
      });
      return obj;
    });
    setMappedRows(mapped);
    setStep('preview');
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    if (mappedRows.length === 0) return;
    try {
      const res = await importMembers.mutateAsync({
        rows: mappedRows,
        branchId: user?.branchId ? Number(user.branchId) : 0,
      });
      setCreatedCount(res.created ?? 0);
      setErrors(res.errors ?? []);
      setStep('result');
    } catch {
      setErrorMsg('Import failed. Please try again.');
    }
  };

  const reset = () => {
    setStep('upload');
    setFile(null);
    setCsvHeaders([]);
    setColumnMapping({});
    setCsvRows([]);
    setMappedRows([]);
    setErrors([]);
    setCreatedCount(0);
    setErrorMsg('');
  };

  const previewRows = mappedRows.slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Members from CSV"
        actions={
          <Button variant="ghost" size="sm" onClick={() => router.push('/members')} aria-label="Back to members">
            <ArrowLeft size={16} />
          </Button>
        }
      />

      {errorMsg && <Alert variant="error">{errorMsg}</Alert>}

      {step === 'upload' && (
        <Card>
          <CardContent className="pt-6">
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors hidden sm:block ${
                dragOver ? 'border-primary bg-purple-50' : 'border-gray-300'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <Upload size={40} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-700 font-medium mb-2">Drag and drop your CSV file here</p>
              <p className="text-sm text-gray-500 mb-4">or click to browse</p>
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                Choose File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />
            </div>
            {/* Mobile: simple tap-to-upload button */}
            <div className="sm:hidden text-center py-8">
              <Upload size={32} className="mx-auto text-gray-400 mb-3" />
              <p className="text-sm text-gray-500 mb-4">Select a CSV file to import</p>
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload size={16} className="mr-2" />
                Choose File
              </Button>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              <p className="font-medium mb-1">Required columns:</p>
              <p>{REQUIRED_FIELDS.join(', ')}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'mapping' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Map Columns</h2>
              <p className="text-sm text-gray-500">{file?.name}</p>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Map each required field to a column from your CSV file.
            </p>
            <div className="space-y-3">
              {REQUIRED_FIELDS.map((field) => (
                <div key={field} className="grid grid-cols-2 gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700">{field.replace(/_/g, ' ')}</label>
                  <SelectInput
                    name={`map-${field}`}
                    options={csvHeaders.map((h) => ({ value: h, label: h }))}
                    placeholder="Select column..."
                    value={columnMapping[field] || ''}
                    onChange={(e) =>
                      setColumnMapping((prev) => ({ ...prev, [field]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="secondary" onClick={reset}>Cancel</Button>
              <Button onClick={handlePreview}>
                Preview Import
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          {mappedRows.length > 500 && (
            <Alert variant="warning">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} />
                <span>Large files may take longer to process.</span>
              </div>
            </Alert>
          )}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Preview Import</h2>
                <p className="text-sm text-gray-500">
                  Showing {previewRows.length} of {mappedRows.length} row{mappedRows.length !== 1 ? 's' : ''}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      {REQUIRED_FIELDS.map((field) => (
                        <th key={field} className="text-left py-2 px-2 text-gray-500 whitespace-nowrap">
                          {field.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        {REQUIRED_FIELDS.map((field) => (
                          <td key={field} className="py-2 px-2 text-gray-700 whitespace-nowrap">
                            {row[field] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="secondary" onClick={() => setStep('mapping')}>Back to Mapping</Button>
                <Button onClick={handleSubmit} disabled={importMembers.isPending}>
                  {importMembers.isPending ? 'Importing…' : 'Import Members'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 'result' && (
        <div className="space-y-4">
          {createdCount > 0 && (
            <Alert variant="success">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} />
                <span>
                  Successfully imported {createdCount} member{createdCount !== 1 ? 's' : ''}.{' '}
                  <Link href="/members" className="underline font-medium">
                    View Members
                  </Link>
                </span>
              </div>
            </Alert>
          )}
          {errors.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertTriangle size={16} />
                  <h2 className="text-sm font-medium">{errors.length} validation error{errors.length !== 1 ? 's' : ''}</h2>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2 text-gray-500">Row</th>
                        <th className="text-left py-2 px-2 text-gray-500">Field</th>
                        <th className="text-left py-2 px-2 text-gray-500">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {errors.map((err, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="py-2 px-2 text-gray-900">{err.row}</td>
                          <td className="py-2 px-2 text-gray-700">{err.field}</td>
                          <td className="py-2 px-2 text-red-600">{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={reset}>Import Another File</Button>
            <Link href="/members">
              <Button>Back to Members</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

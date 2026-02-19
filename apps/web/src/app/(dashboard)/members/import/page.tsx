'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, ArrowLeft, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button, Alert, Card, CardHeader, CardBody, SelectInput } from '@/components/ui';
import { Breadcrumbs } from '@/components/layout';
import { useAuth } from '@/lib/auth';
import { members } from '@kairos/api-client';

interface ImportError { row: number; field: string; message: string; }

const REQUIRED_FIELDS = [
  'first_name', 'last_name', 'email', 'phone',
  'date_of_birth', 'gender', 'address', 'home_branch_id',
];

type Step = 'upload' | 'mapping' | 'result';

export default function CSVImportPage() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [createdCount, setCreatedCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const parseHeaders = useCallback((csvFile: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const firstLine = text.split('\n')[0];
      if (!firstLine) return;
      const headers = firstLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
      setCsvHeaders(headers);
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
    parseHeaders(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    const unmapped = REQUIRED_FIELDS.filter((f) => !columnMapping[f]);
    if (unmapped.length > 0) {
      setErrorMsg(`Please map all required fields: ${unmapped.join(', ')}`);
      return;
    }
    if (!file) return;
    setSubmitting(true);
    try {
      const res = await members.import({
        file: file.name,
        branchId: user?.branchId ? Number(user.branchId) : 0,
      } as Parameters<typeof members.import>[0]);
      setCreatedCount(res.created ?? 0);
      setErrors(res.errors ?? []);
      setStep('result');
    } catch {
      setErrorMsg('Import failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStep('upload');
    setFile(null);
    setCsvHeaders([]);
    setColumnMapping({});
    setErrors([]);
    setCreatedCount(0);
    setErrorMsg('');
  };

  return (
    <>
      <Breadcrumbs items={[{ label: 'Members', href: '/members' }, { label: 'Import CSV' }]} />
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/members')} aria-label="Back to members">
          <ArrowLeft size={16} />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Import Members from CSV</h1>
      </div>

      {errorMsg && <Alert variant="error" className="mb-4">{errorMsg}</Alert>}

      {step === 'upload' && (
        <Card>
          <CardBody>
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
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
            <div className="mt-4 text-sm text-gray-500">
              <p className="font-medium mb-1">Required columns:</p>
              <p>{REQUIRED_FIELDS.join(', ')}</p>
            </div>
          </CardBody>
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
          <CardBody>
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
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Importing…' : 'Import Members'}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === 'result' && (
        <div className="space-y-4">
          {createdCount > 0 && (
            <Alert variant="success">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} />
                <span>Successfully imported {createdCount} member{createdCount !== 1 ? 's' : ''}.</span>
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
              <CardBody>
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
              </CardBody>
            </Card>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={reset}>Import Another File</Button>
            <Button onClick={() => router.push('/members')}>Back to Members</Button>
          </div>
        </div>
      )}
    </>
  );
}

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import { Breadcrumbs } from '@/components/layout';
import { Button, TextInput, SelectInput, Checkbox, Radio, Textarea, DatePicker, Alert, Spinner, Card, CardHeader, CardBody } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { forms } from '@kairos/api-client';

interface FormFieldDef {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  validation?: { min?: number; max?: number; pattern?: string };
}

interface FormData {
  formId: string;
  formName: string;
  formDescription?: string;
  formDefinition: { fields: FormFieldDef[] };
  scope: string;
}

function FormSubmissionContent() {
  const searchParams = useSearchParams();
  const formId = searchParams.get('id') ?? '';
  const { user } = useAuth();
  const [formDef, setFormDef] = useState<FormData | null>(null);
  const [values, setValues] = useState<Record<string, string | string[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await forms.get(formId);
        type RawFormData = { formId?: string; formName?: string; formDescription?: string; formDefinition?: { fields?: FormFieldDef[] }; scope?: string };
        const raw = res.data as unknown as RawFormData ?? {};
        const definition = (raw.formDefinition ?? {}) as { fields?: FormFieldDef[] };
        setFormDef({
          formId: raw.formId ?? '',
          formName: raw.formName ?? '',
          formDescription: raw.formDescription ?? undefined,
          formDefinition: { fields: definition.fields ?? [] },
          scope: raw.scope ?? '',
        });
        // Auto-populate from member profile
        const autoValues: Record<string, string> = {};
        const fields = definition.fields ?? [];
        fields.forEach((f: FormFieldDef) => {
          if (user) {
            const label = f.label.toLowerCase();
            if (f.type === 'Email' && user.email) autoValues[f.id] = user.email;
            if (label.includes('email') && user.email) autoValues[f.id] = user.email;
          }
        });
        setValues(autoValues);
      } catch {
        setFetchError('Failed to load form.');
      } finally {
        setLoading(false);
      }
    })();
  }, [formId, user]);

  const validate = (): boolean => {
    if (!formDef) return false;
    const errs: Record<string, string> = {};
    formDef.formDefinition.fields.forEach((field) => {
      const val = values[field.id];
      if (field.required && (!val || (Array.isArray(val) && val.length === 0))) {
        errs[field.id] = `${field.label} is required`;
      }
      if (val && field.validation?.pattern) {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(String(val))) errs[field.id] = `${field.label} format is invalid`;
      }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await forms.submit(formId, { data: values });
      setSubmitted(true);
    } catch {
      setErrors({ _form: 'Failed to submit form. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const updateValue = (fieldId: string, value: string | string[]) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) setErrors((prev) => { const n = { ...prev }; delete n[fieldId]; return n; });
  };

  const renderField = (field: FormFieldDef) => {
    const val = values[field.id] ?? '';
    const err = errors[field.id];
    switch (field.type) {
      case 'Textarea':
        return <Textarea label={field.label} name={field.id} placeholder={field.placeholder} value={String(val)} onChange={(e) => updateValue(field.id, e.target.value)} error={err} required={field.required} />;
      case 'Date':
        return <DatePicker label={field.label} name={field.id} value={String(val)} onChange={(e) => updateValue(field.id, e.target.value)} error={err} required={field.required} />;
      case 'Dropdown':
        return <SelectInput label={field.label} name={field.id} options={(field.options || []).map((o) => ({ value: o, label: o }))} placeholder={field.placeholder || 'Select...'} value={String(val)} onChange={(e) => updateValue(field.id, e.target.value)} error={err} required={field.required} />;
      case 'Checkbox':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}{field.required && <span className="text-red-500 ml-1">*</span>}</label>
            <div className="space-y-1">
              {(field.options || []).map((opt) => {
                const checked = Array.isArray(val) ? val.includes(opt) : false;
                return (
                  <Checkbox key={opt} label={opt} checked={checked} onChange={() => {
                    const current = Array.isArray(val) ? val : [];
                    updateValue(field.id, checked ? current.filter((v) => v !== opt) : [...current, opt]);
                  }} />
                );
              })}
            </div>
            {err && <p className="mt-1 text-sm text-red-600">{err}</p>}
          </div>
        );
      case 'Radio':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}{field.required && <span className="text-red-500 ml-1">*</span>}</label>
            <div className="space-y-1">
              {(field.options || []).map((opt) => (
                <Radio key={opt} label={opt} name={field.id} value={opt} checked={val === opt} onChange={() => updateValue(field.id, opt)} />
              ))}
            </div>
            {err && <p className="mt-1 text-sm text-red-600">{err}</p>}
          </div>
        );
      default:
        return <TextInput label={field.label} name={field.id} type={field.type === 'Email' ? 'email' : field.type === 'Phone' ? 'tel' : field.type === 'Number' ? 'number' : 'text'} placeholder={field.placeholder} value={String(val)} onChange={(e) => updateValue(field.id, e.target.value)} error={err} required={field.required} />;
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  if (fetchError) return <Alert variant="error">{fetchError}</Alert>;
  if (!formDef) return <Alert variant="error">Form not found.</Alert>;

  if (submitted) {
    return (
      <>
        <Breadcrumbs items={[{ label: 'Forms', href: '/forms' }, { label: formDef.formName }]} />
        <Card className="max-w-lg mx-auto mt-12">
          <CardBody>
            <div className="text-center py-8">
              <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Submission Received</h2>
              <p className="text-gray-600">Thank you for submitting the form. A confirmation email has been sent.</p>
              <Button className="mt-6" onClick={() => { setSubmitted(false); setValues({}); }}>Submit Another</Button>
            </div>
          </CardBody>
        </Card>
      </>
    );
  }

  return (
    <>
      <Breadcrumbs items={[{ label: 'Forms', href: '/forms' }, { label: formDef.formName }]} />
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <h1 className="text-xl font-semibold text-gray-900">{formDef.formName}</h1>
          {formDef.formDescription && <p className="text-sm text-gray-500 mt-1">{formDef.formDescription}</p>}
        </CardHeader>
        <CardBody>
          {errors._form && <Alert variant="error" className="mb-4">{errors._form}</Alert>}
          <form onSubmit={handleSubmit} className="space-y-4">
            {formDef.formDefinition.fields.map((field) => (
              <div key={field.id}>{renderField(field)}</div>
            ))}
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Submitting…' : 'Submit'}
            </Button>
          </form>
        </CardBody>
      </Card>
    </>
  );
}

export default function FormSubmissionPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Spinner size="lg" /></div>}>
      <FormSubmissionContent />
    </Suspense>
  );
}

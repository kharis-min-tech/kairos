'use client';

import { useState } from 'react';
import { Save, Plus, Copy } from 'lucide-react';
import { Breadcrumbs } from '@/components/layout';
import { Button, Card, CardHeader, CardBody, TextInput, SelectInput, Checkbox, Textarea, Modal, Alert } from '@/components/ui';
import { forms } from '@kairos/api-client';
import type { FormFieldType } from '@kairos/types';

// ─── Types ───────────────────────────────────────────────────────

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder: string;
  required: boolean;
  options?: string[];
  validation?: { min?: number; max?: number; pattern?: string };
}

interface FormDefinition {
  name: string;
  description: string;
  scope: 'Church-wide' | 'Branch-specific';
  targetBranchId?: number;
  fields: FormField[];
}

interface FormTemplate { id: number; name: string; description?: string; }

// ─── Field type palette ──────────────────────────────────────────

const FIELD_TYPES: { type: FormFieldType; label: string; icon: string }[] = [
  { type: 'Text', label: 'Text', icon: 'Aa' },
  { type: 'Number', label: 'Number', icon: '#' },
  { type: 'Email', label: 'Email', icon: '@' },
  { type: 'Phone', label: 'Phone', icon: '📞' },
  { type: 'Date', label: 'Date', icon: '📅' },
  { type: 'Dropdown', label: 'Dropdown', icon: '▼' },
  { type: 'Checkbox', label: 'Checkbox', icon: '☑' },
  { type: 'Radio', label: 'Radio', icon: '◉' },
  { type: 'Textarea', label: 'Textarea', icon: '¶' },
];

let fieldCounter = 0;
function generateFieldId() {
  fieldCounter += 1;
  return `field_${Date.now()}_${fieldCounter}`;
}

// ─── Field Config Panel ──────────────────────────────────────────

function FieldConfigPanel({ field, onChange, onRemove }: { field: FormField; onChange: (f: FormField) => void; onRemove: () => void }) {
  const hasOptions = ['Dropdown', 'Radio', 'Checkbox'].includes(field.type);
  return (
    <Card className="mb-3">
      <CardBody>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">{field.type} Field</span>
          <Button variant="danger" size="sm" onClick={onRemove} aria-label={`Remove ${field.label || field.type} field`}>Remove</Button>
        </div>
        <div className="space-y-3">
          <TextInput label="Label" value={field.label} onChange={(e) => onChange({ ...field, label: e.target.value })} placeholder="Field label" />
          <TextInput label="Placeholder" value={field.placeholder} onChange={(e) => onChange({ ...field, placeholder: e.target.value })} placeholder="Placeholder text" />
          <Checkbox label="Required" checked={field.required} onChange={(e) => onChange({ ...field, required: (e.target as HTMLInputElement).checked })} />
          {hasOptions && (
            <TextInput label="Options (comma-separated)" value={(field.options || []).join(', ')} onChange={(e) => onChange({ ...field, options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean) })} placeholder="Option 1, Option 2, Option 3" />
          )}
        </div>
      </CardBody>
    </Card>
  );
}

// ─── Live Preview ────────────────────────────────────────────────

function LivePreview({ fields, formName }: { fields: FormField[]; formName: string }) {
  const cls = 'w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500';
  return (
    <Card>
      <CardHeader><h3 className="text-lg font-semibold text-gray-900">{formName || 'Untitled Form'}</h3></CardHeader>
      <CardBody>
        {fields.length === 0 ? (
          <p className="text-gray-500 text-sm">Add field types from the palette to build your form.</p>
        ) : (
          <div className="space-y-4">
            {fields.map((field) => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label || 'Untitled'}{field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {field.type === 'Textarea' ? (
                  <textarea className={`${cls} min-h-[60px]`} placeholder={field.placeholder} disabled />
                ) : field.type === 'Dropdown' ? (
                  <select className={cls} disabled><option>{field.placeholder || 'Select...'}</option>{(field.options || []).map((o) => <option key={o}>{o}</option>)}</select>
                ) : field.type === 'Checkbox' ? (
                  <div className="space-y-1">{(field.options || ['Option']).map((o) => <label key={o} className="flex items-center gap-2 text-sm text-gray-500"><input type="checkbox" disabled className="h-4 w-4" /> {o}</label>)}</div>
                ) : field.type === 'Radio' ? (
                  <div className="space-y-1">{(field.options || ['Option']).map((o) => <label key={o} className="flex items-center gap-2 text-sm text-gray-500"><input type="radio" disabled className="h-4 w-4" /> {o}</label>)}</div>
                ) : (
                  <input className={cls} type={field.type === 'Date' ? 'date' : 'text'} placeholder={field.placeholder} disabled />
                )}
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// ─── Main Component ──────────────────────────────────────────────

export default function FormBuilderPage() {
  const [form, setForm] = useState<FormDefinition>({ name: '', description: '', scope: 'Church-wide', fields: [] });
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const addField = (type: FormFieldType) => {
    const newField: FormField = { id: generateFieldId(), type, label: '', placeholder: '', required: false };
    if (['Dropdown', 'Radio', 'Checkbox'].includes(type)) newField.options = [];
    setForm((prev) => ({ ...prev, fields: [...prev.fields, newField] }));
    setSelectedFieldId(newField.id);
  };

  const updateField = (id: string, updated: FormField) => {
    setForm((prev) => ({ ...prev, fields: prev.fields.map((f) => (f.id === id ? updated : f)) }));
  };

  const removeField = (id: string) => {
    setForm((prev) => ({ ...prev, fields: prev.fields.filter((f) => f.id !== id) }));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  const handleSave = async () => {
    setError('');
    if (!form.name.trim()) { setError('Form name is required.'); return; }
    if (form.fields.length === 0) { setError('Add at least one field.'); return; }
    if (form.scope === 'Branch-specific' && !form.targetBranchId) { setError('Branch is required for branch-specific forms.'); return; }
    setSaving(true);
    try {
      await forms.create({
        formName: form.name,
        formDescription: form.description || undefined,
        formDefinition: { fields: form.fields },
        scope: form.scope,
        targetBranchId: form.targetBranchId,
      });
      setSuccess('Form saved successfully!');
    } catch {
      setError('Failed to save form.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    setError('');
    if (!form.name.trim()) { setError('Form name is required.'); return; }
    setSaving(true);
    try {
      await forms.saveTemplate({ name: form.name, definition: { fields: form.fields } });
      setSuccess('Template saved!');
    } catch {
      setError('Failed to save template.');
    } finally {
      setSaving(false);
    }
  };

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await forms.listTemplates();
      setTemplates((res.data ?? []).map((t: { formId: number; formName: string; formDescription?: string }) => ({
        id: t.formId,
        name: t.formName,
        description: t.formDescription,
      })));
    } catch {
      // silent
    } finally {
      setLoadingTemplates(false);
      setShowTemplates(true);
    }
  };

  const loadFromTemplate = async (templateId: number) => {
    try {
      const res = await forms.get(templateId);
      const definition = res.formDefinition as { fields?: FormField[] };
      if (definition?.fields) {
        setForm((prev) => ({ ...prev, name: res.formName || prev.name, description: res.formDescription || prev.description, fields: definition.fields! }));
      }
      setShowTemplates(false);
      setSuccess('Template loaded!');
    } catch {
      setError('Failed to load template.');
    }
  };

  return (
    <>
      <Breadcrumbs items={[{ label: 'Forms', href: '/forms' }, { label: 'Builder' }]} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Form Builder</h1>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={loadTemplates}><Copy size={16} className="mr-1" /> From Template</Button>
          <Button variant="secondary" size="sm" onClick={handleSaveAsTemplate} disabled={saving}>Save as Template</Button>
          <Button onClick={handleSave} disabled={saving}><Save size={16} className="mr-1" /> {saving ? 'Saving…' : 'Save Form'}</Button>
        </div>
      </div>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4">{success}</Alert>}

      {/* Form Settings */}
      <Card className="mb-6">
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <TextInput label="Form Name" name="formName" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Enter form name" />
            <Textarea label="Description" name="formDesc" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Optional description" />
            <SelectInput label="Scope" name="scope" options={[{ value: 'Church-wide', label: 'Church-wide' }, { value: 'Branch-specific', label: 'Branch-specific' }]} value={form.scope} onChange={(e) => setForm((p) => ({ ...p, scope: e.target.value as FormDefinition['scope'] }))} />
            {form.scope === 'Branch-specific' && (
              <TextInput label="Target Branch ID" name="branchId" type="number" value={form.targetBranchId?.toString() || ''} onChange={(e) => setForm((p) => ({ ...p, targetBranchId: e.target.value ? Number(e.target.value) : undefined }))} />
            )}
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Field Palette */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><h2 className="text-sm font-medium text-gray-700">Field Types</h2></CardHeader>
            <CardBody>
              <div className="space-y-2">
                {FIELD_TYPES.map((ft) => (
                  <button
                    key={ft.type}
                    onClick={() => addField(ft.type)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg border border-gray-200 hover:bg-purple-50 hover:border-primary transition-colors"
                  >
                    <span className="text-base">{ft.icon}</span>
                    <span>{ft.label}</span>
                    <Plus size={14} className="ml-auto text-gray-400" />
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Field Configuration */}
        <div className="lg:col-span-5">
          <Card>
            <CardHeader><h2 className="text-sm font-medium text-gray-700">Fields ({form.fields.length})</h2></CardHeader>
            <CardBody>
              {form.fields.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">Click a field type to add it to your form.</p>
              ) : (
                form.fields.map((field) => (
                  <FieldConfigPanel key={field.id} field={field} onChange={(updated) => updateField(field.id, updated)} onRemove={() => removeField(field.id)} />
                ))
              )}
            </CardBody>
          </Card>
        </div>

        {/* Live Preview */}
        <div className="lg:col-span-5">
          <LivePreview fields={form.fields} formName={form.name} />
        </div>
      </div>

      {/* Templates Modal */}
      <Modal open={showTemplates} onClose={() => setShowTemplates(false)} title="Create from Template">
        {loadingTemplates ? (
          <p className="text-sm text-gray-500 py-4">Loading templates…</p>
        ) : templates.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">No templates available.</p>
        ) : (
          <div className="space-y-2">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => loadFromTemplate(t.id)}
                className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-purple-50 transition-colors"
              >
                <p className="font-medium text-gray-900">{t.name}</p>
                {t.description && <p className="text-sm text-gray-500">{t.description}</p>}
              </button>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}

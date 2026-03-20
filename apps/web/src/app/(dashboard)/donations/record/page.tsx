'use client';

import { useState } from 'react';
import { Breadcrumbs } from '@/components/layout';
import { Button, Card, CardHeader, CardBody, TextInput, SelectInput, Textarea, Checkbox } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { donations } from '@kairos/api-client';

const PURPOSES = [
  { value: 'Offering', label: 'Offering' },
  { value: 'Tithe', label: 'Tithe' },
  { value: 'Building Fund', label: 'Building Fund' },
  { value: 'Other', label: 'Other' },
];

const MANUAL_PAYMENT_METHODS = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Check', label: 'Check' },
  { value: 'Bank Transfer', label: 'Bank Transfer' },
  { value: 'Mobile Money', label: 'Mobile Money' },
];

const formatGBP = (amount: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);

type Tab = 'online' | 'manual';

export default function DonationRecordPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('online');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Online form state
  const [onlineAmount, setOnlineAmount] = useState('');
  const [onlinePurpose, setOnlinePurpose] = useState('');
  const [onlineDescription, setOnlineDescription] = useState('');

  // Manual form state
  const [manualAmount, setManualAmount] = useState('');
  const [manualPurpose, setManualPurpose] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [manualPaymentMethod, setManualPaymentMethod] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [manualAnonymous, setManualAnonymous] = useState(false);
  const [manualMemberId, setManualMemberId] = useState('');

  const resetForms = () => {
    setOnlineAmount(''); setOnlinePurpose(''); setOnlineDescription('');
    setManualAmount(''); setManualPurpose(''); setManualDescription('');
    setManualPaymentMethod(''); setManualDate(''); setManualAnonymous(false);
    setManualMemberId('');
  };

  const handleOnlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null); setSubmitting(true);
    try {
      const amount = parseFloat(onlineAmount);
      if (!amount || amount <= 0) { setError('Amount must be greater than zero'); setSubmitting(false); return; }
      if (!onlinePurpose) { setError('Please select a purpose'); setSubmitting(false); return; }
      if (onlinePurpose === 'Other' && !onlineDescription.trim()) { setError('Description is required when purpose is Other'); setSubmitting(false); return; }

      await donations.createOnline({
        amount,
        purpose: onlinePurpose,
        paymentMethod: 'Online',
        description: onlinePurpose === 'Other' ? onlineDescription : undefined,
      });
      setSuccess(`Online donation of ${formatGBP(amount)} recorded successfully`);
      resetForms();
    } catch {
      setError('Failed to process online donation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null); setSubmitting(true);
    try {
      const amount = parseFloat(manualAmount);
      if (!amount || amount <= 0) { setError('Amount must be greater than zero'); setSubmitting(false); return; }
      if (!manualPurpose) { setError('Please select a purpose'); setSubmitting(false); return; }
      if (manualPurpose === 'Other' && !manualDescription.trim()) { setError('Description is required when purpose is Other'); setSubmitting(false); return; }
      if (!manualPaymentMethod) { setError('Please select a payment method'); setSubmitting(false); return; }
      if (!manualDate) { setError('Please select a date'); setSubmitting(false); return; }

      await donations.createManual({
        amount,
        currency: 'GBP',
        donationDate: new Date(manualDate),
        donationPurpose: manualPurpose as 'Offering' | 'Tithe' | 'Building Fund' | 'Other',
        description: manualPurpose === 'Other' ? manualDescription : undefined,
        paymentMethod: manualPaymentMethod as 'Cash' | 'Check' | 'Bank Transfer' | 'Mobile Money',
        isAnonymous: manualAnonymous,
        memberId: manualAnonymous ? undefined : (manualMemberId ? parseInt(manualMemberId) : undefined),
      });
      setSuccess(`Manual donation of ${formatGBP(amount)} recorded successfully`);
      resetForms();
    } catch {
      setError('Failed to record manual donation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const tabClass = (tab: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 ${
      activeTab === tab
        ? 'border-primary text-primary bg-white'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`;

  return (
    <>
      <Breadcrumbs items={[{ label: 'Donations', href: '/donations' }, { label: 'Record Donation' }]} />
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Record Donation</h1>

      {success && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800" role="alert">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}

      <div className="flex gap-1 border-b border-gray-200 mb-0" role="tablist">
        <button role="tab" aria-selected={activeTab === 'online'} className={tabClass('online')} onClick={() => setActiveTab('online')}>
          Online Payment
        </button>
        <button role="tab" aria-selected={activeTab === 'manual'} className={tabClass('manual')} onClick={() => setActiveTab('manual')}>
          Manual Entry
        </button>
      </div>

      {activeTab === 'online' && (
        <Card className="rounded-t-none border-t-0">
          <CardHeader><h2 className="text-lg font-semibold">Online Donation (Stripe)</h2></CardHeader>
          <CardBody>
            <form onSubmit={handleOnlineSubmit} className="space-y-4 max-w-md">
              <TextInput label="Amount (£)" name="amount" type="number" step="0.01" min="0.01" placeholder="0.00" value={onlineAmount} onChange={(e) => setOnlineAmount(e.target.value)} required />
              <SelectInput label="Purpose" name="purpose" options={PURPOSES} placeholder="Select purpose" value={onlinePurpose} onChange={(e) => setOnlinePurpose(e.target.value)} required />
              {onlinePurpose === 'Other' && (
                <Textarea label="Description" name="description" placeholder="Please describe the purpose" value={onlineDescription} onChange={(e) => setOnlineDescription(e.target.value)} required />
              )}
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                <p className="font-medium mb-1">Stripe Payment Form</p>
                <p>Card payment integration will appear here.</p>
                <p className="text-xs mt-2">Stripe Elements placeholder for MVP</p>
              </div>
              <Button type="submit" disabled={submitting}>{submitting ? 'Processing…' : 'Donate Online'}</Button>
            </form>
          </CardBody>
        </Card>
      )}

      {activeTab === 'manual' && (
        <Card className="rounded-t-none border-t-0">
          <CardHeader><h2 className="text-lg font-semibold">Manual Donation Entry</h2></CardHeader>
          <CardBody>
            <form onSubmit={handleManualSubmit} className="space-y-4 max-w-md">
              <TextInput label="Amount (£)" name="manualAmount" type="number" step="0.01" min="0.01" placeholder="0.00" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} required />
              <SelectInput label="Purpose" name="manualPurpose" options={PURPOSES} placeholder="Select purpose" value={manualPurpose} onChange={(e) => setManualPurpose(e.target.value)} required />
              {manualPurpose === 'Other' && (
                <Textarea label="Description" name="manualDescription" placeholder="Please describe the purpose" value={manualDescription} onChange={(e) => setManualDescription(e.target.value)} required />
              )}
              <SelectInput label="Payment Method" name="paymentMethod" options={MANUAL_PAYMENT_METHODS} placeholder="Select method" value={manualPaymentMethod} onChange={(e) => setManualPaymentMethod(e.target.value)} required />
              <TextInput label="Donation Date" name="donationDate" type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} required />
              <Checkbox label="Anonymous donation" name="anonymous" checked={manualAnonymous} onChange={(e) => setManualAnonymous(e.target.checked)} />
              {!manualAnonymous && (
                <TextInput label="Member ID (optional)" name="memberId" type="number" placeholder="Enter member ID" value={manualMemberId} onChange={(e) => setManualMemberId(e.target.value)} />
              )}
              <Button type="submit" disabled={submitting}>{submitting ? 'Recording…' : 'Record Donation'}</Button>
            </form>
          </CardBody>
        </Card>
      )}

      <p className="mt-4 text-xs text-gray-500">
        Logged in as: {user?.email ?? '—'} · Role: {user?.role ?? '—'}
      </p>
    </>
  );
}

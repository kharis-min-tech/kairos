'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@kairos/ui';
import { useAuthStore } from '@/lib/auth-store';
import { useRecordManualDonation } from '@/hooks/use-donations';
import { useMembers } from '@/hooks/use-members';

const PURPOSES = ['Offering', 'Tithe', 'Building Fund', 'Other'] as const;
const PAYMENT_METHODS = ['Cash', 'Check', 'Bank Transfer', 'Mobile Money'] as const;

export default function RecordDonationPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const activeRole = useAuthStore((s) => s.activeRole);
  const isAdmin = user?.systemRole === 'admin' && activeRole === 'admin';
  const isPastor = user?.systemRole === 'pastor' || activeRole === 'pastor';

  // Redirect members - they can't record donations
  useEffect(() => {
    if (!isAdmin && !isPastor) {
      router.replace('/donations');
    }
  }, [isAdmin, isPastor, router]);

  const [activeTab, setActiveTab] = useState<'online' | 'manual'>('manual');
  
  // Form state
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState<string>('Offering');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [donationDate, setDonationDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [memberId, setMemberId] = useState('');

  const recordDonation = useRecordManualDonation();
  const [memberSearch, setMemberSearch] = useState('');
  const { data: membersData } = useMembers(
    memberSearch.length >= 2 ? { search: memberSearch, limit: 10 } : undefined
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (purpose === 'Other' && !description.trim()) {
      toast.error('Description is required when purpose is "Other"');
      return;
    }

    try {
      await recordDonation.mutateAsync({
        memberId: isAnonymous ? null : (memberId || null),
        amount: parseFloat(amount),
        donationPurpose: purpose as any,
        paymentMethod: paymentMethod as any,
        donationDate,
        isAnonymous,
        description: description || undefined,
      });
      
      toast.success(`Donation of £${parseFloat(amount).toFixed(2)} recorded successfully!`);
      
      // Reset form
      setAmount('');
      setPurpose('Offering');
      setDescription('');
      setPaymentMethod('Cash');
      setDonationDate(new Date().toISOString().split('T')[0]);
      setIsAnonymous(false);
      setMemberId('');
      setMemberSearch('');
      
      // Redirect to donations page
      router.push('/donations');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to record donation. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Record Donation</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Record online or manual donations
          </p>
        </div>
        <Link href="/donations">
          <Button variant="outline" size="sm">← Back to Donations</Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'online'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('online')}
        >
          Online Payment
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'manual'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('manual')}
        >
          Manual Entry
        </button>
      </div>

      {/* Online Payment Tab */}
      {activeTab === 'online' && (
        <Card>
          <CardHeader>
            <CardTitle>Online Donation (Stripe)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Amount (£)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Purpose</label>
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-input/15 bg-background px-3 text-sm"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                >
                  {PURPOSES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {purpose === 'Other' && (
                <div>
                  <label className="text-sm font-medium">Description *</label>
                  <Input
                    type="text"
                    placeholder="Please specify..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}

              <div className="rounded-lg border border-dashed border-muted-foreground/25 p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Stripe payment integration will be added here
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Requires Stripe API keys configuration
                </p>
              </div>

              <Button className="w-full" disabled>
                Donate Online (Coming Soon)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Entry Tab */}
      {activeTab === 'manual' && (
        <Card>
          <CardHeader>
            <CardTitle>Manual Donation Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Amount (£) *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Purpose *</label>
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-input/15 bg-background px-3 text-sm"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  required
                >
                  {PURPOSES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {purpose === 'Other' && (
                <div>
                  <label className="text-sm font-medium">Description *</label>
                  <Input
                    type="text"
                    placeholder="Please specify..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Payment Method *</label>
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-input/15 bg-background px-3 text-sm"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  required
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Donation Date *</label>
                <Input
                  type="date"
                  value={donationDate}
                  onChange={(e) => setDonationDate(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="anonymous"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="anonymous" className="text-sm font-medium">
                  Anonymous Donation
                </label>
              </div>

              {!isAnonymous && (
                <div>
                  <label className="text-sm font-medium">Member (Optional)</label>
                  <Input
                    type="text"
                    placeholder="Search member by name..."
                    value={memberSearch}
                    onChange={(e) => {
                      setMemberSearch(e.target.value);
                      setMemberId('');
                    }}
                    className="mt-1"
                  />
                  {membersData?.data && membersData.data.length > 0 && memberSearch.length >= 2 && !memberId && (
                    <div className="mt-1 rounded-lg border border-input/15 bg-background shadow-sm max-h-40 overflow-y-auto">
                      {membersData.data.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                          onClick={() => {
                            setMemberId(m.id);
                            setMemberSearch(`${m.firstName} ${m.lastName}`);
                          }}
                        >
                          {m.firstName} {m.lastName}
                          <span className="ml-2 text-xs text-muted-foreground">{m.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {memberId && (
                    <p className="mt-1 text-xs text-emerald-600">✓ Member selected</p>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={recordDonation.isPending} className="flex-1">
                  {recordDonation.isPending ? 'Recording...' : 'Record Donation'}
                </Button>
                <Link href="/donations" className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

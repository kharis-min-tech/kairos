'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSoulsStore } from '@/stores/souls-store';
import { useApi } from '@/hooks/useApi';
import { Button, Input, Label, Textarea, Card, CardContent, CardHeader, CardTitle, Badge, CustomSelect } from '@kairos/ui';
import { DateSelect } from '@/components/date-select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Phone, Mail, MapPin, User, Calendar, AlertCircle } from 'lucide-react';

interface FollowUpRecord {
  id: string;
  contactMethod: string;
  contactStatus: string;
  urgencyLevel?: string;
  durationMinutes?: number;
  notes?: string;
  nextFollowUpDate?: string;
  followUpDate: string;
  memberName: string;
}

const STATUS_OPTIONS = [
  'New',
  'Following Up',
  'Interested',
  'Not Interested',
  'Converted',
  'Lost Contact',
];

const CONTACT_METHODS = [
  'Phone Call',
  'Text Message',
  'WhatsApp',
  'In Person',
  'Email',
  'Other',
];

const CONTACT_STATUSES = [
  'Successful',
  'No Answer',
  'Busy',
  'Wrong Number',
  'Declined',
];

const URGENCY_LEVELS = [
  { value: 'GREEN', label: 'GREEN - On Track', color: 'text-emerald-700' },
  { value: 'AMBER', label: 'AMBER - Monitor', color: 'text-amber-700' },
  { value: 'RED', label: 'RED - Critical', color: 'text-rose-700' },
];

export default function SoulDetailPage() {
  const params = useParams();
  const router = useRouter();
  const api = useApi();
  const { toast } = useToast();
  const { currentSoul, fetchSoul, updateSoulStatus } = useSoulsStore();

  const [followUpForm, setFollowUpForm] = useState({
    contactMethod: '',
    contactMethodOther: '',
    contactStatus: '',
    urgencyLevel: '',
    durationMinutes: '',
    notes: '',
    nextFollowUpDate: '',
    updateStatus: '',
  });

  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [followUps, setFollowUps] = useState<FollowUpRecord[]>([]);
  const [followUpsPagination, setFollowUpsPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    if (api && params.id) {
      fetchSoul(api, params.id as string);
      fetchFollowUps();
    }
  }, [api, params.id]);

  const fetchFollowUps = async () => {
    if (!api || !params.id) return;
    try {
      const response = await api.souls.getFollowUps(params.id as string, {
        page: followUpsPagination.page,
        limit: followUpsPagination.limit,
      });
      if (response.success) {
        setFollowUps(response.data?.data || []);
        if (response.data?.pagination) {
          setFollowUpsPagination(response.data.pagination);
        }
      }
    } catch (error) {
      console.error('Failed to fetch follow-ups:', error);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!api || !currentSoul) return;

    setLoading(true);
    try {
      await updateSoulStatus(api, currentSoul.id, newStatus);
      toast({
        title: 'Status updated',
        description: `Soul status changed to ${newStatus}`,
      });
      // Refresh soul data
      await fetchSoul(api, currentSoul.id);
    } catch (error: unknown) {
      toast({
        title: 'Failed to update status',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!api || !currentSoul) return;

    setLoading(true);
    try {
      const data = {
        contactMethod: followUpForm.contactMethod === 'Other' && followUpForm.contactMethodOther
          ? followUpForm.contactMethodOther
          : followUpForm.contactMethod,
        contactStatus: followUpForm.contactStatus,
        urgencyLevel: followUpForm.urgencyLevel || undefined,
        durationMinutes: followUpForm.durationMinutes ? parseInt(followUpForm.durationMinutes) : undefined,
        notes: followUpForm.notes || undefined,
        nextFollowUpDate: followUpForm.nextFollowUpDate || undefined,
        updateStatus: followUpForm.updateStatus || undefined,
      };

      await api.souls.logFollowUp(currentSoul.id, data);

      toast({
        title: 'Follow-up logged',
        description: 'Follow-up has been recorded successfully',
      });

      // Reset form
      setFollowUpForm({
        contactMethod: '',
        contactMethodOther: '',
        contactStatus: '',
        urgencyLevel: '',
        durationMinutes: '',
        notes: '',
        nextFollowUpDate: '',
        updateStatus: '',
      });
      setShowFollowUpForm(false);

      // Refresh soul data
      await fetchSoul(api, currentSoul.id);
      await fetchFollowUps();
    } catch (error: unknown) {
      toast({
        title: 'Failed to log follow-up',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async () => {
    if (!api || !currentSoul) return;

    if (!confirm('Are you sure you want to convert this soul to a member?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await api.souls.convert(currentSoul.id);

      toast({
        title: 'Soul converted successfully',
        description: `${currentSoul.firstName} ${currentSoul.lastName} is now a member`,
      });

      // Navigate to member profile if member data is available
      if (response.success && response.data?.member?.id) {
        router.push(`/members/${response.data.member.id}`);
      } else {
        // Otherwise just go back to souls list
        router.push('/souls');
      }
    } catch (error: unknown) {
      toast({
        title: 'Failed to convert soul',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!currentSoul) {
    return (
      <div className="container mx-auto py-6">
        <p className="text-center text-muted-foreground">Loading soul details...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">
            {currentSoul.firstName} {currentSoul.lastName}
          </h1>
          <p className="text-muted-foreground">Soul Details</p>
        </div>
        <Badge variant={currentSoul.status === 'Converted' ? 'default' : 'secondary'}>
          {currentSoul.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{currentSoul.phone}</span>
            </div>
            {currentSoul.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{currentSoul.email}</span>
              </div>
            )}
            {currentSoul.address && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>
                  {currentSoul.address}
                  {currentSoul.city && `, ${currentSoul.city}`}
                </span>
              </div>
            )}
            {currentSoul.gender && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{currentSoul.gender}</span>
                {currentSoul.ageRange && <span>({currentSoul.ageRange})</span>}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Captured: {new Date(currentSoul.createdAt).toLocaleDateString()}</span>
            </div>
            {currentSoul.lastFollowUpDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  Last Follow-up: {new Date(currentSoul.lastFollowUpDate).toLocaleDateString()}
                  {currentSoul.daysSinceLastFollowUp !== null && currentSoul.daysSinceLastFollowUp !== undefined && (
                    <span className={currentSoul.daysSinceLastFollowUp >= 2 ? 'text-destructive ml-1' : 'ml-1'}>
                      ({currentSoul.daysSinceLastFollowUp} day{currentSoul.daysSinceLastFollowUp !== 1 ? 's' : ''} ago)
                    </span>
                  )}
                </span>
              </div>
            )}
            {!currentSoul.lastFollowUpDate && currentSoul.status !== 'Converted' && (
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">No follow-up logged yet</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assignment & Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Assigned Worker</Label>
              <p className="text-sm mt-1">
                {currentSoul.assignedMemberName || 'Not assigned'}
              </p>
            </div>
            <div>
              <Label>Outreach Program</Label>
              <p className="text-sm mt-1">
                {currentSoul.outreachName || 'Ad-hoc Evangelism'}
              </p>
            </div>
            <div>
              <Label htmlFor="status">Update Status</Label>
              <CustomSelect
                id="status"
                value={currentSoul.status}
                onValueChange={handleStatusChange}
                disabled={loading}
                options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {currentSoul.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{currentSoul.notes}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Follow-up History</CardTitle>
            <Button
              size="sm"
              onClick={() => setShowFollowUpForm(!showFollowUpForm)}
              disabled={loading}
            >
              {showFollowUpForm ? 'Cancel' : 'Log Follow-up'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showFollowUpForm && (
            <form onSubmit={handleLogFollowUp} className="space-y-4 p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactMethod">Contact Method *</Label>
                  <CustomSelect
                    id="contactMethod"
                    value={followUpForm.contactMethod}
                    onValueChange={(v) => setFollowUpForm((prev) => ({ ...prev, contactMethod: v }))}
                    placeholder="Select method"
                    options={CONTACT_METHODS.map((m) => ({ value: m, label: m }))}
                  />
                  {followUpForm.contactMethod === 'Other' && (
                    <Input
                      id="contactMethodOther"
                      type="text"
                      value={followUpForm.contactMethodOther}
                      onChange={(e) =>
                        setFollowUpForm((prev) => ({ ...prev, contactMethodOther: e.target.value }))
                      }
                      placeholder="Specify contact method..."
                      required
                      className="mt-2"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactStatus">Contact Status *</Label>
                  <CustomSelect
                    id="contactStatus"
                    value={followUpForm.contactStatus}
                    onValueChange={(v) => setFollowUpForm((prev) => ({ ...prev, contactStatus: v }))}
                    placeholder="Select status"
                    options={CONTACT_STATUSES.map((s) => ({ value: s, label: s }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="urgencyLevel">Urgency Level (Post-Contact Assessment)</Label>
                  <CustomSelect
                    id="urgencyLevel"
                    value={followUpForm.urgencyLevel}
                    onValueChange={(v) => setFollowUpForm((prev) => ({ ...prev, urgencyLevel: v }))}
                    placeholder="Select urgency (optional)"
                    options={URGENCY_LEVELS.map((l) => ({ value: l.value, label: l.label }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use this to prioritize home visits or escalations (e.g., soul is responsive but situation requires follow-up)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="updateStatus">Update Soul Status (Optional)</Label>
                  <CustomSelect
                    id="updateStatus"
                    value={followUpForm.updateStatus}
                    onValueChange={(v) => setFollowUpForm((prev) => ({ ...prev, updateStatus: v }))}
                    placeholder={`Keep current status (${currentSoul.status})`}
                    options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optionally update the soul's status based on this follow-up interaction
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="durationMinutes">Duration (minutes)</Label>
                <Input
                  id="durationMinutes"
                  type="number"
                  min="1"
                  value={followUpForm.durationMinutes}
                  onChange={(e) =>
                    setFollowUpForm((prev) => ({ ...prev, durationMinutes: e.target.value }))
                  }
                  placeholder="15"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={followUpForm.notes}
                  onChange={(e) =>
                    setFollowUpForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="What was discussed..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nextFollowUpDate">Next Follow-up Date</Label>
                <DateSelect
                  id="nextFollowUpDate"
                  value={followUpForm.nextFollowUpDate}
                  onChange={(v) =>
                    setFollowUpForm((prev) => ({ ...prev, nextFollowUpDate: v }))
                  }
                />
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? 'Logging...' : 'Log Follow-up'}
              </Button>
            </form>
          )}

          <div className="space-y-3">
            {followUps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No follow-ups logged yet</p>
            ) : (
              followUps.map((followUp) => {
                // Manual urgency level takes priority over automatic RAG
                let ragStatus = { label: 'Monitor', bgColor: 'bg-amber-100', textColor: 'text-amber-700', borderColor: 'border-l-amber-500' };
                
                if (followUp.urgencyLevel) {
                  // Use manual urgency level set by worker
                  if (followUp.urgencyLevel === 'RED') {
                    ragStatus = { label: 'Critical (Manual)', bgColor: 'bg-rose-100', textColor: 'text-rose-700', borderColor: 'border-l-rose-500' };
                  } else if (followUp.urgencyLevel === 'AMBER') {
                    ragStatus = { label: 'Monitor (Manual)', bgColor: 'bg-amber-100', textColor: 'text-amber-700', borderColor: 'border-l-amber-500' };
                  } else if (followUp.urgencyLevel === 'GREEN') {
                    ragStatus = { label: 'On Track (Manual)', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700', borderColor: 'border-l-emerald-500' };
                  }
                } else {
                  // Fall back to automatic RAG based on contact status
                  const getFollowUpRAG = (contactStatus: string) => {
                    if (contactStatus === 'Successful') {
                      return { label: 'On Track', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700', borderColor: 'border-l-emerald-500' };
                    } else if (contactStatus === 'No Answer' || contactStatus === 'Busy') {
                      return { label: 'Monitor', bgColor: 'bg-amber-100', textColor: 'text-amber-700', borderColor: 'border-l-amber-500' };
                    } else if (contactStatus === 'Wrong Number' || contactStatus === 'Declined') {
                      return { label: 'Critical', bgColor: 'bg-rose-100', textColor: 'text-rose-700', borderColor: 'border-l-rose-500' };
                    }
                    return { label: 'Monitor', bgColor: 'bg-amber-100', textColor: 'text-amber-700', borderColor: 'border-l-amber-500' };
                  };
                  ragStatus = getFollowUpRAG(followUp.contactStatus);
                }

                return (
                  <div key={followUp.id} className={`bg-muted rounded-lg p-4 space-y-2 border-l-4 ${ragStatus.borderColor}`}>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">{followUp.contactMethod}</Badge>
                          <Badge className={`${ragStatus.bgColor} ${ragStatus.textColor} border-0`}>
                            {ragStatus.label}
                          </Badge>
                          <Badge variant={followUp.contactStatus === 'Successful' ? 'default' : 'secondary'}>
                            {followUp.contactStatus}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          By {followUp.memberName} on {new Date(followUp.followUpDate).toLocaleString()}
                        </p>
                      </div>
                      {followUp.durationMinutes && (
                        <span className="text-sm text-muted-foreground">
                          {followUp.durationMinutes} min
                        </span>
                      )}
                    </div>
                    {followUp.notes && (
                      <p className="text-sm whitespace-pre-wrap">{followUp.notes}</p>
                    )}
                    {followUp.nextFollowUpDate && (
                      <p className="text-xs text-muted-foreground">
                        Next follow-up: {new Date(followUp.nextFollowUpDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {currentSoul.status !== 'Converted' && (
        <div className="flex justify-end">
          <Button onClick={handleConvert} disabled={loading} variant="default">
            Convert to Member
          </Button>
        </div>
      )}
    </div>
  );
}

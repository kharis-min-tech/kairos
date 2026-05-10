'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSoulsStore } from '@/stores/souls-store';
import { useApi } from '@/hooks/useApi';
import { Button, Input, Label, Textarea, Card, CardContent, CardHeader, CardTitle, Badge } from '@kairos/ui';
import { DatePicker } from '@/components/date-picker';
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
  { value: 'GREEN', label: 'GREEN - All Good', color: 'text-emerald-700' },
  { value: 'AMBER', label: 'AMBER - Monitor', color: 'text-amber-700' },
  { value: 'RED', label: 'RED - Critical', color: 'text-rose-700' },
];

export default function SoulDetailPage() {
  const params = useParams();
  const router = useRouter();
  const api = useApi();
  const { toast } = useToast();
  const { currentSoul, fetchSoul, updateSoulStatus } = useSoulsStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    gender: '',
    ageRange: '',
    notes: '',
    sourceType: 'Ad Hoc' as 'Outreach' | 'Fellowship' | 'Department' | 'Ad Hoc',
    selectedOutreachId: '',
    selectedFellowshipId: '',
    departmentName: '',
  });

  const [outreachPrograms, setOutreachPrograms] = useState<any[]>([]);
  const [fellowships, setFellowships] = useState<any[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

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

  // Populate edit form when soul data loads
  useEffect(() => {
    if (currentSoul) {
      setEditForm({
        firstName: currentSoul.firstName || '',
        lastName: currentSoul.lastName || '',
        phone: currentSoul.phone || '',
        email: currentSoul.email || '',
        address: currentSoul.address || '',
        city: currentSoul.city || '',
        gender: currentSoul.gender || '',
        ageRange: currentSoul.ageRange || '',
        notes: currentSoul.notes || '',
        sourceType: (currentSoul as any).sourceType || 'Ad Hoc',
        selectedOutreachId: currentSoul.outreachId || '',
        selectedFellowshipId: (currentSoul as any).fellowshipId || '',
        departmentName: (currentSoul as any).departmentName || '',
      });
    }
  }, [currentSoul]);

  // Fetch outreach programs and fellowships for edit mode
  useEffect(() => {
    const fetchOptions = async () => {
      if (!api || !isEditing) return;
      
      try {
        setLoadingOptions(true);
        const user = (api as any).auth?.user;
        
        const [outreachRes, fellowshipRes] = await Promise.all([
          api.outreach.programs.list({ page: 1, limit: 100, isCompleted: false }),
          api.fellowships.list({ page: 1, limit: 100, memberId: user?.id }),
        ]);
        
        setOutreachPrograms(outreachRes.data?.data || []);
        setFellowships(fellowshipRes.data?.data || []);
      } catch (error) {
        console.error('Failed to load options:', error);
      } finally {
        setLoadingOptions(false);
      }
    };
    
    fetchOptions();
  }, [api, isEditing]);

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

  const handleSaveEdit = async () => {
    if (!api || !currentSoul) return;

    setLoading(true);
    try {
      const updateData: any = {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        phone: editForm.phone,
        email: editForm.email || null,
        address: editForm.address || null,
        city: editForm.city || null,
        gender: editForm.gender || null,
        ageRange: editForm.ageRange || null,
        notes: editForm.notes || null,
        sourceType: editForm.sourceType,
      };

      // Add source-specific IDs
      if (editForm.sourceType === 'Outreach') {
        updateData.outreachId = editForm.selectedOutreachId || null;
        updateData.fellowshipId = null;
        updateData.departmentName = null;
      } else if (editForm.sourceType === 'Fellowship') {
        updateData.fellowshipId = editForm.selectedFellowshipId || null;
        updateData.outreachId = null;
        updateData.departmentName = null;
      } else if (editForm.sourceType === 'Department') {
        updateData.departmentName = editForm.departmentName || null;
        updateData.outreachId = null;
        updateData.fellowshipId = null;
      } else {
        // Ad Hoc
        updateData.outreachId = null;
        updateData.fellowshipId = null;
        updateData.departmentName = null;
      }

      await api.souls.update(currentSoul.id, updateData);

      toast({
        title: 'Soul updated successfully',
        description: 'Changes have been saved',
      });

      setIsEditing(false);
      await fetchSoul(api, currentSoul.id);
    } catch (error: unknown) {
      toast({
        title: 'Failed to update soul',
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
        {!isEditing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            disabled={loading}
          >
            Edit
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={editForm.firstName}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, firstName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={editForm.lastName}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, lastName: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={editForm.address}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, address: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={editForm.city}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, city: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <select
                      id="gender"
                      value={editForm.gender}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, gender: e.target.value }))}
                      className="flex h-10 w-full rounded-lg border border-input/15 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20"
                    >
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ageRange">Age Range</Label>
                    <select
                      id="ageRange"
                      value={editForm.ageRange}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, ageRange: e.target.value }))}
                      className="flex h-10 w-full rounded-lg border border-input/15 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20"
                    >
                      <option value="">Select</option>
                      <option value="18-25">18-25</option>
                      <option value="26-35">26-35</option>
                      <option value="36-50">36-50</option>
                      <option value="51+">51+</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={editForm.notes}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleSaveEdit} disabled={loading} size="sm">
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
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
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assignment & Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="sourceType">Source Category *</Label>
                  <select
                    id="sourceType"
                    value={editForm.sourceType}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, sourceType: e.target.value as any }))}
                    disabled={loadingOptions}
                    className="flex h-10 w-full rounded-lg border border-input/15 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20"
                  >
                    <option value="Ad Hoc">Ad Hoc (Personal Evangelism)</option>
                    {outreachPrograms.length > 0 && <option value="Outreach">Outreach Program</option>}
                    {fellowships.length > 0 && <option value="Fellowship">Fellowship</option>}
                    <option value="Department">Department</option>
                  </select>
                </div>

                {editForm.sourceType === 'Outreach' && outreachPrograms.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="selectedOutreach">Select Outreach Program *</Label>
                    <select
                      id="selectedOutreach"
                      value={editForm.selectedOutreachId}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, selectedOutreachId: e.target.value }))}
                      className="flex h-10 w-full rounded-lg border border-input/15 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20"
                    >
                      <option value="">Select an outreach program</option>
                      {outreachPrograms.map((program: any) => (
                        <option key={program.id} value={program.id}>
                          {program.programName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {editForm.sourceType === 'Fellowship' && fellowships.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="selectedFellowship">Select Fellowship *</Label>
                    <select
                      id="selectedFellowship"
                      value={editForm.selectedFellowshipId}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, selectedFellowshipId: e.target.value }))}
                      className="flex h-10 w-full rounded-lg border border-input/15 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20"
                    >
                      <option value="">Select a fellowship</option>
                      {fellowships.map((fellowship: any) => (
                        <option key={fellowship.id} value={fellowship.id}>
                          {fellowship.fellowshipName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {editForm.sourceType === 'Department' && (
                  <div className="space-y-2">
                    <Label htmlFor="departmentName">Department Name *</Label>
                    <Input
                      id="departmentName"
                      value={editForm.departmentName}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, departmentName: e.target.value }))}
                      placeholder="e.g., Youth Ministry, Worship Team"
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <Label>Assigned Worker</Label>
                  <p className="text-sm mt-1">
                    {currentSoul.assignedMemberName || 'Not assigned'}
                  </p>
                </div>
                <div>
                  <Label>Source Category</Label>
                  <p className="text-sm mt-1">
                    {(currentSoul as any).sourceType || 'Ad Hoc'}
                  </p>
                </div>
                <div>
                  <Label>Outreach Program</Label>
                  <p className="text-sm mt-1">
                    {currentSoul.outreachName || 'N/A'}
                  </p>
                </div>
                <div>
                  <Label htmlFor="status">Update Status</Label>
                  <select
                    id="status"
                    value={currentSoul.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={loading}
                    className="flex h-10 w-full rounded-lg border border-input/15 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {currentSoul.notes && !isEditing && (
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
                  <select
                    id="contactMethod"
                    value={followUpForm.contactMethod}
                    onChange={(e) =>
                      setFollowUpForm((prev) => ({ ...prev, contactMethod: e.target.value }))
                    }
                    required
                    className="flex h-10 w-full rounded-lg border border-input/15 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select method</option>
                    {CONTACT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
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
                  <select
                    id="contactStatus"
                    value={followUpForm.contactStatus}
                    onChange={(e) =>
                      setFollowUpForm((prev) => ({ ...prev, contactStatus: e.target.value }))
                    }
                    required
                    className="flex h-10 w-full rounded-lg border border-input/15 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select status</option>
                    {CONTACT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="urgencyLevel">Urgency Level (Post-Contact Assessment)</Label>
                  <select
                    id="urgencyLevel"
                    value={followUpForm.urgencyLevel}
                    onChange={(e) =>
                      setFollowUpForm((prev) => ({ ...prev, urgencyLevel: e.target.value }))
                    }
                    className="flex h-10 w-full rounded-lg border border-input/15 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select urgency (optional)</option>
                    {URGENCY_LEVELS.map((level) => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Use this to prioritize home visits or escalations (e.g., soul is responsive but situation requires follow-up)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="updateStatus">Update Soul Status (Optional)</Label>
                  <select
                    id="updateStatus"
                    value={followUpForm.updateStatus}
                    onChange={(e) =>
                      setFollowUpForm((prev) => ({ ...prev, updateStatus: e.target.value }))
                    }
                    className="flex h-10 w-full rounded-lg border border-input/15 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Keep current status ({currentSoul.status})</option>
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
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
                <DatePicker
                  label="Next Follow-up Date"
                  value={followUpForm.nextFollowUpDate}
                  onChange={(date) =>
                    setFollowUpForm((prev) => ({ ...prev, nextFollowUpDate: date }))
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
                    ragStatus = { label: 'All Good (Manual)', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700', borderColor: 'border-l-emerald-500' };
                  }
                } else {
                  // Fall back to automatic RAG based on contact status
                  const getFollowUpRAG = (contactStatus: string) => {
                    if (contactStatus === 'Successful') {
                      return { label: 'All Good', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700', borderColor: 'border-l-emerald-500' };
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

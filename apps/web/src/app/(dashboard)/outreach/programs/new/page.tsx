'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOutreachStore } from '@/stores/outreach-store';
import { useApi } from '@/hooks/useApi';
import { Button, Input, Label, Textarea, CustomSelect } from '@kairos/ui';
import { DateSelect } from '@/components/date-select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';

function todayIso(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

export default function CreateProgramPage() {
  const router = useRouter();
  const api = useApi();
  const { toast } = useToast();
  const { createProgram } = useOutreachStore();
  const { activeRole, user } = useAuthStore();

  const isAdmin = activeRole === 'admin';
  const canCreate =
    activeRole === 'admin' || activeRole === 'pastor' || activeRole === 'leader';

  // Mirrors list-page persona gating: only admins, pastors, and leaders can create.
  useEffect(() => {
    if (user !== null && !canCreate) {
      router.replace('/outreach/programs');
    }
  }, [user, canCreate, router]);

  const [formData, setFormData] = useState({
    programName: '',
    programDate: '',
    location: '',
    address: '',
    city: '',
    description: '',
    coordinatorId: '',
    branchId: '',
    notes: '',
    isOpenToAllBranches: false,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [branches, setBranches] = useState<Array<{ id: string; branchName: string }>>([]);
  const [members, setMembers] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
  const [showBranchWarning, setShowBranchWarning] = useState(false);

  useEffect(() => {
    // Fetch branches and members for dropdowns
    if (api) {
      api.branches.list().then((response) => {
        if (response.success) {
          setBranches(response.data ?? []);
        }
      });

      api.members.list({ limit: 100 }).then((response) => {
        if (response.success) {
          setMembers(response.data?.data ?? []);
        }
      });
    }
  }, [api]);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.programName.trim()) {
      newErrors.programName = 'Program name is required';
    }
    if (!formData.programDate) {
      newErrors.programDate = 'Program date is required';
    } else if (formData.programDate < todayIso()) {
      newErrors.programDate = 'Program date cannot be in the past';
    }
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }
    if (isAdmin && !formData.branchId) {
      newErrors.branchId = 'Branch is required for admin';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate() || !api) return;

    // If admin selected a coordinator other than "KHARIS", show warning
    if (isAdmin && formData.coordinatorId && formData.coordinatorId !== 'KHARIS') {
      setShowBranchWarning(true);
      return;
    }

    await submitProgram();
  };

  const submitProgram = async () => {
    if (!api) return;

    setLoading(true);
    try {
      const data = {
        programName: formData.programName,
        programDate: formData.programDate,
        location: formData.location,
        address: formData.address || undefined,
        city: formData.city || undefined,
        description: formData.description || undefined,
        coordinatorId: formData.coordinatorId || undefined,
        branchId: formData.branchId || undefined,
        notes: formData.notes || undefined,
        isOpenToAllBranches: formData.isOpenToAllBranches,
      };

      const program = await createProgram(api, data);

      toast({
        title: 'Program created successfully',
        description: `${program.programName} has been created.`,
      });

      // Navigate to program detail
      router.push(`/outreach/programs/${program.id}`);
    } catch (error: unknown) {
      toast({
        title: 'Failed to create program',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setShowBranchWarning(false);
    }
  };

  const selectedCoordinator = members.find(m => m.id === formData.coordinatorId);

  if (user !== null && !canCreate) {
    return null;
  }

  return (
    <div className="container max-w-2xl mx-auto py-6 space-y-6">
      {/* Branch Warning Dialog */}
      {showBranchWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-ambient max-w-md w-full mx-4 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <span className="text-2xl font-bold text-amber-600">!</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">Branch-Specific Program</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You have selected <span className="font-semibold text-foreground">{selectedCoordinator?.firstName} {selectedCoordinator?.lastName}</span> as the coordinator.
                </p>
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 mb-4">
                  <p className="text-sm text-amber-900">
                    <strong>Important:</strong> This program will ONLY be visible to members of <span className="font-semibold">{selectedCoordinator?.firstName}'s branch</span>. Pastors and leaders from other branches will NOT be able to see or register for this program.
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  To make this program available to all branches, select <span className="font-semibold text-amber-600">Kharis</span> as the coordinator instead.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowBranchWarning(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={submitProgram}
                disabled={loading}
                className="bg-accent hover:bg-accent/80 text-accent-foreground"
              >
                {loading ? 'Creating...' : 'Continue Anyway'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create Outreach Program</h1>
          <p className="text-muted-foreground">Plan a new evangelism activity</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="programName">
            Program Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="programName"
            value={formData.programName}
            onChange={(e) => handleChange('programName', e.target.value)}
            placeholder="Easter Outreach 2025"
          />
          {errors.programName && (
            <p className="text-sm text-destructive">{errors.programName}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="programDate">
              Program Date <span className="text-destructive">*</span>
            </Label>
            <DateSelect
              id="programDate"
              value={formData.programDate}
              onChange={(v) => handleChange('programDate', v)}
              minDate={todayIso()}
            />
            {errors.programDate && (
              <p className="text-sm text-destructive">{errors.programDate}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="branchId">
              Branch {isAdmin && <span className="text-destructive">*</span>}
            </Label>
            <CustomSelect
              id="branchId"
              value={formData.branchId}
              onValueChange={(v) => handleChange('branchId', v)}
              placeholder={isAdmin ? 'Select a branch' : 'Auto-assigned for Pastor/Leader'}
              options={branches.map((branch) => ({ value: branch.id, label: branch.branchName }))}
            />
            {errors.branchId && (
              <p className="text-sm text-destructive">{errors.branchId}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">
            Location <span className="text-destructive">*</span>
          </Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => handleChange('location', e.target.value)}
            placeholder="Victoria Park"
          />
          {errors.location && (
            <p className="text-sm text-destructive">{errors.location}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address (Optional)</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="45 High Street"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">City (Optional)</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => handleChange('city', e.target.value)}
            placeholder="London"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="coordinatorId">Coordinator (Optional)</Label>
          <CustomSelect
            id="coordinatorId"
            value={formData.coordinatorId}
            onValueChange={(v) => handleChange('coordinatorId', v)}
            placeholder="Select coordinator"
            options={[
              ...(isAdmin ? [{ value: 'KHARIS', label: 'Kharis (Allows all pastors/leaders to register)' }] : []),
              ...members.map((member) => ({ value: member.id, label: `${member.firstName} ${member.lastName}` })),
            ]}
          />
          {isAdmin && (
            <p className="text-sm text-muted-foreground">
              Note: Select <span className="font-semibold text-amber-600">Kharis</span> as coordinator to allow pastors and leaders from all branches to register for this program
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Describe the program goals and approach..."
            rows={4}
          />
        </div>

        {isAdmin && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isOpenToAllBranches"
                checked={formData.isOpenToAllBranches}
                onChange={(e) => handleChange('isOpenToAllBranches', e.target.checked)}
                className="h-4 w-4 rounded border-input/15 text-primary focus:ring-accent"
              />
              <Label htmlFor="isOpenToAllBranches" className="cursor-pointer font-normal">
                Open to All Branches (Allow pastors and leaders from all branches to register)
              </Label>
            </div>
            <p className="text-sm text-muted-foreground ml-6">
              When enabled, this program will be visible to all branches and their members can register
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Any additional notes or reminders..."
            rows={3}
          />
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Creating...' : 'Create Program'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

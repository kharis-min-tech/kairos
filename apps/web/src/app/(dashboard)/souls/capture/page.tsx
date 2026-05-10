'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSoulsStore } from '@/stores/souls-store';
import { useApi } from '@/hooks/useApi';
import { Button, Input, Label, Textarea } from '@kairos/ui';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';

export default function CaptureSoulPage() {
  const router = useRouter();
  const api = useApi();
  const { toast } = useToast();
  const { captureSoul } = useSoulsStore();
  const user = useAuthStore((s) => s.user);

  const [outreachPrograms, setOutreachPrograms] = useState<any[]>([]);
  const [fellowships, setFellowships] = useState<any[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [userContext, setUserContext] = useState<{
    activeOutreach?: any;
    primaryFellowship?: any;
    department?: string;
  }>({});

  const [formData, setFormData] = useState({
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
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch user's context (active outreach, primary fellowship, department)
  useEffect(() => {
    const fetchUserContext = async () => {
      if (!api || !user) return;
      
      try {
        setLoadingOptions(true);
        
        // Fetch programs and fellowships where user is involved
        // Use memberId query parameter to filter by user's involvement
        const [outreachRes, fellowshipRes] = await Promise.all([
          api.outreach.programs.list({ page: 1, limit: 100, isCompleted: false }),
          api.fellowships.list({ page: 1, limit: 100, memberId: user.id }),
        ]);
        
        const userPrograms = outreachRes.data?.data || [];
        const userFellowships = fellowshipRes.data?.data || [];
        
        console.log('User outreach programs:', userPrograms);
        console.log('User fellowships:', userFellowships);
        
        // Find active outreach (first non-completed program user is registered for)
        const activeOutreach = userPrograms.find((program: any) => 
          !program.isCompleted && program.isRegistered
        ) || userPrograms[0]; // Fallback to first program
        
        // Find primary fellowship (first fellowship user is a member of)
        const primaryFellowship = userFellowships[0];
        
        // Get department from user profile if available
        const department = (user as any).department || (user as any).ministry;
        
        console.log('User context:', {
          activeOutreach,
          primaryFellowship,
          department,
        });
        
        setUserContext({
          activeOutreach,
          primaryFellowship,
          department,
        });
        
        setOutreachPrograms(userPrograms);
        setFellowships(userFellowships);
      } catch (error) {
        console.error('Failed to load user context:', error);
      } finally {
        setLoadingOptions(false);
      }
    };
    
    fetchUserContext();
  }, [api, user]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => {
      return { ...prev, [field]: value };
    });
    
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

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone format';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    // Validate source type selections
    if (formData.sourceType === 'Outreach' && !formData.selectedOutreachId) {
      newErrors.selectedOutreachId = 'Please select an outreach program';
    }
    if (formData.sourceType === 'Fellowship' && !formData.selectedFellowshipId) {
      newErrors.selectedFellowshipId = 'Please select a fellowship';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate() || !api) return;

    setLoading(true);
    try {
      // Automatically assign based on source type and selected IDs
      let outreachId: string | undefined;
      let fellowshipId: string | undefined;
      let departmentName: string | undefined;
      
      if (formData.sourceType === 'Outreach' && formData.selectedOutreachId) {
        outreachId = formData.selectedOutreachId;
      } else if (formData.sourceType === 'Fellowship' && formData.selectedFellowshipId) {
        fellowshipId = formData.selectedFellowshipId;
      } else if (formData.sourceType === 'Department' && userContext.department) {
        departmentName = userContext.department;
      }
      
      const data = {
        ...formData,
        sourceType: formData.sourceType,
        outreachId,
        fellowshipId,
        departmentName,
        email: formData.email || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        gender: formData.gender || undefined,
        ageRange: formData.ageRange || undefined,
        notes: formData.notes || undefined,
      };

      const soul = await captureSoul(api, data);

      toast({
        title: 'Soul captured successfully',
        description: `${soul.firstName} ${soul.lastName} has been added to your souls list.`,
      });

      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        gender: '',
        ageRange: '',
        notes: '',
        sourceType: 'Ad Hoc',
        selectedOutreachId: '',
        selectedFellowshipId: '',
      });

      // Optionally navigate to soul detail
      router.push(`/souls/${soul.id}`);
    } catch (error: unknown) {
      toast({
        title: 'Failed to capture soul',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Capture Soul</h1>
          <p className="text-muted-foreground">Record a new contact from evangelism</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Source Categorization */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
          <div className="space-y-2">
            <Label htmlFor="sourceType">
              Source Category <span className="text-destructive">*</span>
            </Label>
            <p className="text-xs text-muted-foreground">Where did you meet this person?</p>
            <select
              id="sourceType"
              value={formData.sourceType}
              onChange={(e) => handleChange('sourceType', e.target.value)}
              disabled={loadingOptions}
              className="flex h-10 w-full rounded-lg border border-input/15 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="Ad Hoc">Ad Hoc (Personal Evangelism)</option>
              {outreachPrograms.length > 0 && <option value="Outreach">Outreach Program</option>}
              {fellowships.length > 0 && <option value="Fellowship">Fellowship</option>}
              {userContext.department && <option value="Department">Department ({userContext.department})</option>}
            </select>
            {loadingOptions && <p className="text-xs text-muted-foreground">Loading your ministry context...</p>}
          </div>
          
          {/* Show outreach dropdown if Outreach is selected */}
          {formData.sourceType === 'Outreach' && outreachPrograms.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="selectedOutreach">
                Select Outreach Program <span className="text-destructive">*</span>
              </Label>
              <select
                id="selectedOutreach"
                value={formData.selectedOutreachId}
                onChange={(e) => handleChange('selectedOutreachId', e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input/15 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select an outreach program</option>
                {outreachPrograms.map((program: any) => (
                  <option key={program.id} value={program.id}>
                    {program.programName}
                  </option>
                ))}
              </select>
              {errors.selectedOutreachId && (
                <p className="text-sm text-destructive">{errors.selectedOutreachId}</p>
              )}
            </div>
          )}
          
          {/* Show fellowship dropdown if Fellowship is selected */}
          {formData.sourceType === 'Fellowship' && fellowships.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="selectedFellowship">
                Select Fellowship <span className="text-destructive">*</span>
              </Label>
              <select
                id="selectedFellowship"
                value={formData.selectedFellowshipId}
                onChange={(e) => handleChange('selectedFellowshipId', e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input/15 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select a fellowship</option>
                {fellowships.map((fellowship: any) => (
                  <option key={fellowship.id} value={fellowship.id}>
                    {fellowship.fellowshipName}
                  </option>
                ))}
              </select>
              {errors.selectedFellowshipId && (
                <p className="text-sm text-destructive">{errors.selectedFellowshipId}</p>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">
              First Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              placeholder="John"
            />
            {errors.firstName && (
              <p className="text-sm text-destructive">{errors.firstName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">
              Last Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              placeholder="Doe"
            />
            {errors.lastName && (
              <p className="text-sm text-destructive">{errors.lastName}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">
            Phone Number <span className="text-destructive">*</span>
          </Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="+234-800-1234-567"
          />
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email (Optional)</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="john.doe@example.com"
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address (Optional)</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="123 Main Street"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">City (Optional)</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => handleChange('city', e.target.value)}
            placeholder="Lagos"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="gender">Gender (Optional)</Label>
            <select
              id="gender"
              value={formData.gender}
              onChange={(e) => handleChange('gender', e.target.value)}
              className="flex h-10 w-full rounded-lg border border-input/15 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ageRange">Age Range (Optional)</Label>
            <select
              id="ageRange"
              value={formData.ageRange}
              onChange={(e) => handleChange('ageRange', e.target.value)}
              className="flex h-10 w-full rounded-lg border border-input/15 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select age range</option>
              <option value="18-25">18-25</option>
              <option value="26-35">26-35</option>
              <option value="36-50">36-50</option>
              <option value="51+">51+</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Any additional information or prayer requests..."
            rows={4}
          />
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Capturing...' : 'Capture Soul'}
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

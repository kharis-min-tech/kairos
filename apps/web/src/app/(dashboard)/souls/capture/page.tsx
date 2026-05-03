'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSoulsStore } from '@/stores/souls-store';
import { useApi } from '@/hooks/useApi';
import { Button, CustomSelect, Input, Label, Textarea } from '@kairos/ui';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

export default function CaptureSoulPage() {
  const router = useRouter();
  const api = useApi();
  const { toast } = useToast();
  const { captureSoul } = useSoulsStore();

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
    outreachId: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [programs, setPrograms] = useState<Array<{ id: string; programName: string }>>([]);

  useEffect(() => {
    if (!api) return;
    api.outreach.programs.list({ limit: 100, isCompleted: false }).then((res) => {
      if (res.success && res.data) {
        const list = (res.data as any).data ?? [];
        setPrograms(list.map((p: any) => ({ id: p.id, programName: p.programName })));
      }
    }).catch(() => {/* non-critical */});
  }, [api]);

  const handleChange = (field: string, value: string) => {
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate() || !api) return;

    setLoading(true);
    try {
      const data = {
        ...formData,
        outreachId: formData.outreachId || undefined,
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
        outreachId: '',
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">
              First Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              placeholder="James"
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
              placeholder="Smith"
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
            placeholder="07700 900123"
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
            placeholder="james.smith@example.co.uk"
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="gender">Gender (Optional)</Label>
            <CustomSelect
              id="gender"
              value={formData.gender}
              onValueChange={(v) => handleChange('gender', v)}
              placeholder="Select gender"
              options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }]}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ageRange">Age Range (Optional)</Label>
            <CustomSelect
              id="ageRange"
              value={formData.ageRange}
              onValueChange={(v) => handleChange('ageRange', v)}
              placeholder="Select age range"
              options={[{ value: '18-25', label: '18-25' }, { value: '26-35', label: '26-35' }, { value: '36-50', label: '36-50' }, { value: '51+', label: '51+' }]}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="outreachId">Outreach Program</Label>
          <CustomSelect
            id="outreachId"
            value={formData.outreachId}
            onValueChange={(v) => handleChange('outreachId', v)}
            placeholder="Ad-hoc / Solo Evangelism"
            options={programs.map((p) => ({ value: p.id, label: p.programName }))}
          />
          <p className="text-xs text-muted-foreground">Leave blank if this was a personal/solo encounter.</p>
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

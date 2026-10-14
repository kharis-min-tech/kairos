'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSoulsStore } from '@/stores/souls-store';
import { useApi } from '@/hooks/useApi';
import { Button, CustomSelect, Input, Label, Textarea } from '@kairos/ui';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { useFellowships } from '@/hooks/use-fellowships';
import { useMyDepartments } from '@/hooks/use-departments';
import { useAuthStore } from '@/lib/auth-store';
import { useTranslation } from 'react-i18next';

export default function CaptureSoulPage() {  const { t } = useTranslation(['souls', 'common']);

  const router = useRouter();
  const api = useApi();
  const { toast } = useToast();
  const { captureSoul } = useSoulsStore();

  const user = useAuthStore((s) => s.user);
  const { data: myFellowshipsResult } = useFellowships(
    user?.id ? { memberId: user.id, limit: 100 } : undefined,
  );
  const { data: myDepartmentsData } = useMyDepartments();
  const myFellowships = myFellowshipsResult?.data ?? [];
  const myDepartments = myDepartmentsData ?? [];

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
    fellowshipId: '',
    branchDepartmentId: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [programs, setPrograms] = useState<Array<{ id: string; programName: string }>>([]);

  useEffect(() => {
    if (!api) return;
    api.outreach.programs.list({ limit: 100, isCompleted: false }).then((res) => {
      if (res.success && res.data) {
        const list = (res.data as { data?: Array<{ id: string; programName: string }> }).data ?? [];
        setPrograms(list.map((p) => ({ id: p.id, programName: p.programName })));
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
        fellowshipId: formData.fellowshipId || null,
        branchDepartmentId: formData.branchDepartmentId || null,
      };

      const soul = await captureSoul(api, data);

      toast({
        title: t('souls:soulCapturedSuccessfully'),
        description: t('souls:v1V2BeenAddedSouls', { v1: soul.firstName, v2: soul.lastName }),
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
        fellowshipId: '',
        branchDepartmentId: '',
      });

      // Optionally navigate to soul detail
      router.push(`/souls/${soul.id}`);
    } catch (error: unknown) {
      toast({
        title: t('souls:failedToCaptureSoul'),
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
          <h1 className="text-3xl font-bold">{t('souls:captureSoul')}</h1>
          <p className="text-muted-foreground">{t('souls:recordANewContactFromEvangelism')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">{t('souls:firstName')}<span className="text-destructive">*</span>
            </Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              placeholder={t('souls:james')}
            />
            {errors.firstName && (
              <p className="text-sm text-destructive">{errors.firstName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">{t('souls:lastName')}<span className="text-destructive">*</span>
            </Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              placeholder={t('souls:smith')}
            />
            {errors.lastName && (
              <p className="text-sm text-destructive">{errors.lastName}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">{t('souls:phoneNumber')}<span className="text-destructive">*</span>
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
          <Label htmlFor="email">{t('souls:emailOptional')}</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder={t('souls:jamesSmithExampleCoUk')}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">{t('souls:addressOptional')}</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder={t('souls:highStreet')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">{t('souls:cityOptional')}</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => handleChange('city', e.target.value)}
            placeholder={t('souls:london')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="gender">{t('souls:genderOptional')}</Label>
            <CustomSelect
              id="gender"
              value={formData.gender}
              onValueChange={(v) => handleChange('gender', v)}
              placeholder={t('souls:selectGender')}
              options={[{ value: 'Male', label: t('souls:male') }, { value: 'Female', label: t('souls:female') }]}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ageRange">{t('souls:ageRangeOptional')}</Label>
            <CustomSelect
              id="ageRange"
              value={formData.ageRange}
              onValueChange={(v) => handleChange('ageRange', v)}
              placeholder={t('souls:selectAgeRange')}
              options={[{ value: '18-25', label: '18-25' }, { value: '26-35', label: '26-35' }, { value: '36-50', label: '36-50' }, { value: '51+', label: '51+' }]}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="outreachId">{t('souls:outreachProgram')}</Label>
          <CustomSelect
            id="outreachId"
            value={formData.outreachId}
            onValueChange={(v) => handleChange('outreachId', v)}
            placeholder={t('souls:adHocSoloEvangelism')}
            options={programs.map((p) => ({ value: p.id, label: p.programName }))}
          />
          <p className="text-xs text-muted-foreground">{t('souls:leaveBlankIfThisWasA')}</p>
        </div>

        {/* Optional attribution — captured on behalf of a fellowship or dept. */}
        {(myFellowships.length > 0 || myDepartments.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fellowshipId">{t('souls:onBehalfFellowshipOptional')}</Label>
              <CustomSelect
                id="fellowshipId"
                value={formData.fellowshipId}
                onValueChange={(v) => handleChange('fellowshipId', v)}
                placeholder={t('souls:none')}
                options={myFellowships.map((f) => ({ value: f.id, label: f.fellowshipName }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branchDepartmentId">{t('souls:onBehalfDepartmentOptional')}</Label>
              <CustomSelect
                id="branchDepartmentId"
                value={formData.branchDepartmentId}
                onValueChange={(v) => handleChange('branchDepartmentId', v)}
                placeholder={t('souls:none')}
                options={myDepartments.map((d) => ({ value: d.id, label: d.departmentName }))}
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="notes">{t('souls:notesOptional')}</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder={t('souls:anyAdditionalInformationOrPrayerRequests')}
            rows={4}
          />
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? t('souls:capturing') : t('souls:captureSoul')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >{t('souls:cancel')}</Button>
        </div>
      </form>
    </div>
  );
}

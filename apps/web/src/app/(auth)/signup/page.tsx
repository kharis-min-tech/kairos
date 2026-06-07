'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { DateSelect } from '@/components/date-select';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input, Label, Card, CardContent, CardHeader, CustomSelect } from '@kairos/ui';
import { useSignup } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import { PasswordStrength } from '@/components/password-strength';
import { KharisCardHeader } from '../kharis-logo';

const signupSchema = z.object({
  // Step 1
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  middleName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['Male', 'Female']).optional(),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().min(1, 'Phone number is required'),
  // Step 2
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  homeBranchId: z.string().min(1, 'Please select a branch'),
  secondaryBranchId: z.string().optional(),
  secondaryAddress: z.string().optional(),
  secondaryCity: z.string().optional(),
  secondaryPostalCode: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactRelationship: z.enum(['Spouse', 'Partner', 'Parent', 'Child', 'Sibling', 'Grandparent', 'Guardian', 'Friend', 'Other']).optional(),
  emergencyContactPhone: z.string().optional(),
  // Step 3
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type SignupFormData = z.infer<typeof signupSchema>;

const STEPS = ['Personal Info', 'Contact & Branch', 'Create Password'] as const;

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-between">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all duration-200 ${
                i < currentStep
                  ? 'bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] text-white shadow-md shadow-[#5d3fd3]/30'
                  : i === currentStep
                    ? 'bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] text-white ring-2 ring-[#5d3fd3] ring-offset-2 ring-offset-background shadow-lg shadow-[#5d3fd3]/40'
                    : 'border-2 border-muted bg-transparent text-muted-foreground'
              }`}
            >
              {i < currentStep ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span className={`hidden text-[10px] font-medium sm:block ${
              i === currentStep ? 'bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] bg-clip-text text-transparent font-semibold' : i < currentStep ? 'text-foreground' : 'text-muted-foreground'
            }`}>{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`mx-2 mb-4 h-0.5 w-8 rounded-full transition-colors sm:w-12 ${
                i < currentStep ? 'bg-gradient-to-r from-[#451ebb] to-[#5d3fd3]' : 'bg-muted'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const signupMutation = useSignup();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<{ id: string; branchName: string }[]>([]);

  useEffect(() => {
    api.branches.listPublic().then((res) => {
      if (res.data) setBranches(res.data);
    }).catch(() => {});
  }, []);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { homeBranchId: '' },
  });

  const password = watch('password', '');
  const secondaryBranchId = watch('secondaryBranchId', '');

  const stepFields: (keyof SignupFormData)[][] = [
    ['firstName', 'lastName', 'email'],
    ['homeBranchId'],
    ['password', 'confirmPassword'],
  ];

  async function nextStep() {
    const valid = await trigger(stepFields[step]);
    if (valid) setStep((s) => s + 1);
  }

  async function onSubmit(data: SignupFormData) {
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { confirmPassword: _, ...payload } = data;
      const result = await signupMutation.mutateAsync(payload);
      router.push(`/verify-email?memberId=${result.member.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    }
  }

  return (
    <>
      {/* Heading — outside card */}
      <KharisCardHeader heading="Create account" subtitle="Join your church community" />

      <Card className="border-0 shadow-[0_8px_40px_rgba(26,28,28,0.06)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
        <CardHeader className="pb-4 pt-6">
          <StepIndicator currentStep={step} />
        </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Step 1: Personal Info */}
          {step === 0 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input id="firstName" className="h-11" {...register('firstName')} />
                  {errors.firstName && (
                    <p className="text-xs text-destructive">{errors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input id="lastName" className="h-11" {...register('lastName')} />
                  {errors.lastName && (
                    <p className="text-xs text-destructive">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="middleName">Middle Name</Label>
                <Input id="middleName" className="h-11" {...register('middleName')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" className="h-11" placeholder="you@example.co.uk" {...register('email')} />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input id="phone" type="tel" className="h-11" {...register('phone')} />
                {errors.phone && <p className="text-xs text-rose-600">{errors.phone.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Controller
                  name="dateOfBirth"
                  control={control}
                  render={({ field }) => (
                    <DateSelect
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      maxYear={new Date().getFullYear()}
                    />
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Controller
                  name="gender"
                  control={control}
                  render={({ field }) => (
                    <CustomSelect
                      id="gender"
                      value={field.value ?? ''}
                      onValueChange={field.onChange}
                      placeholder="Select..."
                      options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }]}
                    />
                  )}
                />
              </div>
            </>
          )}

          {/* Step 2: Contact & Branch */}
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" className="h-11" {...register('address')} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" className="h-11" {...register('city')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input id="postalCode" className="h-11" {...register('postalCode')} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="homeBranchId">Home Branch *</Label>
                <Controller
                  name="homeBranchId"
                  control={control}
                  render={({ field }) => (
                    <CustomSelect
                      id="homeBranchId"
                      value={field.value ?? ''}
                      onValueChange={field.onChange}
                      placeholder="Select a branch..."
                      options={branches.map((b) => ({ value: b.id, label: b.branchName }))}
                    />
                  )}
                />
                {errors.homeBranchId && (
                  <p className="text-xs text-destructive">{errors.homeBranchId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondaryBranchId">Secondary Branch</Label>
                <p className="text-xs text-muted-foreground">Optional — e.g. if you also attend a branch near your university or workplace</p>
                <Controller
                  name="secondaryBranchId"
                  control={control}
                  render={({ field }) => (
                    <CustomSelect
                      id="secondaryBranchId"
                      value={field.value ?? ''}
                      onValueChange={field.onChange}
                      placeholder="None"
                      options={branches.map((b) => ({ value: b.id, label: b.branchName }))}
                    />
                  )}
                />
              </div>

              {secondaryBranchId && (
                <div className="space-y-3 rounded-lg bg-muted/40 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Secondary Branch Address <span className="font-normal">(optional)</span></p>
                  <div className="space-y-2">
                    <Label htmlFor="secondaryAddress">Street Address</Label>
                    <Input id="secondaryAddress" className="h-11" {...register('secondaryAddress')} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="secondaryCity">City</Label>
                      <Input id="secondaryCity" className="h-11" {...register('secondaryCity')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secondaryPostalCode">Postal Code</Label>
                      <Input id="secondaryPostalCode" className="h-11" {...register('secondaryPostalCode')} />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
                <Input id="emergencyContactName" className="h-11" {...register('emergencyContactName')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyContactRelationship">Relationship to Member</Label>
                <Controller
                  name="emergencyContactRelationship"
                  control={control}
                  render={({ field }) => (
                    <CustomSelect
                      id="emergencyContactRelationship"
                      value={field.value ?? ''}
                      onValueChange={field.onChange}
                      placeholder="Select relationship..."
                      options={['Spouse', 'Partner', 'Parent', 'Child', 'Sibling', 'Grandparent', 'Guardian', 'Friend', 'Other'].map((r) => ({ value: r, label: r }))}
                    />
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
                <Input id="emergencyContactPhone" type="tel" className="h-11" {...register('emergencyContactPhone')} />
              </div>
            </>
          )}

          {/* Step 3: Password */}
          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input id="password" type="password" className="h-11" {...register('password')} />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
                <PasswordStrength password={password} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input id="confirmPassword" type="password" className="h-11" {...register('confirmPassword')} />
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>
            </>
          )}

          {/* Navigation */}
          <div className="flex gap-3 pt-2">
            {step > 0 && (
              <Button type="button" variant="outline" className="h-11 flex-1 rounded-lg" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            )}
            {step < 2 ? (
              <button type="button" className="flex h-11 flex-1 items-center justify-center rounded-lg bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] text-sm font-semibold text-white shadow-md shadow-[#5d3fd3]/20 transition-opacity hover:opacity-90" onClick={nextStep}>
                Continue
              </button>
            ) : (
              <button type="submit" className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-[#451ebb] to-[#5d3fd3] text-sm font-semibold text-white shadow-md shadow-[#5d3fd3]/20 transition-opacity hover:opacity-90 disabled:opacity-50" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            )}
          </div>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-muted-foreground/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-[#5D3FD3] hover:opacity-80">
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
      </Card>
    </>
  );
}

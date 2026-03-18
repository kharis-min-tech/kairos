'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kairos/ui';
import { useSignup } from '@/hooks/use-auth';

const signupSchema = z.object({
  // Step 1
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  middleName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['Male', 'Female']).optional(),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().optional(),
  // Step 2
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  homeBranchId: z.string().min(1, 'Please select a branch'),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  // Step 3
  password: z.string().min(8, 'Password must be at least 8 characters'),
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
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
              i <= currentStep
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {i + 1}
          </div>
          <span className="ml-2 hidden text-xs sm:inline">{label}</span>
          {i < STEPS.length - 1 && (
            <div
              className={`mx-2 h-0.5 w-8 sm:w-12 ${
                i < currentStep ? 'bg-primary' : 'bg-muted'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters', met: password.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Number', met: /\d/.test(password) },
  ];
  const strength = checks.filter((c) => c.met).length;

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-1.5 flex-1 rounded-full ${
              level <= strength
                ? strength <= 1 ? 'bg-destructive'
                : strength <= 2 ? 'bg-amber-500'
                : strength <= 3 ? 'bg-yellow-500'
                : 'bg-emerald-500'
                : 'bg-muted'
            }`}
          />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-1">
        {checks.map((check) => (
          <li
            key={check.label}
            className={`text-xs ${check.met ? 'text-emerald-600' : 'text-muted-foreground'}`}
          >
            {check.met ? '✓' : '○'} {check.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const signupMutation = useSignup();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { homeBranchId: '' },
  });

  const password = watch('password', '');

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
      router.push(`/verify-email?memberId=${result.memberId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Join your church community</CardDescription>
        <div className="pt-2">
          <StepIndicator currentStep={step} />
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Step 1: Personal Info */}
          {step === 0 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input id="firstName" {...register('firstName')} />
                  {errors.firstName && (
                    <p className="text-xs text-destructive">{errors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input id="lastName" {...register('lastName')} />
                  {errors.lastName && (
                    <p className="text-xs text-destructive">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="middleName">Middle Name</Label>
                <Input id="middleName" {...register('middleName')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" placeholder="you@example.com" {...register('email')} />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" {...register('phone')} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input id="dateOfBirth" type="date" {...register('dateOfBirth')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <select
                    id="gender"
                    {...register('gender')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Step 2: Contact & Branch */}
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" {...register('address')} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" {...register('city')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input id="postalCode" {...register('postalCode')} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="homeBranchId">Home Branch *</Label>
                <Input
                  id="homeBranchId"
                  placeholder="Branch ID (dropdown in production)"
                  {...register('homeBranchId')}
                />
                {errors.homeBranchId && (
                  <p className="text-xs text-destructive">{errors.homeBranchId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
                <Input id="emergencyContactName" {...register('emergencyContactName')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
                <Input id="emergencyContactPhone" type="tel" {...register('emergencyContactPhone')} />
              </div>
            </>
          )}

          {/* Step 3: Password */}
          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input id="password" type="password" {...register('password')} />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
                <PasswordStrength password={password} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input id="confirmPassword" type="password" {...register('confirmPassword')} />
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>
            </>
          )}

          {/* Navigation */}
          <div className="flex gap-3">
            {step > 0 && (
              <Button type="button" variant="outline" className="flex-1" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            )}
            {step < 2 ? (
              <Button type="button" className="flex-1" onClick={nextStep}>
                Continue
              </Button>
            ) : (
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? 'Creating account...' : 'Create Account'}
              </Button>
            )}
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

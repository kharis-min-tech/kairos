'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  User, Mail, Phone, Calendar, MapPin, ChevronRight, ChevronLeft,
  Lock, Eye, EyeOff, Check, Building2,
} from 'lucide-react';
import { auth } from '@kairos/api-client';
import { ApiError } from '@kairos/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBranches } from '@/hooks/use-branches';
import { cn } from '@/lib/utils';

// Step 1: Personal info
const personalSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().regex(/^\+?[\d\s\-()]{7,20}$/, 'Please enter a valid phone number'),
  dateOfBirth: z.string().min(1, 'Date of birth is required').refine(
    (val) => new Date(val) < new Date(),
    'Date of birth must be in the past',
  ),
  gender: z.enum(['Male', 'Female'], { required_error: 'Please select a gender' }),
});

// Step 2: Branch & address
const branchSchema = z.object({
  address: z.string().min(1, 'Address is required').max(200),
  homeBranchId: z.string().min(1, 'Please select a branch'),
});

// Step 3: Password
const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8, label: 'At least 8 characters' },
  { test: (p: string) => /[A-Z]/.test(p), label: 'One uppercase letter' },
  { test: (p: string) => /[a-z]/.test(p), label: 'One lowercase letter' },
  { test: (p: string) => /\d/.test(p), label: 'One number' },
];

const passwordSchema = z.object({
  password: z.string().min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/\d/, 'Must contain a number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type PersonalValues = z.infer<typeof personalSchema>;
type BranchValues = z.infer<typeof branchSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

const STEPS = ['Personal Info', 'Branch', 'Security'] as const;

export default function RegisterPage() {
  const [step, setStep] = useState(0);
  const [personalData, setPersonalData] = useState<PersonalValues | null>(null);
  const [branchData, setBranchData] = useState<BranchValues | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const progress = ((step + 1) / STEPS.length) * 100;

  async function handleFinalSubmit(passwordVals: PasswordValues) {
    if (!personalData || !branchData) return;
    setSubmitError('');
    setSubmitting(true);
    try {
      await auth.register({
        firstName: personalData.firstName.trim(),
        lastName: personalData.lastName.trim(),
        email: personalData.email.trim(),
        phone: personalData.phone.trim(),
        dateOfBirth: new Date(personalData.dateOfBirth),
        gender: personalData.gender as 'Male' | 'Female',
        address: branchData.address.trim(),
        homeBranchId: Number(branchData.homeBranchId),
        password: passwordVals.password,
      });
      setSubmitted(true);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setSubmitError(err.message || 'Registration failed. Please try again.');
      } else {
        setSubmitError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <Check size={32} className="text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Registration Submitted</h1>
        <p className="text-sm text-muted-foreground">
          Your registration is pending approval. A branch administrator will review your application.
          You will be notified once your account is approved.
        </p>
        <Link href="/login">
          <Button variant="outline" className="min-h-[44px]">Back to Sign In</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>
      </div>

      <Progress value={progress} className="h-2" />

      {submitError && (
        <div role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {submitError}
        </div>
      )}

      {step === 0 && (
        <PersonalStep
          defaults={personalData}
          onNext={(data) => { setPersonalData(data); setStep(1); }}
        />
      )}
      {step === 1 && (
        <BranchStep
          defaults={branchData}
          onNext={(data) => { setBranchData(data); setStep(2); }}
          onBack={() => setStep(0)}
        />
      )}
      {step === 2 && (
        <PasswordStep
          submitting={submitting}
          onSubmit={handleFinalSubmit}
          onBack={() => setStep(1)}
        />
      )}

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">Sign In</Link>
      </p>
    </div>
  );
}

/* ── Step 1: Personal Info ─────────────────────── */

function PersonalStep({
  defaults,
  onNext,
}: {
  defaults: PersonalValues | null;
  onNext: (data: PersonalValues) => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PersonalValues>({
    resolver: zodResolver(personalSchema as never),
    defaultValues: defaults ?? {
      firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', gender: undefined as unknown as 'Male',
    },
  });

  const selectedGender = watch('gender');

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4" aria-label="Personal information">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="firstName">First name</Label>
          <div className="relative">
            <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input id="firstName" placeholder="John" className={cn('pl-10 min-h-[44px]', errors.firstName && 'border-destructive')} autoComplete="given-name" {...register('firstName')} />
          </div>
          {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last name</Label>
          <div className="relative">
            <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input id="lastName" placeholder="Doe" className={cn('pl-10 min-h-[44px]', errors.lastName && 'border-destructive')} autoComplete="family-name" {...register('lastName')} />
          </div>
          {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input id="email" type="email" placeholder="you@example.com" className={cn('pl-10 min-h-[44px]', errors.email && 'border-destructive')} autoComplete="email" {...register('email')} />
        </div>
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <div className="relative">
          <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input id="phone" type="tel" placeholder="+44 7700 900000" className={cn('pl-10 min-h-[44px]', errors.phone && 'border-destructive')} autoComplete="tel" {...register('phone')} />
        </div>
        {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Date of birth</Label>
          <div className="relative">
            <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="dateOfBirth"
              type="date"
              max={new Date().toISOString().split('T')[0]}
              className={cn('pl-10 min-h-[44px]', errors.dateOfBirth && 'border-destructive')}
              {...register('dateOfBirth')}
            />
          </div>
          {errors.dateOfBirth && <p className="text-xs text-destructive">{errors.dateOfBirth.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Gender</Label>
          <div className="grid grid-cols-2 gap-2">
            {(['Male', 'Female'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setValue('gender', g, { shouldValidate: true })}
                className={cn(
                  'rounded-lg border px-3 py-2 text-sm font-medium transition-colors min-h-[44px]',
                  selectedGender === g
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/30',
                )}
              >
                {g}
              </button>
            ))}
          </div>
          {errors.gender && <p className="text-xs text-destructive">{errors.gender.message}</p>}
        </div>
      </div>

      <Button type="submit" className="w-full min-h-[44px]">
        Next <ChevronRight size={18} className="ml-1" />
      </Button>
    </form>
  );
}

/* ── Step 2: Branch & Address ──────────────────── */

function BranchStep({
  defaults,
  onNext,
  onBack,
}: {
  defaults: BranchValues | null;
  onNext: (data: BranchValues) => void;
  onBack: () => void;
}) {
  const { data: branchesData, isLoading: loadingBranches } = useBranches({ limit: 100 });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BranchValues>({
    resolver: zodResolver(branchSchema as never),
    defaultValues: defaults ?? { address: '', homeBranchId: '' },
  });

  const selectedBranch = watch('homeBranchId');

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4" aria-label="Branch selection">
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <div className="relative">
          <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="address"
            placeholder="123 Church Street"
            className={cn('pl-10 min-h-[44px]', errors.address && 'border-destructive')}
            autoComplete="street-address"
            {...register('address')}
          />
        </div>
        {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Home Branch</Label>
        <Select
          value={selectedBranch}
          onValueChange={(val) => setValue('homeBranchId', val, { shouldValidate: true })}
          disabled={loadingBranches}
        >
          <SelectTrigger className={cn('min-h-[44px]', errors.homeBranchId && 'border-destructive')}>
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-muted-foreground" />
              <SelectValue placeholder={loadingBranches ? 'Loading branches...' : 'Select a branch'} />
            </div>
          </SelectTrigger>
          <SelectContent>
            {branchesData?.data?.map((branch) => (
              <SelectItem key={branch.branchId} value={String(branch.branchId)}>
                {branch.branchName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.homeBranchId && <p className="text-xs text-destructive">{errors.homeBranchId.message}</p>}
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} className="min-h-[44px]">
          <ChevronLeft size={18} className="mr-1" /> Back
        </Button>
        <Button type="submit" className="flex-1 min-h-[44px]">
          Next <ChevronRight size={18} className="ml-1" />
        </Button>
      </div>
    </form>
  );
}

/* ── Step 3: Password ──────────────────────────── */

function PasswordStep({
  submitting,
  onSubmit,
  onBack,
}: {
  submitting: boolean;
  onSubmit: (data: PasswordValues) => void;
  onBack: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema as never),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const password = watch('password');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" aria-label="Set password">
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Create a strong password"
            className={cn('pl-10 pr-10 min-h-[44px]', errors.password && 'border-destructive')}
            autoComplete="new-password"
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}

        {/* Password strength indicators */}
        <ul className="space-y-1 text-xs" aria-label="Password requirements">
          {PASSWORD_RULES.map((rule) => {
            const met = rule.test(password);
            return (
              <li key={rule.label} className={met ? 'text-green-600' : 'text-muted-foreground'}>
                {met ? <Check size={12} className="inline mr-1" /> : <span className="inline-block w-3 mr-1 text-center">○</span>}
                {rule.label}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <div className="relative">
          <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="confirmPassword"
            type={showConfirm ? 'text' : 'password'}
            placeholder="Confirm your password"
            className={cn('pl-10 pr-10 min-h-[44px]', errors.confirmPassword && 'border-destructive')}
            autoComplete="new-password"
            {...register('confirmPassword')}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showConfirm ? 'Hide password' : 'Show password'}
          >
            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} className="min-h-[44px]">
          <ChevronLeft size={18} className="mr-1" /> Back
        </Button>
        <Button type="submit" disabled={submitting} className="flex-1 min-h-[44px]">
          {submitting ? 'Registering...' : 'Create Account'}
        </Button>
      </div>
    </form>
  );
}

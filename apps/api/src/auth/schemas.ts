import { z } from 'zod';

export const signupSchema = z.object({
  // Step 1: Personal info
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  middleName: z.string().max(100).optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['Male', 'Female']).optional(),
  email: z.string().email('Invalid email address'),
  phone: z.string().max(20).optional(),
  // Step 2: Emergency / Ministry
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  homeBranchId: z.string().uuid('Invalid branch ID'),
  emergencyContactName: z.string().max(150).optional(),
  emergencyContactPhone: z.string().max(20).optional(),
  emergencyContactRelationship: z.enum(['Spouse', 'Partner', 'Parent', 'Child', 'Sibling', 'Grandparent', 'Guardian', 'Friend', 'Other']).optional(),
  // Step 3: Password
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export const resendCodeSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

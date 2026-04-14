import { describe, it, expect } from 'vitest';
import {
  memberCreateSchema,
  memberUpdateSchema,
  branchCreateSchema,
  departmentCreateSchema,
  branchDepartmentCreateSchema,
  donationCreateSchema,
  formCreateSchema,
  notificationCreateSchema,
  soulCaptureSchema,
} from './schemas';

describe('memberCreateSchema', () => {
  const validMember = {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    phone: '+447700900000',
    home_branch_id: '10000000-0000-4000-8000-000000000001',
  };

  it('should accept valid member data', () => {
    expect(memberCreateSchema.safeParse(validMember).success).toBe(true);
  });

  it('should require first_name', () => {
    const { first_name: _, ...noFirstName } = validMember;
    expect(memberCreateSchema.safeParse(noFirstName).success).toBe(false);
  });

  it('should require last_name', () => {
    const { last_name: _, ...noLastName } = validMember;
    expect(memberCreateSchema.safeParse(noLastName).success).toBe(false);
  });

  it('should require home_branch_id', () => {
    const { home_branch_id: _, ...noBranch } = validMember;
    expect(memberCreateSchema.safeParse(noBranch).success).toBe(false);
  });

  it('should reject invalid email format', () => {
    const result = memberCreateSchema.safeParse({
      ...validMember,
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('should reject future date of birth', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const result = memberCreateSchema.safeParse({
      ...validMember,
      date_of_birth: futureDate,
    });
    expect(result.success).toBe(false);
  });

  it('should accept valid gender values', () => {
    expect(
      memberCreateSchema.safeParse({ ...validMember, gender: 'Male' }).success
    ).toBe(true);
    expect(
      memberCreateSchema.safeParse({ ...validMember, gender: 'Female' }).success
    ).toBe(true);
  });

  it('should reject invalid gender values', () => {
    expect(
      memberCreateSchema.safeParse({ ...validMember, gender: 'Other' }).success
    ).toBe(false);
  });
});

describe('memberUpdateSchema', () => {
  it('should accept partial updates', () => {
    expect(
      memberUpdateSchema.safeParse({ first_name: 'Jane' }).success
    ).toBe(true);
  });

  it('should accept empty object (no updates)', () => {
    expect(memberUpdateSchema.safeParse({}).success).toBe(true);
  });
});

describe('branchCreateSchema', () => {
  const validBranch = {
    branch_name: 'London Main',
    region_id: '20000000-0000-4000-8000-000000000001',
    branch_type: 'Main' as const,
  };

  it('should accept valid branch data', () => {
    expect(branchCreateSchema.safeParse(validBranch).success).toBe(true);
  });

  it('should accept all valid branch types', () => {
    const types = ['Main', 'Satellite', 'Cell', 'Campus', 'Online'] as const;
    for (const branch_type of types) {
      expect(
        branchCreateSchema.safeParse({ ...validBranch, branch_type }).success
      ).toBe(true);
    }
  });

  it('should reject invalid branch type', () => {
    expect(
      branchCreateSchema.safeParse({ ...validBranch, branch_type: 'Invalid' })
        .success
    ).toBe(false);
  });
});

describe('departmentCreateSchema', () => {
  it('should accept valid department data', () => {
    expect(
      departmentCreateSchema.safeParse({ department_name: 'Choir' }).success
    ).toBe(true);
  });

  it('should reject empty department name', () => {
    expect(
      departmentCreateSchema.safeParse({ department_name: '' }).success
    ).toBe(false);
  });
});

describe('branchDepartmentCreateSchema', () => {
  it('should accept valid branch department data', () => {
    const result = branchDepartmentCreateSchema.safeParse({
      branch_id: '10000000-0000-4000-8000-000000000001',
      department_id: '40000000-0000-4000-8000-000000000001',
      lead_member_id: '30000000-0000-4000-8000-000000000001',
      deputy_member_id: '30000000-0000-4000-8000-000000000002',
    });
    expect(result.success).toBe(true);
  });

  it('should reject same lead and deputy', () => {
    const result = branchDepartmentCreateSchema.safeParse({
      branch_id: '10000000-0000-4000-8000-000000000001',
      department_id: '40000000-0000-4000-8000-000000000001',
      lead_member_id: '30000000-0000-4000-8000-000000000001',
      deputy_member_id: '30000000-0000-4000-8000-000000000001',
    });
    expect(result.success).toBe(false);
  });

  it('should allow no deputy', () => {
    const result = branchDepartmentCreateSchema.safeParse({
      branch_id: '10000000-0000-4000-8000-000000000001',
      department_id: '40000000-0000-4000-8000-000000000001',
      lead_member_id: '30000000-0000-4000-8000-000000000001',
    });
    expect(result.success).toBe(true);
  });
});

describe('donationCreateSchema', () => {
  const validDonation = {
    branch_id: '10000000-0000-4000-8000-000000000001',
    amount: 50.0,
    donation_date: new Date(),
    donation_purpose: 'Tithe' as const,
    payment_method: 'Card' as const,
  };

  it('should accept valid donation data', () => {
    expect(donationCreateSchema.safeParse(validDonation).success).toBe(true);
  });

  it('should reject amount <= 0', () => {
    expect(
      donationCreateSchema.safeParse({ ...validDonation, amount: 0 }).success
    ).toBe(false);
    expect(
      donationCreateSchema.safeParse({ ...validDonation, amount: -10 }).success
    ).toBe(false);
  });

  it('should require description when purpose is Other', () => {
    const result = donationCreateSchema.safeParse({
      ...validDonation,
      donation_purpose: 'Other',
    });
    expect(result.success).toBe(false);
  });

  it('should accept Other purpose with description', () => {
    const result = donationCreateSchema.safeParse({
      ...validDonation,
      donation_purpose: 'Other',
      description: 'Special offering for missions',
    });
    expect(result.success).toBe(true);
  });
});

describe('formCreateSchema', () => {
  const validForm = {
    form_name: 'Visitor Form',
    form_definition: { fields: [] },
    scope: 'Church-wide' as const,
  };

  it('should accept valid church-wide form', () => {
    expect(formCreateSchema.safeParse(validForm).success).toBe(true);
  });

  it('should require target_branch_id for branch-specific forms', () => {
    const result = formCreateSchema.safeParse({
      ...validForm,
      scope: 'Branch-specific',
    });
    expect(result.success).toBe(false);
  });

  it('should accept branch-specific form with target_branch_id', () => {
    const result = formCreateSchema.safeParse({
      ...validForm,
      scope: 'Branch-specific',
      target_branch_id: '10000000-0000-4000-8000-000000000001',
    });
    expect(result.success).toBe(true);
  });
});

describe('notificationCreateSchema', () => {
  const validNotification = {
    title: 'Sunday Service',
    message: 'Reminder: Sunday service at 10am',
    notification_type: 'Reminder' as const,
    target_scope: 'All' as const,
  };

  it('should accept valid notification', () => {
    expect(
      notificationCreateSchema.safeParse(validNotification).success
    ).toBe(true);
  });

  it('should require target_branch_id when scope is Branch', () => {
    const result = notificationCreateSchema.safeParse({
      ...validNotification,
      target_scope: 'Branch',
    });
    expect(result.success).toBe(false);
  });

  it('should accept Branch scope with target_branch_id', () => {
    const result = notificationCreateSchema.safeParse({
      ...validNotification,
      target_scope: 'Branch',
      target_branch_id: '10000000-0000-4000-8000-000000000001',
    });
    expect(result.success).toBe(true);
  });

  it('should require target_department_id when scope is Department', () => {
    const result = notificationCreateSchema.safeParse({
      ...validNotification,
      target_scope: 'Department',
    });
    expect(result.success).toBe(false);
  });
});

describe('soulCaptureSchema', () => {
  const validSoul = {
    first_name: 'Jane',
    last_name: 'Smith',
    phone: '+447700900000',
    capture_date: new Date(),
  };

  it('should accept valid soul capture data', () => {
    expect(soulCaptureSchema.safeParse(validSoul).success).toBe(true);
  });

  it('should require first_name', () => {
    const { first_name: _, ...noFirstName } = validSoul;
    expect(soulCaptureSchema.safeParse(noFirstName).success).toBe(false);
  });

  it('should require phone', () => {
    const { phone: _, ...noPhone } = validSoul;
    expect(soulCaptureSchema.safeParse(noPhone).success).toBe(false);
  });

  it('should allow optional outreach_id', () => {
    expect(
      soulCaptureSchema.safeParse({ ...validSoul, outreach_id: '50000000-0000-4000-8000-000000000001' }).success
    ).toBe(true);
  });
});

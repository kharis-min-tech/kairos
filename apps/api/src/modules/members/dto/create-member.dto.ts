export class CreateMemberDto {
  branchId!: string;
  firstName!: string;
  lastName!: string;
  middleName?: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  maritalStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  membershipDate?: string;
  baptismDate?: string;
  soulStatus!: 'SAVED' | 'UNSAVED' | 'BACKSLIDDEN';
}

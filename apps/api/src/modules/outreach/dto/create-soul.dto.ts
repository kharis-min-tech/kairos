export class CreateSoulDto {
  firstName!: string;
  lastName!: string;
  phone?: string;
  email?: string;
  address?: string;
  soulStatus!: string;
  programId?: string;
  assignedTo?: string;
  notes?: string;
}

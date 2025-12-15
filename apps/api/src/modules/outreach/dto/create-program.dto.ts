export class CreateProgramDto {
  name!: string;
  description?: string;
  startDate!: Date;
  endDate?: Date;
  location?: string;
  branchId!: string;
  coordinatorId?: string;
}

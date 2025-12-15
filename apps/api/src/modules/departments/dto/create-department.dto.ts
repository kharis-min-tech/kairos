export class CreateDepartmentDto {
  name!: string;
  description?: string;
  leaderId?: string;
  branchId!: string;
}

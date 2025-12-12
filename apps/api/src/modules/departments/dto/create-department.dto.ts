export class CreateDepartmentDto {
  readonly name: string;
  readonly description?: string;
  readonly leaderId?: string;
  readonly branchId: string;
}

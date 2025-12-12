export class CreateRoleDto {
  readonly name: string;
  readonly description?: string;
  readonly permissions: string[];
  readonly branchId?: string;
}

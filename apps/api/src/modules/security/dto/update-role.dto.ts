export class UpdateRoleDto {
  readonly name?: string;
  readonly description?: string;
  readonly permissions?: string[];
  readonly branchId?: string;
}

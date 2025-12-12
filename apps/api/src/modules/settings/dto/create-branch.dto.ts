export class CreateBranchDto {
  readonly name: string;
  readonly address: string;
  readonly city: string;
  readonly state: string;
  readonly country: string;
  readonly phone?: string;
  readonly email?: string;
  readonly pastorId?: string;
}

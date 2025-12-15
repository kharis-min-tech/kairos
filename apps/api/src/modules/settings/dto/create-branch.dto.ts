export class CreateBranchDto {
  name!: string;
  address!: string;
  city!: string;
  state!: string;
  country!: string;
  phone?: string;
  email?: string;
  pastorId?: string;
}

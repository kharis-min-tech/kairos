export class CreateFellowshipDto {
  name!: string;
  description?: string;
  leaderId?: string;
  branchId!: string;
  meetingDay?: string;
  meetingTime?: string;
  location?: string;
}

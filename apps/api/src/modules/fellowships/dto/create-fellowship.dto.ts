export class CreateFellowshipDto {
  readonly name: string;
  readonly description?: string;
  readonly leaderId?: string;
  readonly branchId: string;
  readonly meetingDay?: string;
  readonly meetingTime?: string;
  readonly location?: string;
}

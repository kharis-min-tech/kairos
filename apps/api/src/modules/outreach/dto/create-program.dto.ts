export class CreateProgramDto {
  readonly name: string;
  readonly description?: string;
  readonly startDate: Date;
  readonly endDate?: Date;
  readonly location?: string;
  readonly branchId: string;
  readonly coordinatorId?: string;
}

export class CreateEventDto {
  readonly title: string;
  readonly description?: string;
  readonly startDate: Date;
  readonly endDate?: Date;
  readonly location?: string;
  readonly capacity?: number;
  readonly registrationRequired?: boolean;
  readonly branchId: string;
}

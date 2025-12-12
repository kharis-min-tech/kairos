export class CreateFollowUpDto {
  readonly type: string;
  readonly notes: string;
  readonly scheduledDate?: Date;
  readonly completedDate?: Date;
  readonly assignedTo: string;
}

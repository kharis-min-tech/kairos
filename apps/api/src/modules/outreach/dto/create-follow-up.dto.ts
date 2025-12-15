export class CreateFollowUpDto {
  type!: string;
  notes!: string;
  scheduledDate?: Date;
  completedDate?: Date;
  assignedTo!: string;
}

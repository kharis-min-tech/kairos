export class CreateAnnouncementDto {
  title!: string;
  content!: string;
  priority!: string;
  targetAudience!: string;
  branchId!: string;
  publishDate?: Date;
  expiryDate?: Date;
}

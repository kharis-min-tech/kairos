export class UpdateAnnouncementDto {
  readonly title?: string;
  readonly content?: string;
  readonly priority?: string;
  readonly targetAudience?: string;
  readonly branchId?: string;
  readonly publishDate?: Date;
  readonly expiryDate?: Date;
}

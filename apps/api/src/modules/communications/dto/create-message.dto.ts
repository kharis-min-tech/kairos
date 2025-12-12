export class CreateMessageDto {
  readonly subject: string;
  readonly content: string;
  readonly senderId: string;
  readonly recipientIds: string[];
  readonly threadId?: string;
}

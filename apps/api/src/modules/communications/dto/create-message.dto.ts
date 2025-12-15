export class CreateMessageDto {
  subject!: string;
  content!: string;
  senderId!: string;
  recipientIds!: string[];
  threadId?: string;
}

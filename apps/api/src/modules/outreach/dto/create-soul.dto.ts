export class CreateSoulDto {
  readonly firstName: string;
  readonly lastName: string;
  readonly phone?: string;
  readonly email?: string;
  readonly address?: string;
  readonly soulStatus: string;
  readonly programId?: string;
  readonly assignedTo?: string;
  readonly notes?: string;
}

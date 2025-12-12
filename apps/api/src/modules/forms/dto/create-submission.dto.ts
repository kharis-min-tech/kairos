export class CreateSubmissionDto {
  readonly memberId?: string;
  readonly answers!: FormAnswerDto[];
}

export class FormAnswerDto {
  readonly fieldId!: string;
  readonly value!: string | number | boolean | string[];
}

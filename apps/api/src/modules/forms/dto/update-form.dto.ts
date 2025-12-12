export class UpdateFormDto {
  readonly title?: string;
  readonly description?: string;
  readonly isActive?: boolean;
  readonly branchId?: string;
  readonly fields?: FormFieldDto[];
}

export class FormFieldDto {
  readonly label!: string;
  readonly type!: string;
  readonly required!: boolean;
  readonly options?: string[];
  readonly validation?: Record<string, string | number | boolean>;
}

export class UpdatePaymentDto {
  readonly amount?: number;
  readonly paymentType?: string;
  readonly paymentMethod?: string;
  readonly memberId?: string;
  readonly branchId?: string;
  readonly description?: string;
  readonly reference?: string;
}

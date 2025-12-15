export class CreatePaymentDto {
  amount!: number;
  paymentType!: string;
  paymentMethod!: string;
  memberId!: string;
  branchId!: string;
  description?: string;
  reference?: string;
}

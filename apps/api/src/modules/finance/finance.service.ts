import { Injectable } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class FinanceService {
  findAllPayments() {
    return { message: 'This action returns all payments' };
  }

  findOnePayment(id: string) {
    return { message: `This action returns payment #${id}` };
  }

  createPayment(createPaymentDto: CreatePaymentDto) {
    return {
      message: 'This action adds a new payment',
      data: createPaymentDto,
    };
  }

  updatePayment(id: string, updatePaymentDto: UpdatePaymentDto) {
    return {
      message: `This action updates payment #${id}`,
      data: updatePaymentDto,
    };
  }

  removePayment(id: string) {
    return { message: `This action removes payment #${id}` };
  }

  getFinancialSummary() {
    return { message: 'This action returns financial summary' };
  }
}

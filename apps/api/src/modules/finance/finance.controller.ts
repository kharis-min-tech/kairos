import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('payments')
  findAllPayments() {
    return this.financeService.findAllPayments();
  }

  @Get('payments/:id')
  findOnePayment(@Param('id') id: string) {
    return this.financeService.findOnePayment(id);
  }

  @Post('payments')
  createPayment(@Body() createPaymentDto: CreatePaymentDto) {
    return this.financeService.createPayment(createPaymentDto);
  }

  @Put('payments/:id')
  updatePayment(
    @Param('id') id: string,
    @Body() updatePaymentDto: UpdatePaymentDto
  ) {
    return this.financeService.updatePayment(id, updatePaymentDto);
  }

  @Delete('payments/:id')
  removePayment(@Param('id') id: string) {
    return this.financeService.removePayment(id);
  }

  @Get('reports/summary')
  getFinancialSummary() {
    return this.financeService.getFinancialSummary();
  }
}

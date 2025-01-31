import { Body, Controller, Post, HttpException, HttpStatus } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CardData, orderDetails } from './dto/create-payment.dto';

interface bodyPay {
  order: orderDetails;
  cardData: { accountId: string, cardId: string };
  customerEmail: string;
}

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) { }

  @Post('create')
  async createPayment(@Body() data: bodyPay) {
    try {
      const { order, cardData, customerEmail } = data;
      const paymentResponse = await this.paymentService.createPayment(order, cardData, customerEmail);
      return { success: true, data: paymentResponse };
    } catch (error) {
      console.error('Error in PaymentController:', error);
      throw new HttpException(
        {
          success: false,
          error: error.message || 'Internal server error',
        },
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }
}
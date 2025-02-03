import { Controller, Post, Logger, Body, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { WebhookPayService } from './webhook_pay.service';
import { ConfigService } from '@nestjs/config';

@Controller('webhook-pay')
export class WebhookPayController {
  private readonly logger = new Logger(WebhookPayController.name);

  constructor(
    private readonly webhookPayService: WebhookPayService,
    private readonly configService: ConfigService,
  ) { }

  @Post()
  async handleWebhook(
    @Body() data: any,
    @Headers('x-signature') signature: string,
  ) {
    try {
      // Validar que el payload esté presente
      if (!data) {
        this.logger.error('No data received in webhook request');
        throw new HttpException('No data received', HttpStatus.BAD_REQUEST);
      }

      this.logger.log('Received webhook request');

      // Validar que la firma esté presente
      if (!signature) {
        this.logger.error('Missing x-signature header');
        throw new HttpException('Missing signature header', HttpStatus.UNAUTHORIZED);
      }

      // Validar la firma
      const isValid = this.webhookPayService.validateWebhookSignature(
        data,
        signature,
        process.env.MP_WEBHOOK_SECRET,
      );

      if (!isValid) {
        this.logger.error('Invalid webhook signature');
        throw new HttpException('Invalid webhook signature', HttpStatus.UNAUTHORIZED);
      }

      // Procesar el webhook
      const result = await this.webhookPayService.handleWebhook(data);

      // Responder con éxito
      return { success: true, data: result };
    } catch (error) {
      this.logger.error('Error in webhook handler:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

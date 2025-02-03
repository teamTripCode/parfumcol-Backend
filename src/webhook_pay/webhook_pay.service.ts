import { Injectable, Logger } from '@nestjs/common';
import MercadoPagoConfig, { Payment } from 'mercadopago';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from "crypto"

@Injectable()
export class WebhookPayService {
  private readonly logger = new Logger(WebhookPayService.name);
  private readonly client: MercadoPagoConfig;
  private readonly payment: Payment;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.client = new MercadoPagoConfig({
      accessToken: this.configService.get<string>('MP_ACCESS_TOKEN'),
    });
    this.payment = new Payment(this.client);
  }

  async handleWebhook(data: any) {
    try {
      this.logger.log('Received webhook from MercadoPago');

      // Verificar que sea un evento de pago
      if (data.type !== 'payment') {
        this.logger.log(`Ignoring non-payment webhook type: ${data.type}`);
        return;
      }

      // Obtener los detalles del pago desde MercadoPago
      const paymentId = data.data.id;
      const paymentInfo = await this.payment.get({ id: paymentId });
      this.logger.log(`Processing payment ID: ${paymentId}`);

      // Buscar el pago en nuestra base de datos
      const payment = await this.prisma.payment.findFirst({
        where: { paymentId: paymentId.toString() },
        include: { order: true },
      });

      if (!payment) {
        this.logger.error(`Payment not found in database: ${paymentId}`);
        return;
      }

      // Actualizar el estado del pago según la respuesta de MercadoPago
      const updatedPayment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: this.getPaymentStatus(paymentInfo.status),
        },
      });

      // Actualizar el estado de la orden según el estado del pago
      if (paymentInfo.status === 'approved') {
        await this.prisma.order.update({
          where: { id: payment.orderId },
          data: { status: 'SHIPPED' },
        });
        this.logger.log(`Order ${payment.orderId} updated to SHIPPED`);
      } else if (paymentInfo.status === 'rejected' || paymentInfo.status === 'cancelled') {
        await this.prisma.order.update({
          where: { id: payment.orderId },
          data: { status: 'CANCELED' },
        });
        this.logger.log(`Order ${payment.orderId} updated to CANCELED`);
      }

      this.logger.log(`Payment ${paymentId} processed successfully`);
      return updatedPayment;
    } catch (error) {
      this.logger.error('Error processing webhook:', error);
      throw error;
    }
  }

  private getPaymentStatus(mpStatus: string): 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELED' {
    switch (mpStatus) {
      case 'approved':
        return 'COMPLETED';
      case 'in_process':
        return 'PROCESSING';
      case 'rejected':
        return 'FAILED';
      case 'cancelled':
        return 'CANCELED';
      default:
        return 'PENDING';
    }
  }

  public validateWebhookSignature(
    payload: any,
    signature: string,
    secret: string,
  ): boolean {
    try {
      if (!signature || !secret) {
        this.logger.error('Missing signature or secret');
        return false;
      }

      // Calcular la firma esperada
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      // Verificar que las longitudes coincidan antes de usar timingSafeEqual
      if (Buffer.byteLength(signature, 'hex') !== Buffer.byteLength(expectedSignature, 'hex')) {
        this.logger.error('Signature length mismatch');
        return false;
      }

      // Comparar las firmas usando timingSafeEqual
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex'),
      );
    } catch (error) {
      this.logger.error('Error validating webhook signature:', error);
      return false;
    }
  }
}

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Joi from 'joi';
import MercadoPagoConfig, { CardToken, Payment } from 'mercadopago';
import { CardData, orderDetails } from './dto/create-payment.dto';
import {
  PaymentCreateData,
  PaymentMethod,
} from 'mercadopago/dist/clients/payment/create/types';
import { Payer } from 'mercadopago/dist/clients/payment/commonTypes';
import { Items } from 'mercadopago/dist/clients/commonTypes';
import { AccountsService } from 'src/accounts/accounts.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PaymentService {
  private readonly client: MercadoPagoConfig;
  private readonly payment: Payment;
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private configService: ConfigService,
    private readonly account: AccountsService,
    private readonly prisma: PrismaService,
  ) {
    this.client = new MercadoPagoConfig({
      accessToken: this.configService.get<string>('MP_ACCESS_TOKEN'),
    });
    this.payment = new Payment(this.client);
  }

  async createPayment(
    order: orderDetails,
    cardData: { accountId: string; cardId: string },
    customerEmail: string,
  ) {
    const { accountId, cardId } = cardData;

    try {
      // Validar los datos de entrada usando Joi
      await this.validateOrder(order);
      await this.validateCardData(cardData);

      // Obtener datos de la tarjeta y cuenta
      const card = await this.account.getCardById(accountId, cardId);
      const account = await this.account.profileAccount(accountId);

      if (card.success === false) {
        throw new HttpException(card.error, HttpStatus.BAD_REQUEST);
      }

      const cardDataFull = card.data;

      // Validar y formatear el número de tarjeta
      const formattedCardNumber = cardDataFull.card_number.replace(/\s+/g, '');
      if (formattedCardNumber.length !== 16) {
        throw new HttpException(
          'Invalid card number length - must be 16 digits',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Formatear el año de expiración
      const formattedYear = this.formatExpirationYear(cardDataFull.expiration_year);

      // Crear objeto de identificación requerido por Mercado Pago
      const identification = {
        type: account.data.type_identity, // Ajusta según el tipo de documento
        number: account.data.identity_number, // Debes obtener este dato del usuario
      };

      // Crear un nuevo objeto de datos de tarjeta formateado
      const formattedCardData: CardData = {
        ...cardDataFull,
        card_number: formattedCardNumber,
        expiration_month: cardDataFull.expiration_month.toString().padStart(2, '0'),
        expiration_year: formattedYear,
        cardHolder: {
          ...cardDataFull.cardHolder,
          identification,
        },
      };

      // Validar los datos de la tarjeta usando Joi
      await this.validateCardDataSchema(formattedCardData);

      // Configurar método de pago y datos del pagador
      const paymentMethod: PaymentMethod = {
        type: 'credit_card',
      };

      const nameParts = cardDataFull.cardHolder.name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');

      const payer: Payer = {
        email: customerEmail.trim().toLowerCase(),
        identification,
        first_name: firstName,
        last_name: lastName || undefined,
      };

      // Formatear el monto para asegurar que sea un número con dos decimales
      const formattedAmount = parseFloat(order.amount.toFixed(2));

      const items: Items[] = [
        {
          id: order.id,
          title: `Order ${order.id}`,
          quantity: order.quantity,
          unit_price: formattedAmount,
        },
      ];

      // Obtener el tipo de tarjeta
      const cardType = this.getCardType(formattedCardNumber);

      // Crear el token de la tarjeta
      const token = await this.createCardToken(formattedCardData);

      // Crear el pago en Mercado Pago
      const paymentData: PaymentCreateData = {
        body: {
          transaction_amount: order.amount,
          description: `Order ${order.id}`,
          installments: 1,
          token,
          payment_method_id: cardType,
          payment_method: paymentMethod,
          payer,
          external_reference: order.id,
          statement_descriptor: 'ParfumCol',
          additional_info: { items },
          capture: true,
          binary_mode: true,
        },
      };

      const response = await this.payment.create(paymentData);

      // Crear el registro de pago en la base de datos
      const paymentRecord = await this.prisma.payment.create({
        data: {
          orderId: order.id,
          amount: order.amount,
          paymentMethod: 'CARD',
          status: this.getPaymentStatus(response.status),
          paymentId: response.id.toString(),
          cardLast4: formattedCardNumber.slice(-4),
          cardBrand: cardType,
        },
      });

      // Actualizar el estado de la orden si el pago fue exitoso
      if (response.status === 'approved') {
        await this.prisma.order.update({
          where: { id: order.id },
          data: { status: 'SHIPPED' },
        });
      }

      // Registrar solo información no sensible
      this.logger.log(`Payment created successfully for order ID: ${order.id}`);

      console.log(response)

      return { ...response, paymentRecord };
    } catch (error) {
      // Manejo detallado de errores
      if (error instanceof HttpException) {
        this.logger.error(`Client error: ${error.message}`);
        throw error;
      } else if (error instanceof Error) {
        this.logger.error(`Server error: ${error.message}`, error.stack);
        throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
      } else {
        this.logger.error('Unknown error occurred', error);
        throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  private async createCardToken(cardData: CardData) {
    try {
      const cardToken = new CardToken(this.client);
      const response = await cardToken.create({ body: cardData });

      // Evitar registrar datos sensibles como el token
      this.logger.log('Card token created successfully');

      return response.id;
    } catch (error) {
      this.logger.error('Error creating card token', error);
      throw new HttpException('Failed to create card token', HttpStatus.BAD_REQUEST);
    }
  }

  private formatExpirationYear(year: string): string {
    // Si el año ya tiene 4 dígitos, retornarlo
    if (year.length === 4) return year;
    // Si el año tiene 2 dígitos, agregarle '20' al principio
    if (year.length === 2) return `20${year}`;
    throw new HttpException('Invalid expiration year format', HttpStatus.BAD_REQUEST);
  }

  private getCardType(cardNumber: string): string {
    const visaPattern = /^4[0-9]{12}(?:[0-9]{3})?$/;
    const mastercardPattern = /^5[1-5][0-9]{14}$/;
    const amexPattern = /^3[47][0-9]{13}$/;

    if (visaPattern.test(cardNumber)) return 'visa';
    if (mastercardPattern.test(cardNumber)) return 'master';
    if (amexPattern.test(cardNumber)) return 'amex';
    throw new HttpException('Unsupported card type', HttpStatus.BAD_REQUEST);
  }

  // Validación de datos de entrada usando Joi
  private async validateOrder(order: orderDetails) {
    const schema = Joi.object({
      id: Joi.string().required(),
      amount: Joi.number().positive().precision(2).required(),
      quantity: Joi.number().integer().min(1).required(),
    });

    const { error } = schema.validate(order);
    if (error) {
      throw new HttpException(`Invalid order data: ${error.message}`, HttpStatus.BAD_REQUEST);
    }
  }

  private async validateCardData(cardData: { accountId: string; cardId: string }) {
    const schema = Joi.object({
      accountId: Joi.string().required(),
      cardId: Joi.string().required(),
    });

    const { error } = schema.validate(cardData);
    if (error) {
      throw new HttpException(`Invalid card data: ${error.message}`, HttpStatus.BAD_REQUEST);
    }
  }

  private async validateCardDataSchema(cardData: CardData) {
    const schema = Joi.object({
      card_number: Joi.string().length(16).required(),
      expiration_month: Joi.string().length(2).required(),
      expiration_year: Joi.string().length(4).required(),
      security_code: Joi.string().required(),
      cardHolder: Joi.object({
        name: Joi.string().required(),
        identification: Joi.object({
          type: Joi.string().required(),
          number: Joi.string().required(),
        }).required(),
      }).required(),
    });

    const { error } = schema.validate(cardData);
    if (error) {
      throw new HttpException(`Invalid card data: ${error.message}`, HttpStatus.BAD_REQUEST);
    }
  }

  private getPaymentStatus(mpStatus: string): 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' {
    switch (mpStatus) {
      case 'approved':
        return 'COMPLETED';
      case 'in_process':
        return 'PROCESSING';
      case 'rejected':
        return 'FAILED';
      default:
        return 'PENDING';
    }
  }
}
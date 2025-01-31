import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import MercadoPagoConfig, { CardToken, Payment } from 'mercadopago';
import { CardData, orderDetails } from './dto/create-payment.dto';
import {
  PaymentCreateData,
  PaymentMethod,
  PaymentMethodData,
  PaymentMethodDataAuthentication,
} from 'mercadopago/dist/clients/payment/create/types';
import { Payer } from 'mercadopago/dist/clients/payment/commonTypes';
import { Items } from 'mercadopago/dist/clients/commonTypes';
import { AccountsService } from 'src/accounts/accounts.service';

@Injectable()
export class PaymentService {
  private readonly client: MercadoPagoConfig;
  private readonly payment: Payment;
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private configService: ConfigService,
    private readonly account: AccountsService
  ) {
    this.client = new MercadoPagoConfig({
      accessToken: this.configService.get<string>('MP_ACCESS_TOKEN')
    });
    this.payment = new Payment(this.client)
  }

  async createPayment(
    order: orderDetails,
    cardData: { accountId: string, cardId: string },
    customerEmail: string
  ) {
    const { accountId, cardId } = cardData;

    console.log(order, cardData, customerEmail)

    try {
      const card = await this.account.getCardById(accountId, cardId);
      const account = await this.account.profileAccount(accountId);

      if (card.success === false) throw new Error(card.error);

      const cardDataFull = card.data;

      // Format the card number by removing spaces and checking length
      const formattedCardNumber = cardDataFull.card_number.replace(/\s+/g, '');
      if (formattedCardNumber.length !== 16) {
        throw new Error('Invalid card number length - must be 16 digits');
      }

      // Format expiration year to YYYY format
      const formattedYear = this.formatExpirationYear(cardDataFull.expiration_year);

      // Crear objeto de identificación requerido por Mercado Pago
      const identification = {
        type: account.data.type_identity, // Ajusta según el tipo de documento
        number: account.data.identity_number // Debes obtener este dato del usuario
      };

      // Create a new card data object with the formatted data
      const formattedCardData: CardData = {
        ...cardDataFull,
        card_number: formattedCardNumber,
        expiration_month: cardDataFull.expiration_month.toString().padStart(2, '0'),
        expiration_year: formattedYear,
        cardHolder: {
          ...cardDataFull.cardHolder,
          identification
        }
      }

      const paymentMethod: PaymentMethod = {
        type: 'credit_card',
      }

      // Nombre y apellido formateados
      const nameParts = cardDataFull.cardHolder.name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');

      const payer: Payer = {
        email: customerEmail.trim().toLowerCase(),
        identification,
        first_name: firstName,
        last_name: lastName || undefined
      };

      // Formatear el monto para asegurar que sea un número con dos decimales
      const formattedAmount = parseFloat(order.amount.toFixed(2));

      const items: Items[] = [{
        id: order.id,
        title: `Order ${order.id}`,
        quantity: order.quantity,
        unit_price: formattedAmount
      }]

      // Obtener el tipo de tarjeta
      const cardType = this.getCardType(formattedCardNumber);

      // Crear el token de la tarjeta
      const token = await this.createCardToken(formattedCardData);

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
          binary_mode: true
        }
      }

      const response = await this.payment.create(paymentData)
      console.log("res MP: ", response)
      return response
    } catch (error) {
      this.logger.error('Error creating Mercado Pago payment', error);
      throw error;
    }
  }

  private async createCardToken(cardData: CardData) {
    try {
      const cardToken = new CardToken(this.client);
      const response = await cardToken.create({ body: cardData });
      return response.id;
    } catch (error) {
      this.logger.error('Error creating card token', error);
      throw error;
    }
  }

  private formatExpirationYear(year: string): string {
    // Si el año ya tiene 4 dígitos, retornarlo
    if (year.length === 4) return year;

    // Si el año tiene 2 dígitos, agregarle '20' al principio
    if (year.length === 2) return `20${year}`;

    throw new Error('Formato de año inválido');
  }

  private getCardType(cardNumber: string): string {
    // Identificar el tipo de tarjeta basado en el BIN (primeros dígitos)
    const firstDigit = cardNumber.charAt(0);
    const firstTwoDigits = parseInt(cardNumber.substring(0, 2));

    if (firstDigit === '4') return 'visa';
    if (firstTwoDigits >= 51 && firstTwoDigits <= 55) return 'master';
    if (firstTwoDigits === 34 || firstTwoDigits === 37) return 'amex';

    throw new Error('Tipo de tarjeta no soportado');
  }
}

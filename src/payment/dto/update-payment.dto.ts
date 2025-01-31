import { PartialType } from '@nestjs/mapped-types';
import { CardData } from './create-payment.dto';

export class UpdatePaymentDto extends PartialType(CardData) {}

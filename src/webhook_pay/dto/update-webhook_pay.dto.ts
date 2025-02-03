import { PartialType } from '@nestjs/mapped-types';
import { CreateWebhookPayDto } from './create-webhook_pay.dto';

export class UpdateWebhookPayDto extends PartialType(CreateWebhookPayDto) {}

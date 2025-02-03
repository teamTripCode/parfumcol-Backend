import { Module } from '@nestjs/common';
import { WebhookPayService } from './webhook_pay.service';
import { WebhookPayController } from './webhook_pay.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  controllers: [WebhookPayController],
  providers: [WebhookPayService],
  imports: [PrismaModule, ConfigModule.forRoot({ isGlobal: true })]
})
export class WebhookPayModule { }

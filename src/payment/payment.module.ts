import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { AccountsModule } from 'src/accounts/accounts.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [PaymentController],
  providers: [PaymentService],
  imports: [AccountsModule, PrismaModule],
})
export class PaymentModule {}

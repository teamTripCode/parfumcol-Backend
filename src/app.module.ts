import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './admin/admin.module';
import { ConfigModule } from '@nestjs/config';
import { AccountsModule } from './accounts/accounts.module';
import { SearchModule } from './search/search.module';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    AdminModule,
    ConfigModule.forRoot({ isGlobal: true }),
    AccountsModule,
    SearchModule,
    PaymentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

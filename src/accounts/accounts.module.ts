import { Module } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { TokenService } from 'src/token/token.service';
import { TokenModule } from 'src/token/token.module';

@Module({
  controllers: [AccountsController],
  providers: [AccountsService, TokenService],
  exports: [AccountsService],
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, TokenModule]
})
export class AccountsModule {}

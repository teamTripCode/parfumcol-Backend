import { Module } from '@nestjs/common';
import { TripnodeService } from './tripnode.service';
import { TripnodeController } from './tripnode.controller';

@Module({
  controllers: [TripnodeController],
  providers: [TripnodeService],
  exports: [TripnodeService]
})
export class TripnodeModule {}

import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { SearchModule } from 'src/search/search.module';

@Module({
  controllers: [AdminController],
  providers: [AdminService],
  imports: [PrismaModule, CloudinaryModule, SearchModule]
})
export class AdminModule { }

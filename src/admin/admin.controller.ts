import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFiles, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { LotionDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { FilesInterceptor } from '@nestjs/platform-express';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  @Post('create_lotion')
  @UseInterceptors(FilesInterceptor('images'))
  create(
    @Body() createLotionDto: LotionDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.adminService.addLotion(createLotionDto, files)
  }

  @Get('all_lotions')
  allLotions(@Query('page') page: number = 1) {
    return this.adminService.allLotions(page);
  }


  @Get('all_chords')
  allChords() {
    return this.adminService.getAllChords()
  }

  @Post('search_lotion')
  SearchLotion(@Body() data: { name: string, page?: number, priceOrder?: "asc" | "desc", brand?: string }) {
    const { name, page, priceOrder, brand } = data
    return this.adminService.searchNameLotion(name, page, priceOrder, brand)
  }

  @Get('random_covers')
  RandomCovers() {
    return this.adminService.randomTenImages();
  }
}

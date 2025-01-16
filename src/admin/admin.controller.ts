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

  @Get('lotion/:id')
  OnlyLotion(
    @Param('id') id: string,
  ) {
    return this.adminService.getOnlyLotion(id)
  }

  @Patch('lotion/:id')
  updateLotion(
    @Param('id') id: string,
    @Body() data: Partial<LotionDto>,
  ) {
    return this.adminService.updateLotion(id, data);
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

  @Get('lotion_chords/:id')
  getLotionChords(@Param('id') id: string) {
    return this.adminService.getLotionChords(id);
  }

  @Patch('update_chords/:id')
  updateLotionChords(
    @Param('id') id: string,
    @Body() data: { chords: string[] },
  ) {
    return this.adminService.updateLotionChords(id, data.chords);
  }

  @Post('add_images/:id')
  @UseInterceptors(FilesInterceptor('images'))
  addImagesToLotion(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.adminService.addImagesToLotion(id, files);
  }
}

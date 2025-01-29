import { Controller, Get, Post, Body, Patch, Param, UseInterceptors, UploadedFiles, Query, Put, UploadedFile } from '@nestjs/common';
import { AdminService } from './admin.service';
import { LotionDto } from './dto/create-admin.dto';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

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

  @Get('all_brands')
  AllBrands() {
    return this.adminService.getAllBrands();
  }

  @Post('add_corrections_brands')
  CorrectionBrands(@Body() data: { originalName: string; correctedName: string }[]) {
    return this.adminService.addBrandCorrections(data);
  }

  @Post('add_brands')
  AddBrands(@Body() data: { brands: string[] }) {
    return this.adminService.saveLotionHouses(data.brands);
  }

  @Get('all_lotion_houses')
  AllLotionsHouse() {
    return this.adminService.getHousesLotions();
  }

  @Put('update_lotion_house_logo/:id')
  @UseInterceptors(FileInterceptor('logo'))
  async updateLotionHouse(
    @Param('id') id: string,
    @Body() body: { name?: string },
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    return this.adminService.updateLotionHouse(id, {
      name: body.name,
      logo,
    });
  }

  @Get('houses_carrousel')
  async HousesCarrousel() {
    return this.adminService.getLotionsByHousesCarrousel();
  }

  @Get('all_houses')
  async allHouses(
    @Query('page') page: string,
  ) {
    const currentPage = parseInt(page) || 1;
    return this.adminService.getHousesLotions(currentPage)
  }

  @Get('house/:brand')
  async InfoHouse(@Param('brand') brand: string) {
    return this.adminService.getLotionHouse(brand);
  }

  @Get('house/:brand/lotions')
  async LotionsHouses(
    @Param('brand') brand: string,
    @Query('page') page: number = 1
  ) {
    return this.adminService.getLotionsByHouses(brand, page);
  }

}

import { PartialType } from '@nestjs/mapped-types';
import { LotionDto } from './create-admin.dto';

export class UpdateAdminDto extends PartialType(LotionDto) {}

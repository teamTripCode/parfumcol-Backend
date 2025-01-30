import { PartialType } from '@nestjs/mapped-types';
import { SearchOptions } from './create-search.dto';

export class UpdateSearchDto extends PartialType(SearchOptions) {}

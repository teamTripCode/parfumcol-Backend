import { PartialType } from '@nestjs/mapped-types';
import { CreateTripnodeDto } from './create-tripnode.dto';

export class UpdateTripnodeDto extends PartialType(CreateTripnodeDto) {}

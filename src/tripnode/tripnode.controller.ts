import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TripnodeService } from './tripnode.service';
import { CreateTripnodeDto } from './dto/create-tripnode.dto';
import { UpdateTripnodeDto } from './dto/update-tripnode.dto';

@Controller('tripnode')
export class TripnodeController {
  constructor(private readonly tripnodeService: TripnodeService) {}
}

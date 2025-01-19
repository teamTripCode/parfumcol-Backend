import { IsOptional, IsString, IsArray } from 'class-validator';

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  home_address?: string;

  @IsOptional()
  orders?: {
    connect?: { id: string }[];
    disconnect?: { id: string }[];
  };

  @IsOptional()
  cart?: {
    connect?: { id: string };
    disconnect?: boolean;
  };
}

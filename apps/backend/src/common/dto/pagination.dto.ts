
import { IsOptional, IsPositive, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationQueryDto {
  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc' = 'asc';

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  filters?: { [key: string]: any };
}

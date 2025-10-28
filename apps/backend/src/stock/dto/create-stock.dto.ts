import { IsString, IsNotEmpty, IsNumber, IsPositive, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum Exchange {
  NSE = 'NSE',
  BSE = 'BSE',
}

export class CreateStockDto {
  @ApiProperty({ example: 'HDFCBANK.NS' })
  @IsString()
  @IsNotEmpty()
  symbol!: string;

  @ApiProperty({ example: 'HDFC Bank' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'Financial Sector' })
  @IsString()
  @IsNotEmpty()
  sector!: string;

  @ApiProperty({ example: 1500.5 })
  @IsNumber()
  @IsPositive()
  purchasePrice!: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @IsPositive()
  quantity!: number;

  @ApiProperty({ enum: Exchange, example: 'NSE' })
  @IsEnum(Exchange)
  exchange!: Exchange;

  @ApiPropertyOptional({ example: 500000 })
  @IsOptional()
  @IsString()
  marketCap?: string;

  @ApiPropertyOptional({ example: 20.5 })
  @IsOptional()
  @IsNumber()
  peRatioTTM?: number;
}

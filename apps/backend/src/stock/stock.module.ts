import { Module } from '@nestjs/common';
import { StockService } from './stock.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StockController } from './stock.controller';
import { StockPriceService } from '../stock-price/stock-price.service';
import { PriceCacheService } from '../cache/cache.service';

@Module({
  imports: [PrismaModule],
  controllers: [StockController],
  providers: [StockService, StockPriceService, PriceCacheService],
  exports: [StockService],
})
export class StockModule {}

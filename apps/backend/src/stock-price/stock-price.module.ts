import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StockPriceService } from './stock-price.service';
import { StockPriceController } from './stock-price.controller';
import { CacheModule } from '@nestjs/cache-manager';
import { StockService } from '../stock/stock.service';
import { PriceCacheService } from '../cache/cache.service';
import { PriceCacheModule } from '../cache/cache.module';

@Module({
  imports: [PriceCacheModule, PrismaModule],
  controllers: [StockPriceController],
  providers: [StockPriceService],
  exports: [StockPriceService],
})
export class StockPriceModule {}

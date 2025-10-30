import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StockPriceService } from './stock-price.service';
import { StockPriceController } from './stock-price.controller';
import { PriceCacheService } from '../cache/cache.service';

@Module({
  imports: [PrismaModule],
  controllers: [StockPriceController],
  providers: [StockPriceService, PriceCacheService],
  exports: [StockPriceService],
})
export class StockPriceModule {}

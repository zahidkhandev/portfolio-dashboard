import { Module } from '@nestjs/common';
import { PriceDataController } from './price-data.controller';
import { PriceDataService } from './price-data.service';
import { PriceDataCalculationsService } from './price-data-calculations.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StockPriceModule } from '../stock-price/stock-price.module';
import { PriceDataSchedulerService } from '../cron/price-data-scheduler.service';

@Module({
  imports: [PrismaModule, StockPriceModule],
  controllers: [PriceDataController],
  providers: [PriceDataService, PriceDataCalculationsService, PriceDataSchedulerService],
  exports: [PriceDataService],
})
export class PriceDataModule {}

import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { PriceDataService } from './price-data.service';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GetCurrentUser } from '../common/decorators/user';

@Controller('price-data')
@ApiBearerAuth('JWT-auth')
export class PriceDataController {
  constructor(private priceDataService: PriceDataService) {}

  @Post(':stockId/refresh')
  @ApiOperation({ summary: 'Refresh price snapshot for a stock' })
  refreshStock(@GetCurrentUser('id') userId: number, @Param('stockId') stockId: number) {
    return this.priceDataService.refreshSingleStock(stockId, userId);
  }

  @Get(':stockId/latest')
  @ApiOperation({ summary: 'Get latest price snapshot without refresh' })
  getLatest(@GetCurrentUser('id') userId: number, @Param('stockId') stockId: number) {
    return this.priceDataService.getLatest(stockId, userId);
  }

  @Get(':stockId/history')
  @ApiOperation({ summary: 'Get historical price snapshots for date range' })
  async getHistory(
    @GetCurrentUser('id') userId: number,
    @Param('stockId') stockId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    console.log('history request for stock:', stockId);
    console.log('date range:', startDate, 'to', endDate);

    const start = startDate
      ? new Date(startDate)
      : (() => {
          const date = new Date();
          date.setDate(date.getDate() - 30);
          return date;
        })();

    const end = endDate ? new Date(endDate) : new Date();

    console.log('parsed dates:', start, 'to', end);

    return this.priceDataService.getHistory(stockId, start, end, userId);
  }

  @Post('refresh-all')
  @ApiOperation({ summary: 'Refresh all stocks in portfolio at once' })
  refreshAll(@GetCurrentUser('id') userId: number) {
    return this.priceDataService.bulkRefresh(userId);
  }
}

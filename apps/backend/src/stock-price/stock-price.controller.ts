import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { StockPriceService } from './stock-price.service';

@Controller('price')
@ApiBearerAuth('JWT-auth')
export class StockPriceController {
  constructor(private stockPriceService: StockPriceService) {}

  @Get(':symbol')
  @ApiOperation({ summary: 'Get current price for symbol' })
  getCurrentPrice(@Param('symbol') symbol: string) {
    return this.stockPriceService.fetchCurrentPrice(symbol);
  }

  @Get(':symbol/fundamentals')
  @ApiOperation({ summary: 'Get fundamental data for symbol' })
  getFundamentals(@Param('symbol') symbol: string) {
    return this.stockPriceService.fetchFundamentals(symbol);
  }

  @Get(':symbol/historical')
  @ApiOperation({ summary: 'Get historical price data' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  getHistoricalPrices(
    @Param('symbol') symbol: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.stockPriceService.fetchHistoricalPrices(symbol, start, end);
  }
}

import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
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

  @Post('batch')
  @ApiOperation({ summary: 'Get prices for multiple symbols' })
  getBatchPrices(@Body() body: { symbols: string[] }) {
    return this.stockPriceService.fetchBatchPrices(body.symbols);
  }
}

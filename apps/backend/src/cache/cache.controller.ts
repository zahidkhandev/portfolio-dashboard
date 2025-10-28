import { Controller, Get, Delete, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PriceCacheService } from './cache.service';

@Controller('cache')
@ApiBearerAuth('JWT-auth')
export class PriceCacheController {
  constructor(private cacheService: PriceCacheService) {}

  @Get(':symbol')
  @ApiOperation({ summary: 'Get cached price data for symbol' })
  getCachedPrice(@Param('symbol') symbol: string) {
    return this.cacheService.getCached(symbol);
  }

  @Delete(':symbol')
  @ApiOperation({ summary: 'Clear cache for specific symbol' })
  clearSymbolCache(@Param('symbol') symbol: string) {
    return this.cacheService.deleteCache(symbol);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear entire price cache' })
  clearAllCache() {
    return this.cacheService.resetCompleteCache();
  }
}

// portfolio.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GetCurrentUser } from '../common/decorators/user';

@Controller('portfolio')
@ApiBearerAuth('JWT-auth')
export class PortfolioController {
  constructor(private portfolioService: PortfolioService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get portfolio dashboard metrics summary' })
  getPortfolioMetrics(@GetCurrentUser('id') userId: number) {
    return this.portfolioService.getPortfolioMetrics(userId);
  }
}

import { Body, Controller, Post, Get, Patch, Delete, Param, Query } from '@nestjs/common';
import { StockService } from './stock.service';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GetCurrentUser } from '../common/decorators/user';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';

@Controller('stocks')
@ApiBearerAuth('JWT-auth')
export class StockController {
  constructor(private stockService: StockService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new stock in users portfolio' })
  createStock(@GetCurrentUser('id') userId: string, @Body() dto: CreateStockDto) {
    return this.stockService.createStock(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all user stocks' })
  getUserStocks(@GetCurrentUser('id') userId: string) {
    return this.stockService.getUserStock(userId);
  }

  @Get('sector/:sector')
  @ApiOperation({ summary: 'Get stocks of the user by sector' })
  getStocksBySector(@GetCurrentUser('id') userId: string, @Param('sector') sector: string) {
    return this.stockService.getStocksBySector(userId, sector);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search stocks by the stock symbol' })
  searchStocks(@GetCurrentUser('id') userId: string, @Query('query') query: string) {
    return this.stockService.getStocksBySymbol(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get stock by iots saved id' })
  getStockById(@GetCurrentUser('id') userId: string, @Param('id') id: string) {
    return this.stockService.getStockyId(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a users stock details by id' })
  updateStock(
    @GetCurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStockDto,
  ) {
    return this.stockService.updateStock(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete stock from portfolio' })
  deleteStock(@GetCurrentUser('id') userId: string, @Param('id') id: string) {
    return this.stockService.deleteStock(userId, id);
  }
}

import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { StockService } from './stock.service';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetCurrentUser } from '../common/decorators/user';
import { ImportFundamentalsDto } from './dto/import-fundamentals.dto';

@Controller('stocks')
@ApiTags('Stock')
@ApiBearerAuth('JWT-auth')
export class StockController {
  constructor(private stockService: StockService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new stock' })
  createStock(@GetCurrentUser('id') userId: number, @Body() dto: CreateStockDto) {
    return this.stockService.createStock(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all stocks' })
  getUserStocks(@GetCurrentUser('id') userId: number) {
    return this.stockService.getUserStock(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get stock by id' })
  getStockById(@GetCurrentUser('id') userId: number, @Param('id') id: string) {
    return this.stockService.getStockyId(userId, +id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update stock' })
  updateStock(
    @GetCurrentUser('id') userId: number,
    @Param('id') id: string,
    @Body() dto: UpdateStockDto,
  ) {
    return this.stockService.updateStock(userId, +id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete stock' })
  deleteStock(@GetCurrentUser('id') userId: number, @Param('id') id: string) {
    return this.stockService.deleteStock(userId, +id);
  }

  @Post(':id/fundamentals')
  @ApiOperation({ summary: 'Update fundamentals for a specific stock' })
  updateStockFundamentals(@GetCurrentUser('id') userId: number, @Param('id') id: string) {
    return this.stockService.updateStockFundamentals(userId, +id);
  }

  @Post('fundamentals/bulk-update')
  @ApiOperation({ summary: 'Bulk update fundamentals for all stocks' })
  bulkUpdateFundamentals(@GetCurrentUser('id') userId: number) {
    return this.stockService.bulkUpdateFundamentals(userId);
  }

  @Post('fundamentals/import')
  @ApiOperation({ summary: 'Import fundamentals from CSV data' })
  importFundamentals(@GetCurrentUser('id') userId: number, @Body() data: ImportFundamentalsDto[]) {
    return this.stockService.importFundamentalsFromCSV(userId, data);
  }
}

import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { StockPriceService } from '../stock-price/stock-price.service';
import { ImportFundamentalsDto } from './dto/import-fundamentals.dto';

@Injectable()
export class StockService {
  private logger: Logger;

  constructor(
    private prisma: PrismaService,
    private stockPriceService: StockPriceService,
  ) {
    this.logger = new Logger(StockService.name);
  }

  async createStock(userId: number, dto: CreateStockDto) {
    const stockExists = await this.prisma.stock.findFirst({
      where: {
        userId,
        symbol: dto.symbol,
      },
    });

    if (stockExists) {
      throw new ConflictException('Stock already exists in your portfolio');
    }

    const totalInvestment = dto.purchasePrice * dto.quantity;

    const createdStock = this.prisma.stock.create({
      data: {
        ...dto,
        investment: totalInvestment,
        userId,
        portfolioPercent: 0,
      },
    });

    return createdStock;
  }

  async getUserStock(userId: number) {
    const userStocks = await this.prisma.stock.findMany({
      where: {
        userId: userId,
      },
      include: {
        priceData: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return userStocks;
  }

  async getStockyId(userId: number, stockId: number) {
    const stock = await this.prisma.stock.findFirst({
      where: {
        id: stockId,
        userId: userId,
      },
      include: {
        priceData: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    if (!stock) {
      throw new NotFoundException('not found');
    }

    return stock;
  }

  async updateStock(userId: number, stockId: number, dto: UpdateStockDto) {
    // const stock = await this.getStockyId(userId, stockId);
    const stock = await this.prisma.stock.findFirst({
      where: {
        id: stockId,
        userId: userId,
      },
    });

    if (!stock) {
      throw new NotFoundException('stock not found');
    }

    const updatedTotalInvestment =
      dto.purchasePrice && dto.quantity ? dto.purchasePrice * dto.quantity : undefined;

    // let updatedStock;
    // if (updatedTotalInvestment === undefined) {
    //   updatedStock = await this.prisma.stock.update({
    //     where: { id: stockId },
    //     data: {
    //       ...dto,
    //     },
    //   });
    // }

    // console.log(updatedTotalInvestment != undefined ? updatedTotalInvestment : stock.investment);

    const updatedStock = await this.prisma.stock.update({
      where: { id: stockId },
      data: {
        ...dto,
        investment: updatedTotalInvestment != undefined ? updatedTotalInvestment : stock.investment,
      },
    });

    return updatedStock;
  }

  async deleteStock(userId: number, stockId: number) {
    const stock = await this.prisma.stock.findFirst({
      where: {
        id: stockId,
        userId,
      },
    });

    if (!stock) {
      throw new NotFoundException('stock not found');
    }

    await this.prisma.stock.delete({
      where: {
        id: stockId,
      },
    });

    console.log('deleted:', stockId);

    return { message: 'deleted' };
  }

  async getStocksBySymbol(userId: number, symbol: string) {
    const stock = await this.prisma.stock.findMany({
      where: {
        userId,
        symbol: { contains: symbol, mode: 'insensitive' },
      },
    });

    return stock;
  }

  async getStocksBySector(userId: number, sector: string) {
    const stocks = await this.prisma.stock.findMany({
      where: { userId, sector },
      orderBy: { createdAt: 'desc' },
    });

    // console.log(stocks.length, sector);

    return stocks;
  }

  async updateStockFundamentals(userId: number, stockId: number) {
    this.logger.log('updating fundamentals for stock: ' + stockId);

    const stock = await this.prisma.stock.findFirst({
      where: { id: stockId, userId: userId },
    });

    if (!stock) {
      throw new NotFoundException('stock not found');
    }

    this.logger.log('fetching fundamentals for: ' + stock.symbol);
    const fundamentals = await this.stockPriceService.fetchFundamentals(stock.symbol);

    if (!fundamentals) {
      throw new Error('failed to fetch fundamentals for ' + stock.symbol);
    }

    const ebitdaPercent =
      fundamentals.ebitdaTTM && fundamentals.revenueTTM
        ? Math.round(
            ((fundamentals.ebitdaTTM / fundamentals.revenueTTM) * 100 + Number.EPSILON) * 100,
          ) / 100
        : null;

    const updated = await this.prisma.stock.update({
      where: { id: stockId },
      data: {
        marketCap: fundamentals.marketCap,
        peRatioTTM: fundamentals.peRatioTTM,
        priceToBook: fundamentals.priceToBook,
        bookValue: fundamentals.bookValue,
        debtToEquity: fundamentals.debtToEquity,
        revenueTTM: fundamentals.revenueTTM,
        ebitdaTTM: fundamentals.ebitdaTTM,
        ebitdaPercent: ebitdaPercent,
      },
    });

    this.logger.log('updated fundamentals for: ' + stock.symbol);

    return updated;
  }

  async bulkUpdateFundamentals(userId: number) {
    const startTime = Date.now();
    this.logger.log('bulk updating fundamentals for user: ' + userId);

    const stocks = await this.prisma.stock.findMany({
      where: { userId: userId },
      select: {
        id: true,
        symbol: true,
      },
    });

    this.logger.log('found ' + stocks.length + ' stocks to update');

    const updated = [];
    const failed = [];

    for (const stock of stocks) {
      try {
        const fundamentals = await this.stockPriceService.fetchFundamentals(stock.symbol);

        if (fundamentals) {
          const ebitdaPercent =
            fundamentals.ebitdaTTM && fundamentals.revenueTTM
              ? Math.round(
                  ((fundamentals.ebitdaTTM / fundamentals.revenueTTM) * 100 + Number.EPSILON) * 100,
                ) / 100
              : null;

          await this.prisma.stock.update({
            where: { id: stock.id },
            data: {
              marketCap: fundamentals.marketCap,
              peRatioTTM: fundamentals.peRatioTTM,
              priceToBook: fundamentals.priceToBook,
              bookValue: fundamentals.bookValue,
              debtToEquity: fundamentals.debtToEquity,
              revenueTTM: fundamentals.revenueTTM,
              ebitdaTTM: fundamentals.ebitdaTTM,
              ebitdaPercent: ebitdaPercent,
            },
          });

          updated.push(stock.symbol);
        } else {
          failed.push(stock.symbol);
        }
      } catch (err) {
        this.logger.error('failed to update ' + stock.symbol + ': ' + (err as Error).message);
        failed.push(stock.symbol);
      }
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1) + 's';

    this.logger.log('bulk update done in ' + duration);

    return {
      updated: updated.length,
      failed: failed.length,
      total: stocks.length,
      duration: duration,
      updatedSymbols: updated,
      failedSymbols: failed,
    };
  }

  async importFundamentalsFromCSV(userId: number, data: ImportFundamentalsDto[]) {
    this.logger.log('importing fundamentals for ' + data.length + ' stocks');

    const imported = [];
    const failed = [];

    for (const item of data) {
      try {
        const stock = await this.prisma.stock.findFirst({
          where: {
            userId: userId,
            symbol: item.symbol,
          },
        });

        if (!stock) {
          this.logger.warn('stock not found: ' + item.symbol);
          failed.push(item.symbol);
          continue;
        }

        await this.prisma.stock.update({
          where: { id: stock.id },
          data: {
            revenueTTM: item.revenueTTM,
            ebitdaTTM: item.ebitdaTTM,
            ebitdaPercent: item.ebitdaPercent,
            pat: item.pat,
            patPercent: item.patPercent,
            cfoMarch24: item.cfoMarch24,
            cfo5Years: item.cfo5Years,
            freeCashFlow5Years: item.freeCashFlow5Years,
            debtToEquity: item.debtToEquity,
            bookValue: item.bookValue,
            priceToBook: item.priceToBook,
            priceToSales: item.priceToSales,
            revenueGrowth3Y: item.revenueGrowth3Y,
            ebitdaGrowth3Y: item.ebitdaGrowth3Y,
            profitGrowth3Y: item.profitGrowth3Y,
            marketCapGrowth3Y: item.marketCapGrowth3Y,
            cfoToEbitda: item.cfoToEbitda,
            cfoToPat: item.cfoToPat,
            stage2: item.stage2,
            latestEarnings: item.latestEarnings,
          },
        });

        imported.push(item.symbol);
      } catch (err) {
        this.logger.error('failed to import ' + item.symbol + ': ' + (err as Error).message);
        failed.push(item.symbol);
      }
    }

    return {
      imported: imported.length,
      failed: failed.length,
      total: data.length,
      importedSymbols: imported,
      failedSymbols: failed,
    };
  }
}

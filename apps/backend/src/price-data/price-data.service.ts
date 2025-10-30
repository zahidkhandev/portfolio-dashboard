import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StockPriceService } from '../stock-price/stock-price.service';
import { PriceDataCalculationsService } from './price-data-calculations.service';

@Injectable()
export class PriceDataService {
  private logger: Logger;

  constructor(
    private prisma: PrismaService,
    private stockPriceService: StockPriceService,
    private calculations: PriceDataCalculationsService,
  ) {
    this.logger = new Logger(PriceDataService.name);
  }

  async refreshSingleStock(stockId: number, userId: number) {
    this.logger.log('refreshing stock: ' + stockId);

    const stock = await this.prisma.stock.findFirst({
      where: { id: stockId, userId: userId },
      select: {
        id: true,
        symbol: true,
        name: true,
        sector: true,
        purchasePrice: true,
        quantity: true,
        investment: true,
      },
    });

    if (!stock) {
      this.logger.warn('stock not found');
      throw new NotFoundException('stock not found');
    }

    this.logger.log('fetching price for ' + stock.symbol);
    const priceData = await this.stockPriceService.fetchCurrentPrice(stock.symbol);

    if (!priceData) {
      throw new Error('failed to fetch price for ' + stock.symbol);
    }

    // console.log('priceData:', priceData);

    const metrics = this.calculations.calculateMetrics(
      stock.purchasePrice,
      stock.quantity,
      priceData.currentPrice,
    );

    // console.log('metrics:', metrics);

    const refreshedData = await this.prisma.priceData.create({
      data: {
        stockId: stock.id,
        currentPrice: priceData.currentPrice,
        presentValue: metrics.presentValue,
        gainLoss: metrics.gainLoss,
        gainLossPercent: metrics.gainLossPercent,
        peRatio: priceData.peRatio,
        dividendYield: priceData.dividendYield,
        dayHigh: priceData.dayHigh,
        dayLow: priceData.dayLow,
      },
    });

    this.logger.log('created price record ' + refreshedData.id);

    return {
      id: refreshedData.id,
      stockId: refreshedData.stockId,
      currentPrice: refreshedData.currentPrice,
      presentValue: refreshedData.presentValue,
      gainLoss: refreshedData.gainLoss,
      gainLossPercent: refreshedData.gainLossPercent,
      peRatio: refreshedData.peRatio,
      dividendYield: refreshedData.dividendYield,
      dayHigh: refreshedData.dayHigh,
      dayLow: refreshedData.dayLow,
      timestamp: refreshedData.timestamp,
      stock: {
        symbol: stock.symbol,
        name: stock.name,
        sector: stock.sector,
      },
    };
  }

  async getLatest(stockId: number, userId: number) {
    this.logger.log('getting latest record for: ' + stockId);

    const stock = await this.prisma.stock.findFirst({
      where: { id: stockId, userId: userId },
    });

    if (!stock) {
      throw new ForbiddenException('access denied');
    }

    const updatedData = await this.prisma.priceData.findFirst({
      where: { stockId: stockId },
      orderBy: { timestamp: 'desc' },
      take: 1,
    });

    if (!updatedData) {
      this.logger.log('no data found');
      return null;
    }

    const now = Date.now();
    const recordTime = updatedData.timestamp.getTime();
    const ageSeconds = Math.floor((now - recordTime) / 1000);

    const isFresh = ageSeconds < 60;

    // console.log('age: ' + ageSeconds + 's, fresh: ' + isFresh);

    return {
      id: updatedData.id,
      stockId: updatedData.stockId,
      currentPrice: updatedData.currentPrice,
      presentValue: updatedData.presentValue,
      gainLoss: updatedData.gainLoss,
      gainLossPercent: updatedData.gainLossPercent,
      peRatio: updatedData.peRatio,
      dividendYield: updatedData.dividendYield,
      dayHigh: updatedData.dayHigh,
      dayLow: updatedData.dayLow,
      timestamp: updatedData.timestamp,
      ageSeconds: ageSeconds,
      isFresh: isFresh,
    };
  }

  async getHistory(stockId: number, startDate: Date, endDate: Date, userId: number) {
    this.logger.log('fetching history for stock: ' + stockId);
    this.logger.log('date range: ' + startDate.toISOString() + ' to ' + endDate.toISOString());

    const stock = await this.prisma.stock.findFirst({
      where: { id: stockId, userId: userId },
    });

    if (!stock) {
      throw new ForbiddenException('access denied');
    }

    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    this.logger.log('querying from ' + startDate.toISOString() + ' to ' + endOfDay.toISOString());

    const history = await this.prisma.priceData.findMany({
      where: {
        stockId: stockId,
        timestamp: {
          gte: startDate,
          lte: endOfDay,
        },
      },
      orderBy: { timestamp: 'asc' },
      take: 1000,
    });

    this.logger.log('found: ' + history.length + ' records');

    if (history.length === 0) {
      this.logger.warn('no price data found');
      return {
        data: [],
        metrics: {
          periodReturn: null,
          highPrice: null,
          lowPrice: null,
          bestGain: null,
          worstGain: null,
          points: 0,
        },
      };
    }

    const firstValue = history[0].presentValue;
    const lastValue = history[history.length - 1].presentValue;

    const periodReturn = this.calculations.calculatePeriodReturn(firstValue, lastValue);

    let highPrice = history[0].currentPrice;
    let lowPrice = history[0].currentPrice;
    let bestGain = history[0].gainLossPercent || 0;
    let worstGain = history[0].gainLossPercent || 0;

    for (const record of history) {
      if (record.currentPrice > highPrice) highPrice = record.currentPrice;
      if (record.currentPrice < lowPrice) lowPrice = record.currentPrice;

      const gain = record.gainLossPercent || 0;
      if (gain > bestGain) bestGain = gain;
      if (gain < worstGain) worstGain = gain;
    }

    this.logger.log('period return: ' + periodReturn);

    return {
      data: history,
      metrics: {
        periodReturn: periodReturn,
        highPrice: highPrice,
        lowPrice: lowPrice,
        bestGain: bestGain,
        worstGain: worstGain,
        points: history.length,
      },
    };
  }

  async bulkRefresh(userId: number) {
    const startTime = Date.now();
    this.logger.log('bulk refresh for user: ' + userId);

    const stocks = await this.prisma.stock.findMany({
      where: { userId: userId },
      select: {
        id: true,
        symbol: true,
        purchasePrice: true,
        quantity: true,
        investment: true,
      },
    });

    this.logger.log('found ' + stocks.length + ' stocks');

    const symbols = stocks.map(s => s.symbol);

    // console.log('symbols:', symbols);

    const batchPrices = [];

    const records = [];
    const failedSymbols = [];

    for (const symbol of symbols) {
      const priceData = await this.stockPriceService.fetchCurrentPrice(symbol);
      if (priceData) {
        batchPrices.push(priceData);
      }
      await new Promise(r => setTimeout(r, 200));
    }
    this.logger.log('fetched ' + batchPrices.length + ' prices');

    for (const stock of stocks) {
      const priceData = batchPrices.find(p => p.symbol === stock.symbol);

      if (priceData) {
        const metrics = this.calculations.calculateMetrics(
          stock.purchasePrice,
          stock.quantity,
          priceData.currentPrice,
        );

        const recordData = {
          stockId: stock.id,
          currentPrice: priceData.currentPrice,
          presentValue: metrics.presentValue,
          gainLoss: metrics.gainLoss,
          gainLossPercent: metrics.gainLossPercent,
          peRatio: priceData.peRatio,
          dividendYield: priceData.dividendYield,
          dayHigh: priceData.dayHigh,
          dayLow: priceData.dayLow,
        };

        records.push(recordData);
      } else {
        failedSymbols.push(stock.symbol);
      }
    }

    // console.log('inserting ' + records.length + ' records');

    if (records.length > 0) {
      await this.prisma.priceData.createMany({
        data: records,
      });
    }

    const endTime = Date.now();
    const durationMs = endTime - startTime;
    const duration = (durationMs / 1000).toFixed(1) + 's';

    this.logger.log('done in ' + duration);

    return {
      updated: records.length,
      failed: failedSymbols.length,
      total: stocks.length,
      duration: duration,
      failedSymbols: failedSymbols,
    };
  }

  async cleanup(daysToKeep = 90) {
    this.logger.log('cleanup: keeping ' + daysToKeep + ' days');

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);

    this.logger.log('cutoff: ' + cutoff);

    const result = await this.prisma.priceData.deleteMany({
      where: {
        timestamp: {
          lt: cutoff,
        },
      },
    });

    this.logger.log('deleted ' + result.count + ' records');

    return {
      deleted: result.count,
      cutoffDate: cutoff,
    };
  }
}

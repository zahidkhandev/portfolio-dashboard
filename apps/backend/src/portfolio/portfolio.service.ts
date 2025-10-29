// portfolio.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PortfolioService {
  private logger: Logger;

  constructor(private prisma: PrismaService) {
    this.logger = new Logger(PortfolioService.name);
  }

  async getUserPortfolio(userId: number) {
    this.logger.log('getting portfolio for: ' + userId);

    const stocks = await this.prisma.stock.findMany({
      where: { userId: userId },
      include: {
        priceData: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    // const totalInvestment = stocks.reduce((sum, stock) => sum + stock.investment, 0);
    let totalInvestment = 0;
    let currentValue = 0;

    for (const stock of stocks) {
      totalInvestment += stock.investment;

      if (stock.priceData.length > 0) {
        currentValue += stock.priceData[0].presentValue;
      } else {
        // console.log('no price data for: ' + stock.symbol);
        currentValue += stock.investment;
      }
    }

    const totalGainLoss = currentValue - totalInvestment;
    // const totalGainLossPercent = totalInvestment > 0 ? (totalGainLoss / totalInvestment) * 100 : null;
    const totalGainLossPercent =
      totalInvestment > 0
        ? Math.round(((totalGainLoss / totalInvestment) * 100 + Number.EPSILON) * 100) / 100
        : null;

    this.logger.log('total investment: ' + totalInvestment);
    // console.log('current value: ' + currentValue);

    return {
      stocks: stocks,
      totalInvestment: totalInvestment,
      currentValue: currentValue,
      totalGainLoss: totalGainLoss,
      totalGainLossPercent: totalGainLossPercent,
    };
  }

  async calculateTotalInvestment(userId: number) {
    this.logger.log('calculating total investment for: ' + userId);

    // const result = await this.prisma.stock.aggregate({
    //   where: { userId: userId },
    //   _sum: {
    //     investment: true,
    //   },
    // });

    // return result._sum.investment || 0;

    const stocks = await this.prisma.stock.findMany({
      where: { userId: userId },
      select: {
        investment: true,
      },
    });

    let total = 0;
    for (const stock of stocks) {
      total += stock.investment;
    }

    return total;
  }

  async calculateCurrentValue(userId: number) {
    this.logger.log('calculating current value for: ' + userId);

    const stocks = await this.prisma.stock.findMany({
      where: { userId: userId },
      include: {
        priceData: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    let currentValue = 0;

    for (const stock of stocks) {
      if (stock.priceData.length > 0) {
        currentValue += stock.priceData[0].presentValue;
      } else {
        currentValue += stock.investment;
      }
    }

    return currentValue;
  }

  async calculateTotalGainLoss(userId: number) {
    this.logger.log('calculating gain/loss for: ' + userId);

    const totalInvestment = await this.calculateTotalInvestment(userId);
    const currentValue = await this.calculateCurrentValue(userId);

    const gainLoss = currentValue - totalInvestment;
    // const percent = totalInvestment > 0 ? (gainLoss / totalInvestment) * 100 : null;
    const percent =
      totalInvestment > 0
        ? Math.round(((gainLoss / totalInvestment) * 100 + Number.EPSILON) * 100) / 100
        : null;

    return {
      gainLoss: gainLoss,
      percent: percent,
    };
  }

  async getSectorBreakdown(userId: number) {
    this.logger.log('getting sector breakdown for: ' + userId);

    // const grouped = await this.prisma.stock.groupBy({
    //   by: ['sector'],
    //   where: { userId: userId },
    //   _sum: {
    //     investment: true,
    //   },
    //   _count: {
    //     id: true,
    //   },
    // });

    const stocks = await this.prisma.stock.findMany({
      where: { userId: userId },
      include: {
        priceData: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    // const sectorMap = new Map();
    const sectorMap = new Map<string, any>();

    for (const stock of stocks) {
      const sector = stock.sector;

      if (!sectorMap.has(sector)) {
        sectorMap.set(sector, {
          sector: sector,
          stockCount: 0,
          investment: 0,
          currentValue: 0,
          gainLoss: 0,
        });
      }

      const sectorData = sectorMap.get(sector);
      sectorData.stockCount += 1;
      sectorData.investment += stock.investment;

      if (stock.priceData.length > 0) {
        sectorData.currentValue += stock.priceData[0].presentValue;
        sectorData.gainLoss += stock.priceData[0].gainLoss;
      } else {
        sectorData.currentValue += stock.investment;
      }
    }

    const totalInvestment = await this.calculateTotalInvestment(userId);

    // const sectors = Array.from(sectorMap.values()).map(sector => ({
    //   ...sector,
    //   percent: totalInvestment > 0 ? (sector.investment / totalInvestment) * 100 : 0,
    //   gainLossPercent: sector.investment > 0 ? (sector.gainLoss / sector.investment) * 100 : null,
    // }));

    const sectors = [];
    for (const sectorData of sectorMap.values()) {
      const percentOfPortfolio =
        totalInvestment > 0
          ? Math.round(((sectorData.investment / totalInvestment) * 100 + Number.EPSILON) * 100) /
            100
          : 0;

      const sectorGainLossPercent =
        sectorData.investment > 0
          ? Math.round(
              ((sectorData.gainLoss / sectorData.investment) * 100 + Number.EPSILON) * 100,
            ) / 100
          : null;

      sectors.push({
        sector: sectorData.sector,
        stockCount: sectorData.stockCount,
        investment: sectorData.investment,
        currentValue: sectorData.currentValue,
        gainLoss: sectorData.gainLoss,
        percent: percentOfPortfolio,
        gainLossPercent: sectorGainLossPercent,
      });
    }

    this.logger.log('found ' + sectors.length + ' sectors');

    return sectors;
  }

  async getTopPerformers(userId: number, limit = 5) {
    this.logger.log('getting top performers for: ' + userId);

    const stocks = await this.prisma.stock.findMany({
      where: { userId: userId },
      include: {
        priceData: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    // const stocksWithGains = stocks
    //   .filter(stock => stock.priceData.length > 0)
    //   .map(stock => ({
    //     id: stock.id,
    //     symbol: stock.symbol,
    //     name: stock.name,
    //     sector: stock.sector,
    //     purchasePrice: stock.purchasePrice,
    //     currentPrice: stock.priceData[0].currentPrice,
    //     gainLoss: stock.priceData[0].gainLoss,
    //     gainLossPercent: stock.priceData[0].gainLossPercent,
    //     investment: stock.investment,
    //     presentValue: stock.priceData[0].presentValue,
    //   }))
    //   .sort((a, b) => (b.gainLossPercent || 0) - (a.gainLossPercent || 0))
    //   .slice(0, limit);

    const stocksWithGains = [];

    for (const stock of stocks) {
      if (stock.priceData.length > 0) {
        stocksWithGains.push({
          id: stock.id,
          symbol: stock.symbol,
          name: stock.name,
          sector: stock.sector,
          purchasePrice: stock.purchasePrice,
          currentPrice: stock.priceData[0].currentPrice,
          gainLoss: stock.priceData[0].gainLoss,
          gainLossPercent: stock.priceData[0].gainLossPercent,
          investment: stock.investment,
          presentValue: stock.priceData[0].presentValue,
        });
      }
    }

    stocksWithGains.sort((a, b) => {
      const aPercent = a.gainLossPercent || 0;
      const bPercent = b.gainLossPercent || 0;
      return bPercent - aPercent;
    });

    const topStocks = stocksWithGains.slice(0, limit);

    return topStocks;
  }

  async getUnderperformers(userId: number, limit = 5) {
    this.logger.log('getting underperformers for: ' + userId);

    const stocks = await this.prisma.stock.findMany({
      where: { userId: userId },
      include: {
        priceData: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    const stocksWithGains = [];

    for (const stock of stocks) {
      if (stock.priceData.length > 0) {
        stocksWithGains.push({
          id: stock.id,
          symbol: stock.symbol,
          name: stock.name,
          sector: stock.sector,
          purchasePrice: stock.purchasePrice,
          currentPrice: stock.priceData[0].currentPrice,
          gainLoss: stock.priceData[0].gainLoss,
          gainLossPercent: stock.priceData[0].gainLossPercent,
          investment: stock.investment,
          presentValue: stock.priceData[0].presentValue,
        });
      }
    }

    stocksWithGains.sort((a, b) => {
      const aPercent = a.gainLossPercent || 0;
      const bPercent = b.gainLossPercent || 0;
      return aPercent - bPercent;
    });

    const worstStocks = stocksWithGains.slice(0, limit);

    return worstStocks;
  }

  async getFundamentalAverages(userId: number) {
    this.logger.log('calculating fundamental averages for: ' + userId);

    const stocks = await this.prisma.stock.findMany({
      where: { userId: userId },
      include: {
        priceData: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    let totalWeight = 0;
    let weightedPE = 0;
    let weightedEBITDA = 0;
    let weightedDividend = 0;
    let weightedDebtToEquity = 0;
    let weightedPriceToBook = 0;

    let countPE = 0;
    let countEBITDA = 0;
    let countDividend = 0;
    let countDebtToEquity = 0;
    let countPriceToBook = 0;

    for (const stock of stocks) {
      const weight = stock.investment;
      totalWeight += weight;

      if (stock.priceData.length > 0 && stock.priceData[0].peRatio) {
        weightedPE += stock.priceData[0].peRatio * weight;
        countPE++;
      }

      if (stock.ebitdaPercent) {
        weightedEBITDA += stock.ebitdaPercent * weight;
        countEBITDA++;
      }

      if (stock.priceData.length > 0 && stock.priceData[0].dividendYield) {
        weightedDividend += stock.priceData[0].dividendYield * weight;
        countDividend++;
      }

      if (stock.debtToEquity) {
        weightedDebtToEquity += stock.debtToEquity * weight;
        countDebtToEquity++;
      }

      if (stock.priceToBook) {
        weightedPriceToBook += stock.priceToBook * weight;
        countPriceToBook++;
      }
    }

    // const avgPE = totalWeight > 0 ? weightedPE / totalWeight : null;
    // const avgEBITDAMargin = totalWeight > 0 ? weightedEBITDA / totalWeight : null;

    const avgPE =
      countPE > 0 && totalWeight > 0
        ? Math.round((weightedPE / totalWeight + Number.EPSILON) * 100) / 100
        : null;
    const avgEBITDAMargin =
      countEBITDA > 0 && totalWeight > 0
        ? Math.round((weightedEBITDA / totalWeight + Number.EPSILON) * 100) / 100
        : null;
    const avgDividendYield =
      countDividend > 0 && totalWeight > 0
        ? Math.round((weightedDividend / totalWeight + Number.EPSILON) * 100) / 100
        : null;
    const avgDebtToEquity =
      countDebtToEquity > 0 && totalWeight > 0
        ? Math.round((weightedDebtToEquity / totalWeight + Number.EPSILON) * 100) / 100
        : null;
    const avgPriceToBook =
      countPriceToBook > 0 && totalWeight > 0
        ? Math.round((weightedPriceToBook / totalWeight + Number.EPSILON) * 100) / 100
        : null;

    this.logger.log('avg PE: ' + avgPE);
    // console.log('countEBITDA: ' + countEBITDA);
    // console.log('countDebtToEquity: ' + countDebtToEquity);

    return {
      avgPE: avgPE,
      avgEBITDAMargin: avgEBITDAMargin,
      avgDividendYield: avgDividendYield,
      avgDebtToEquity: avgDebtToEquity,
      avgPriceToBook: avgPriceToBook,
    };
  }

  async getPortfolioMetrics(userId: number) {
    this.logger.log('getting complete portfolio metrics for: ' + userId);

    // const portfolio = await this.getUserPortfolio(userId);
    // const sectorBreakdown = await this.getSectorBreakdown(userId);
    // const topGainers = await this.getTopPerformers(userId, 5);
    // const topLosers = await this.getUnderperformers(userId, 5);
    // const fundamentalAverages = await this.getFundamentalAverages(userId);

    const [portfolio, sectorBreakdown, topGainers, topLosers, fundamentalAverages] =
      await Promise.all([
        this.getUserPortfolio(userId),
        this.getSectorBreakdown(userId),
        this.getTopPerformers(userId, 5),
        this.getUnderperformers(userId, 5),
        this.getFundamentalAverages(userId),
      ]);

    return {
      totalInvestment: portfolio.totalInvestment,
      currentValue: portfolio.currentValue,
      totalGainLoss: portfolio.totalGainLoss,
      totalGainLossPercent: portfolio.totalGainLossPercent,
      stockCount: portfolio.stocks.length,
      sectors: sectorBreakdown,
      fundamentalAverages: fundamentalAverages,
      topGainers: topGainers,
      topLosers: topLosers,
    };
  }
}

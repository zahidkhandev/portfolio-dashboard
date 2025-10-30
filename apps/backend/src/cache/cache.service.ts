import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PriceCacheService {
  private logger: Logger;

  constructor(private prisma: PrismaService) {
    this.logger = new Logger(PriceCacheService.name);
  }

  async getCached(symbol: string) {
    const cached = await this.prisma.priceCache.findUnique({
      where: { symbol: symbol },
    });

    // console.log(cached);

    if (!cached) {
      return null;
    }

    const now = new Date();
    // const isExpired = now.getTime() > cached.expiresAt.getTime();
    if (now > cached.expiresAt) {
      console.log('cache expired, delete cache', symbol);
      await this.prisma.priceCache.delete({ where: { symbol: symbol } });
      return null;
    }

    return cached;
  }

  async setCache(
    symbol: string,
    currentPrice: number,
    peRatio: number | null,
    marketCap: string | null,
    additionalData?: {
      dividendYield?: number | null;
      dayHigh?: number | null;
      dayLow?: number | null;
      avgVolume?: string | null;
      peRatioTTM?: number | null;
      priceToBook?: number | null;
      bookValue?: number | null;
      debtToEquity?: number | null;
      revenueTTM?: number | null;
      ebitdaTTM?: number | null;
      profitMargin?: number | null;
      operatingMargin?: number | null;
      returnOnEquity?: number | null;
      returnOnAssets?: number | null;
      sector?: string | null;
      industry?: string | null;
      prevClose?: number | null;
      dayRange?: string | null;
      yearRange?: string | null;
    },
  ) {
    this.logger.log('setting cache for: ' + symbol);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 1);

    await this.prisma.priceCache.upsert({
      where: { symbol: symbol },
      update: {
        currentPrice: currentPrice,
        peRatio: peRatio,
        marketCap: marketCap,
        cachedAt: new Date(),
        expiresAt: expiresAt,
        dividendYield: additionalData?.dividendYield || null,
        dayHigh: additionalData?.dayHigh || null,
        dayLow: additionalData?.dayLow || null,
        avgVolume: additionalData?.avgVolume || null,
        peRatioTTM: additionalData?.peRatioTTM || null,
        priceToBook: additionalData?.priceToBook || null,
        bookValue: additionalData?.bookValue || null,
        debtToEquity: additionalData?.debtToEquity || null,
        revenueTTM: additionalData?.revenueTTM || null,
        ebitdaTTM: additionalData?.ebitdaTTM || null,
        profitMargin: additionalData?.profitMargin || null,
        operatingMargin: additionalData?.operatingMargin || null,
        returnOnEquity: additionalData?.returnOnEquity || null,
        returnOnAssets: additionalData?.returnOnAssets || null,
        sector: additionalData?.sector || null,
        industry: additionalData?.industry || null,
        prevClose: additionalData?.prevClose || null,
        dayRange: additionalData?.dayRange || null,
        yearRange: additionalData?.yearRange || null,
      },
      create: {
        symbol: symbol,
        currentPrice: currentPrice,
        peRatio: peRatio,
        marketCap: marketCap,
        expiresAt: expiresAt,
        dividendYield: additionalData?.dividendYield || null,
        dayHigh: additionalData?.dayHigh || null,
        dayLow: additionalData?.dayLow || null,
        avgVolume: additionalData?.avgVolume || null,
        peRatioTTM: additionalData?.peRatioTTM || null,
        priceToBook: additionalData?.priceToBook || null,
        bookValue: additionalData?.bookValue || null,
        debtToEquity: additionalData?.debtToEquity || null,
        revenueTTM: additionalData?.revenueTTM || null,
        ebitdaTTM: additionalData?.ebitdaTTM || null,
        profitMargin: additionalData?.profitMargin || null,
        operatingMargin: additionalData?.operatingMargin || null,
        returnOnEquity: additionalData?.returnOnEquity || null,
        returnOnAssets: additionalData?.returnOnAssets || null,
        sector: additionalData?.sector || null,
        industry: additionalData?.industry || null,
        prevClose: additionalData?.prevClose || null,
        dayRange: additionalData?.dayRange || null,
        yearRange: additionalData?.yearRange || null,
      },
    });
  }

  async deleteCache(symbol: string) {
    try {
      await this.prisma.priceCache.delete({ where: { symbol } });
      console.log('deleted cache:', symbol);
      return { message: 'Cache cleared' };
    } catch (err) {
      // console.log(err);
      // console.log(err.message);

      this.logger.error('delete failed for ' + symbol, err);
      // throw err;

      return { message: 'Failed to clear cache' };
    }
  }

  async resetCompleteCache() {
    this.logger.warn('nuking everything...');
    const result = await this.prisma.priceCache.deleteMany({});
    console.log('wiped', result.count, 'entries');
    return { deleted: result.count };
  }
}

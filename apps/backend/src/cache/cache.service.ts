import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PriceCacheService {
  constructor(private prisma: PrismaService) {}

  async getCached(symbol: string) {
    const cached = await this.prisma.priceCache.findUnique({
      where: { symbol: symbol },
    });

    if (!cached) {
      return null;
    }

    const now = new Date();

    if (now > cached.expiresAt) {
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
  ) {
    const now = new Date();

    const expiresAt = new Date(now.getTime() + 60000); // cache expires in 60 seconds

    const upsertedPriceCache = this.prisma.priceCache.upsert({
      where: { symbol },

      create: {
        symbol,
        currentPrice,
        peRatio,
        marketCap,
        expiresAt,
      },

      update: {
        currentPrice,
        peRatio,
        marketCap,
        cachedAt: now,
        expiresAt,
      },
    });

    return upsertedPriceCache;
  }

  async deleteCache(symbol: string) {
    await this.prisma.priceCache.delete({ where: { symbol } });
    return { message: 'Cache cleared' };
  }

  async resetCompleteCache() {
    const result = await this.prisma.priceCache.deleteMany({});
    return { deleted: result.count };
  }
}

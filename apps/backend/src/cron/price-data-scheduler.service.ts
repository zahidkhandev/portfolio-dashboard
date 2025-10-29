import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PriceDataService } from '../price-data/price-data.service';

@Injectable()
export class PriceDataSchedulerService {
  private logger = new Logger(PriceDataSchedulerService.name);

  constructor(
    private priceDataService: PriceDataService,
    private prisma: PrismaService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async refreshAllUsersPrices() {
    this.logger.log('scheduled refresh started');

    try {
      const users = await this.prisma.user.findMany({
        select: { id: true, username: true },
      });

      for (const user of users) {
        this.logger.log(`refreshing prices for user: ${user.username}`);
        await this.priceDataService.bulkRefresh(user.id);
      }

      this.logger.log('scheduled refresh completed');
    } catch (error) {
      this.logger.error('scheduled refresh failed:', error);
    }
  }
}

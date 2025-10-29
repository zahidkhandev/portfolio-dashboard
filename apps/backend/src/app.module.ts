import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AccessTokenGuard } from './common/guards/auth';
import { StockModule } from './stock/stock.module';
import { PriceCacheModule } from './cache/cache.module';
import { StockPriceModule } from './stock-price/stock-price.module';
import { PriceDataModule } from './price-data/price-data.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    StockModule,
    PriceCacheModule,
    StockPriceModule,
    PriceDataModule,
    PortfolioModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AccessTokenGuard,
    },
  ],
})
export class AppModule {}

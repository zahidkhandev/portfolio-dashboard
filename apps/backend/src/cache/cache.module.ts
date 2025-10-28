import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PriceCacheService } from './cache.service';
import { PriceCacheController } from './cache.controller';

@Module({
  imports: [PrismaModule],
  providers: [PriceCacheService],
  controllers: [PriceCacheController],
  exports: [PriceCacheService],
})
export class PriceCacheModule {}

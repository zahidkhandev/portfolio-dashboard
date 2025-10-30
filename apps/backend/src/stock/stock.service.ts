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
}

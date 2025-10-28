import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  async createStock(userId: string, dto: CreateStockDto) {
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

  async getUserStock(userId: string) {
    const userStocks = await this.prisma.stock.findMany({
      where: {
        userId: userId,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });

    return userStocks;
  }

  async getStockyId(userId: string, stockId: string) {
    const stock = await this.prisma.stock.findFirst({
      where: {
        id: stockId,
        userId: userId,
      },
    });

    if (!stock) {
      throw new NotFoundException(
        "Stock wasn't found or this particular stock does not belong to this user",
      );
    }

    return stock;
  }

  async updateStock(userId: string, stockId: string, dto: UpdateStockDto) {
    const stock = await this.prisma.stock.findFirst({
      where: {
        id: stockId,
        userId: userId,
      },
    });

    if (!stock) {
      throw new NotFoundException(
        "Stock wasn't found or this particular stock does not belong to this user",
      );
    }

    const updatedTotalInvestment =
      dto.purchasePrice && dto.quantity ? dto.purchasePrice * dto.quantity : undefined;

    const updatedStock = await this.prisma.stock.update({
      where: { id: stockId },
      data: {
        ...dto,
        investment: updatedTotalInvestment != undefined ? updatedTotalInvestment : stock.investment,
      },
    });

    return updatedStock;
  }

  async deleteStock(userId: string, stockId: string) {
    const stock = await this.prisma.stock.findFirst({
      where: {
        id: stockId,
        userId: userId,
      },
    });

    if (!stock) {
      throw new NotFoundException(
        "Stock wasn't found or this particular stock does not belong to this user",
      );
    }

    await this.prisma.stock.delete({
      where: {
        id: stockId,
      },
    });

    return { message: 'Stock deleted successfully' };
  }

  async getStocksBySymbol(userId: string, symbol: string) {
    const stock = await this.prisma.stock.findMany({
      where: {
        userId,
        symbol: { contains: symbol, mode: 'insensitive' },
      },
    });

    return stock;
  }

  async getStocksBySector(userId: string, sector: string) {
    const stocks = await this.prisma.stock.findMany({
      where: { userId, sector },
      orderBy: { createdAt: 'desc' },
    });

    return stocks;
  }
}

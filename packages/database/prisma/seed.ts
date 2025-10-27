import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const hashedPassword = await bcrypt.hash('demo', 10);

  const user = await prisma.user.upsert({
    where: { username: 'demo' },
    update: {},
    create: {
      username: 'demo',
      password: hashedPassword,
      email: 'demo@portfolio.com',
    },
  });

  console.log('Created demo user:', user.username);

  const stocks = [
    {
      symbol: 'HDFCBANK.NS',
      name: 'HDFC Bank',
      sector: 'Financial Sector',
      purchasePrice: 1490,
      quantity: 50,
      investment: 74500,
      portfolioPercent: 5,
      exchange: 'NSE',
      peRatioTTM: 18.5,
      marketCap: '12,00,000 Cr',
      latestEarnings: 69181,
      revenueTTM: 321990,
    },
    {
      symbol: 'BAJFINANCE.NS',
      name: 'Bajaj Finance',
      sector: 'Financial Sector',
      purchasePrice: 6466,
      quantity: 15,
      investment: 96990,
      portfolioPercent: 6,
      exchange: 'NSE',
      peRatioTTM: 32.1,
      marketCap: '4,00,000 Cr',
      latestEarnings: 15375,
      revenueTTM: 62279,
    },
    {
      symbol: 'ICICIBANK.NS',
      name: 'ICICI Bank',
      sector: 'Financial Sector',
      purchasePrice: 1143,
      quantity: 70,
      investment: 80010,
      portfolioPercent: 5,
      exchange: 'NSE',
      peRatioTTM: 15.2,
    },
    {
      symbol: 'INFY.NS',
      name: 'Infosys',
      sector: 'Tech Sector',
      purchasePrice: 1450,
      quantity: 100,
      investment: 145000,
      portfolioPercent: 9,
      exchange: 'NSE',
      peRatioTTM: 24.5,
    },
    {
      symbol: 'TCS.NS',
      name: 'TCS',
      sector: 'Tech Sector',
      purchasePrice: 3500,
      quantity: 30,
      investment: 105000,
      portfolioPercent: 7,
      exchange: 'NSE',
      peRatioTTM: 28.3,
    },
    {
      symbol: 'DMART.NS',
      name: 'DMart',
      sector: 'Consumer Sector',
      purchasePrice: 3800,
      quantity: 25,
      investment: 95000,
      portfolioPercent: 6,
      exchange: 'NSE',
      peRatioTTM: 65.2,
    },
    {
      symbol: 'TATAPOWER.NS',
      name: 'Tata Power',
      sector: 'Power Sector',
      purchasePrice: 245,
      quantity: 200,
      investment: 49000,
      portfolioPercent: 3,
      exchange: 'NSE',
      peRatioTTM: 22.1,
    },
    {
      symbol: 'POLYCAB.NS',
      name: 'Polycab',
      sector: 'Pipe Sector',
      purchasePrice: 5200,
      quantity: 20,
      investment: 104000,
      portfolioPercent: 7,
      exchange: 'NSE',
      peRatioTTM: 28.9,
    },
  ];

  for (const stockData of stocks) {
    await prisma.stock.upsert({
      where: {
        userId_symbol: {
          userId: user.id,
          symbol: stockData.symbol,
        },
      },
      update: {},
      create: {
        userId: user.id,
        ...stockData,
      },
    });
  }

  console.log('Created', stocks.length, 'stocks');
  console.log('Seeding complete!');
}

main()
  .catch(e => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

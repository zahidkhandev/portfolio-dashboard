export interface User {
  id: number;
  username: string;
  email: string;
}

export interface Stock {
  id: number;
  symbol: string;
  name: string;
  sector: string;
  purchasePrice: number;
  quantity: number;
  investment: number;
  portfolioPercent: number;
  exchange: 'NSE' | 'BSE';
  marketCap?: string;
  peRatioTTM?: number;
  priceData?: PriceData[];
}

export interface PriceData {
  id: number;
  stockId: number;
  currentPrice: number;
  presentValue: number;
  gainLoss: number;
  gainLossPercent: number;
  peRatio?: number;
  dividendYield?: number;
  dayHigh?: number;
  dayLow?: number;
  timestamp: Date;
}

export interface PortfolioMetrics {
  totalInvestment: number;
  currentValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  stockCount: number;
  sectors: SectorBreakdown[];
  fundamentalAverages: FundamentalAverages;
  topGainers: StockPerformance[];
  topLosers: StockPerformance[];
}

export interface SectorBreakdown {
  sector: string;
  stockCount: number;
  investment: number;
  currentValue: number;
  gainLoss: number;
  percent: number;
  gainLossPercent: number;
}

export interface FundamentalAverages {
  avgPE: number | null;
  avgEBITDAMargin: number | null;
  avgDividendYield: number | null;
  avgDebtToEquity: number | null;
  avgPriceToBook: number | null;
}

export interface StockPerformance {
  id: number;
  symbol: string;
  name: string;
  sector: string;
  purchasePrice: number;
  currentPrice: number;
  gainLoss: number;
  gainLossPercent: number;
  investment: number;
  presentValue: number;
}

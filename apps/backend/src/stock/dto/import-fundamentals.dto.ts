export class ImportFundamentalsDto {
  symbol!: string;
  revenueTTM?: number;
  ebitdaTTM?: number;
  ebitdaPercent?: number;
  pat?: number;
  patPercent?: number;
  cfoMarch24?: number;
  cfo5Years?: number;
  freeCashFlow5Years?: number;
  debtToEquity?: number;
  bookValue?: number;
  priceToBook?: number;
  priceToSales?: number;
  revenueGrowth3Y?: number;
  ebitdaGrowth3Y?: number;
  profitGrowth3Y?: number;
  marketCapGrowth3Y?: number;
  cfoToEbitda?: number;
  cfoToPat?: number;
  stage2?: string;
  latestEarnings?: number;
}

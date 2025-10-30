import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';
import * as cheerio from 'cheerio';
import { PriceCacheService } from '../cache/cache.service';
import YahooFinance from 'yahoo-finance2';

@Injectable()
export class StockPriceService {
  private logger: Logger;
  private readonly defaultHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  };
  private readonly defaultTimeout = 15000;
  private yahooFinance: InstanceType<typeof YahooFinance>;

  constructor(private cacheService: PriceCacheService) {
    this.logger = new Logger(StockPriceService.name);

    this.yahooFinance = new YahooFinance();
    // this.logger.log('service ready');
  }

  private axiosConfig(customHeaders?: Record<string, string>): AxiosRequestConfig {
    const config: AxiosRequestConfig = {
      headers: customHeaders || this.defaultHeaders,
      timeout: this.defaultTimeout,
    };

    return config;
  }

  private convertToGoogleSymbol(symbol: string): string {
    return symbol.replace('.NS', ':NSE').replace('.BO', ':BOM');
  }

  private parseNumber(text: string | null): number | null {
    if (!text) return null;
    const cleaned = text.replace(/[^\d.]/g, '');
    const val = parseFloat(cleaned);
    if (isNaN(val)) return null;
    return val;
  }

  private findGoogleMetric(cheerio: cheerio.CheerioAPI, label: string): string | null {
    let value: string | null = null;

    // html('div.P6K39c').each((i, elem) => {
    cheerio('div.mfs7Fc').each((i, elem) => {
      if (cheerio(elem).text() === label) {
        // value = html(elem).closest('div.mfs7Fc').find('div.P6K39c').text();
        value = cheerio(elem).closest('div.gyFHrc').find('div.P6K39c').text();
        return false;
      }
    });

    return value;
  }

  async fetchCurrentPrice(symbol: string) {
    this.logger.log('checking cache for ' + symbol);

    const cached = await this.getFromCache(symbol);
    if (cached) {
      this.logger.log('got from cache: ' + symbol);
      return cached;
    }

    this.logger.log('fetching fresh data for ' + symbol);
    const priceData = await this.getPriceFromGoogle(symbol);

    if (priceData) {
      this.logger.log('fetched ' + symbol + ' at ' + priceData.currentPrice);
      return priceData;
    }

    this.logger.warn('couldnt fetch ' + symbol);
    return null;
  }

  // async getPriceFromGoogle(symbol: string) {
  //   try {
  //     const googleSymbol = this.toGoogleSymbol(symbol);
  //     const url = `https://www.google.com/finance/quote/${googleSymbol}`;

  //     this.logger.log('hitting google: ' + url);

  //     const response = await axios.get(url, this.axiosConfig());
  //     // console.log(response);
  //     this.logger.log('got response for ' + symbol);

  //     const doc = cheerio.load(response.data);
  //     // const priceText = html('div.price').first().text();
  //     // const priceText = html('div.p29Ibb').first().text();
  //     // const priceText = html('div.NydbP.VOXKNe').first().text();
  //     // const priceText = html('div.NydbP.nZQ6l').first().text();
  //     const priceText = doc('div.YMlKec.fxKbKc').first().text();

  //     this.logger.log('raw price: ' + priceText);

  //     const price = this.parseNumber(priceText) || 0;

  //     if (price === 0) {
  //       this.logger.warn('price is zero for ' + symbol);
  //       return null;
  //     }

  //     // const peRatioText = this.getGoogleMetric(html, 'PE ratio');
  //     // const peRatioText = this.getGoogleMetric(html, 'ratio');
  //     const rawPE = this.findGoogleMetric(doc, 'P/E ratio');
  //     const marketCapString = this.findGoogleMetric(doc, 'Market cap');
  //     const rawDividend = this.findGoogleMetric(doc, 'Dividend yield');
  //     const dayHighExtracted = this.findGoogleMetric(doc, 'High');
  //     const dayLowExtracted = this.findGoogleMetric(doc, 'Low');

  //     this.logger.log('pe=' + rawPE + ', marketCap=' + marketCapString);

  //     const peRatio = this.parseNumber(rawPE);
  //     const dividend = this.parseNumber(rawDividend);

  //     this.logger.log('saving to cache');
  //     await this.cacheService.setCache(symbol, price, peRatio, marketCapString);

  //     return {
  //       symbol,
  //       currentPrice: price,
  //       peRatio,
  //       marketCap: marketCapString,
  //       cached: false,
  //       dividendYield: dividend,
  //       timestamp: new Date(),
  //       dayHigh: this.parseNumber(dayHighExtracted),
  //       dayLow: this.parseNumber(dayLowExtracted),
  //       // avgVolume: this.getGoogleMetric(html, 'Volume'),
  //       avgVolume: this.findGoogleMetric(doc, 'Avg Volume'),
  //     };
  //   } catch (err) {
  //     const error = err as Error;
  //     this.logger.error('google failed: ' + error.message);
  //     return null;
  //   }
  // }

  async getPriceFromGoogle(symbol: string) {
    try {
      const googleSymbol = this.convertToGoogleSymbol(symbol);
      const url = `https://www.google.com/finance/quote/${googleSymbol}`;

      this.logger.log('hitting google: ' + url);

      // const response = await axios.get(url);

      const response = await axios.get(url, this.axiosConfig());

      this.logger.log('got response for ' + symbol);

      const doc = cheerio.load(response.data);
      const priceText = doc('div.YMlKec.fxKbKc').first().text();

      this.logger.log('raw price: ' + priceText);

      const price = this.parseNumber(priceText) || 0;

      if (price === 0) {
        this.logger.warn('price is zero for ' + symbol);
        return null;
      }

      const rawPE = this.findGoogleMetric(doc, 'P/E ratio');
      const marketCapString = this.findGoogleMetric(doc, 'Market cap');
      const rawDividend = this.findGoogleMetric(doc, 'Dividend yield');

      this.logger.log('pe=' + rawPE + ', marketCap=' + marketCapString + ', div=' + rawDividend);

      const peRatio = this.parseNumber(rawPE);
      const dividend = this.parseNumber(rawDividend);

      let dayHigh: number | null = null;
      let dayLow: number | null = null;

      try {
        const today = new Date();
        const todayHistorical = await this.yahooFinance.historical(symbol, {
          period1: today,
          period2: today,
          interval: '1d',
        });

        if (todayHistorical && todayHistorical.length > 0) {
          const todayData = todayHistorical[0];
          dayHigh = todayData.high;
          dayLow = todayData.low;
          this.logger.log('yahoo today: high=' + dayHigh + ', low=' + dayLow);
        }
      } catch (yahooErr) {
        this.logger.warn('failed to get today high/low from yahoo');
      }

      this.logger.log('saving to cache');
      await this.cacheService.setCache(symbol, price, peRatio, marketCapString, {
        dividendYield: dividend,
        dayHigh: dayHigh || null,
        dayLow: dayLow || null,
      });

      return {
        symbol,
        currentPrice: price,
        peRatio,
        marketCap: marketCapString,
        cached: false,
        dividendYield: dividend,
        timestamp: new Date(),
        dayHigh: dayHigh,
        dayLow: dayLow,
        avgVolume: this.findGoogleMetric(doc, 'Avg Volume'),
      };
    } catch (err) {
      const error = err as Error;
      this.logger.error('google failed: ' + error.message);
      return null;
    }
  }

  async fetchHistoricalPrices(symbol: string, startDate?: Date, endDate?: Date) {
    this.logger.log('fetching historical data for ' + symbol);

    try {
      const defaultStart = new Date();
      defaultStart.setDate(defaultStart.getDate() - 30);
      const start = startDate || defaultStart;
      const end = endDate || new Date();

      const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      let interval: '1d' | '1wk' | '1mo' = '1d';
      if (daysDiff <= 90) {
        interval = '1d';
      } else if (daysDiff <= 365) {
        interval = '1wk';
      } else {
        interval = '1mo';
      }

      this.logger.log(`using interval: ${interval} for ${daysDiff} days`);

      const result = await this.yahooFinance.historical(symbol, {
        period1: start,
        period2: end,
        interval: interval,
      });

      const historicalData = [];
      for (const item of result) {
        historicalData.push({
          date: item.date,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume,
        });
      }

      this.logger.log(`fetched ${historicalData.length} data points`);

      return historicalData;
    } catch (err) {
      this.logger.error('historical fetch failed: ' + (err as Error).message);
      return null;
    }
  }

  async fetchFundamentals(symbol: string) {
    this.logger.log('getting fundamentals for ' + symbol);

    const cached = await this.getFundamentalsFromCache(symbol);
    if (cached) {
      this.logger.log('got fundamentals from cache: ' + symbol);
      return { ...cached, cached: true };
    }

    try {
      const googleSymbol = this.convertToGoogleSymbol(symbol);

      const [googleData, yahooData] = await Promise.all([
        this.parseGoogle(googleSymbol),
        this.parseYahoo(symbol),
      ]);

      if (!googleData && !yahooData) {
        this.logger.warn('no data found');
        return null;
      }

      const fundamentals = { ...googleData, ...yahooData };

      await this.saveFundamentalsToCache(symbol, fundamentals);

      return { ...fundamentals, cached: false };
    } catch (err: any) {
      this.logger.error(`fundamentals failed: ${err.message}`);
      return null;
    }
  }

  async getFromCache(symbol: string) {
    const cached = await this.cacheService.getCached(symbol);

    if (!cached) return null;

    const now = Date.now();
    const cachedTime = new Date(cached.cachedAt).getTime();
    const age = Math.floor((now - cachedTime) / 1000);
    this.logger.log('cache age: ' + age + 's');

    // return {
    //   symbol: cached.symbol,
    //   currentPrice: cached.currentPrice,
    //   peRatio: cached.peRatio,
    //   marketCap: cached.marketCap,
    //   cached: true,
    // };

    return {
      symbol: cached.symbol,
      currentPrice: cached.currentPrice,
      peRatio: cached.peRatio,
      marketCap: cached.marketCap,
      dividendYield: cached.dividendYield,
      dayHigh: cached.dayHigh,
      dayLow: cached.dayLow,
      avgVolume: cached.avgVolume,
      timestamp: cached.cachedAt,
      cached: true,
    };
  }

  async getFundamentalsFromCache(symbol: string) {
    const cached = await this.cacheService.getCached(symbol);

    if (!cached) {
      return null;
    }

    const ageInSeconds = Math.floor((Date.now() - new Date(cached.cachedAt).getTime()) / 1000);
    this.logger.log('fundamentals cache age: ' + ageInSeconds + 's');

    return {
      peRatio: cached.peRatio,
      dividendYield: cached.dividendYield,
      prevClose: cached.prevClose,
      dayRange: cached.dayRange,
      yearRange: cached.yearRange,
      marketCap: cached.marketCap,
      avgVolume: cached.avgVolume,
      peRatioTTM: cached.peRatioTTM,
      priceToBook: cached.priceToBook,
      bookValue: cached.bookValue,
      debtToEquity: cached.debtToEquity,
      revenueTTM: cached.revenueTTM,
      ebitdaTTM: cached.ebitdaTTM,
      profitMargin: cached.profitMargin,
      operatingMargin: cached.operatingMargin,
      returnOnEquity: cached.returnOnEquity,
      returnOnAssets: cached.returnOnAssets,
      sector: cached.sector,
      industry: cached.industry,
    };
  }

  async saveFundamentalsToCache(symbol: string, data: any) {
    await this.cacheService.setCache(symbol, data.currentPrice || 0, data.peRatio, data.marketCap, {
      dividendYield: data.dividendYield,
      dayHigh: data.dayHigh,
      dayLow: data.dayLow,
      avgVolume: data.avgVolume,
      peRatioTTM: data.peRatioTTM,
      priceToBook: data.priceToBook,
      bookValue: data.bookValue,
      debtToEquity: data.debtToEquity,
      revenueTTM: data.revenueTTM,
      ebitdaTTM: data.ebitdaTTM,
      profitMargin: data.profitMargin,
      operatingMargin: data.operatingMargin,
      returnOnEquity: data.returnOnEquity,
      returnOnAssets: data.returnOnAssets,
      sector: data.sector,
      industry: data.industry,
      prevClose: data.prevClose,
      dayRange: data.dayRange,
      yearRange: data.yearRange,
    });
  }

  async parseYahoo(symbol: string) {
    this.logger.log('trying yahoo finance2');

    try {
      // import yahooFinance from 'yahoo-finance2';
      // await yahooFinance.quoteSummary(symbol, {
      //   modules: [
      //     'summaryDetail',
      //     'defaultKeyStatistics',
      //     'financialData',
      //     'price',
      //     'summaryProfile',
      //     'assetProfile',
      //   ],
      // });
      // const result = await this.yahooFinance.quoteSummary(symbol, {
      //   modules: ['summaryDetail', 'defaultKeyStatistics'],
      // });

      const result = await this.yahooFinance.quoteSummary(symbol, {
        modules: [
          'summaryDetail',
          'defaultKeyStatistics',
          'financialData',
          'price',
          'summaryProfile',
          'assetProfile',
          // 'balanceSheetHistory',
          // 'cashflowStatementHistory',
          // 'incomeStatementHistory',
        ],
      });

      const data = {
        // marketCap: result.summaryDetail?.marketCap?.toString() || null,
        marketCap: result.price?.marketCap?.toString() || null,
        peRatioTTM: result.summaryDetail?.trailingPE || null,
        priceToBook: result.defaultKeyStatistics?.priceToBook || null,
        bookValue: result.defaultKeyStatistics?.bookValue || null,
        // debtToEquity: result.defaultKeyStatistics?.debtToEquity || null,
        debtToEquity: result.financialData?.debtToEquity || null,
        // revenueTTM: result.financialData?.revenue || null,
        revenueTTM: result.financialData?.totalRevenue || null,
        ebitdaTTM: result.financialData?.ebitda || null,
        profitMargin: result.financialData?.profitMargins || null,
        operatingMargin: result.financialData?.operatingMargins || null,
        returnOnEquity: result.financialData?.returnOnEquity || null,
        returnOnAssets: result.financialData?.returnOnAssets || null,
        // sector: result.summaryProfile?.sector || null,
        // industry: result.summaryProfile?.industry || null,
        sector: result.assetProfile?.sector || result.summaryProfile?.sector || null,
        industry: result.assetProfile?.industry || result.summaryProfile?.industry || null,
      };

      this.logger.log('yahoo data: marketCap=' + data.marketCap + ', pe=' + data.peRatioTTM);

      if (Object.values(data).every(v => v === null)) {
        return null;
      }

      return data;
    } catch (err) {
      console.log(err);
      this.logger.error('yahoo failed: ' + (err as Error).message);
      return null;
    }
  }

  async parseGoogle(googleSymbol: string) {
    try {
      const url = `https://www.google.com/finance/quote/${googleSymbol}`;

      this.logger.log('hitting google fundamentals: ' + url);

      // const response = await axios.get(url);

      const response = await axios.get(url, this.axiosConfig());
      // console.log(response);

      // console.log(arguments, googleSymbol, response.config, response.data.data);

      const doc = cheerio.load(response.data);

      const data = {
        // peRatio: this.extractNumericValue(this.getGoogleMetric(html, 'PE ratio')),
        // peRatio: this.extractNumericValue(this.getGoogleMetric(html, 'ratio')),
        peRatio: this.parseNumber(this.findGoogleMetric(doc, 'P/E ratio')),
        dividendYield: this.parseNumber(this.findGoogleMetric(doc, 'Dividend yield')),
        prevClose: this.parseNumber(this.findGoogleMetric(doc, 'Previous close')),
        dayRange: this.findGoogleMetric(doc, 'Day range'),
        // yearRange: this.getGoogleMetric(html, '52 week range'),
        yearRange: this.findGoogleMetric(doc, 'Year range'),
        marketCap: this.findGoogleMetric(doc, 'Market cap'),
        // avgVolume: this.getGoogleMetric(html, 'Volume'),
        avgVolume: this.findGoogleMetric(doc, 'Avg Volume'),
      };

      this.logger.log('google fundamentals: pe=' + data.peRatio + ', marketCap=' + data.marketCap);

      if (!Object.values(data).some(v => v !== null)) {
        return null;
      }

      return data;
    } catch (err) {
      this.logger.error('google fundamentals failed: ' + (err as Error).message);
      return null;
    }
  }
}

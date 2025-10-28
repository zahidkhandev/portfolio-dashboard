import { Injectable, Logger } from '@nestjs/common';
import YahooFinance from 'yahoo-finance2';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { PriceCacheService } from '../cache/cache.service';

@Injectable()
export class StockPriceService {
  private readonly logger = new Logger(StockPriceService.name);
  private yahooFinance: InstanceType<typeof YahooFinance>;

  constructor(private cacheService: PriceCacheService) {
    this.yahooFinance = new YahooFinance();

    const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
    if (proxyUrl) {
      this.logger.log('using proxy: ' + proxyUrl);
    }

    this.logger.log('service ready');
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

  async getPriceFromGoogle(symbol: string) {
    try {
      // const yahooSymbol = symbol;
      const googleSymbol = symbol.replace('.NS', ':NSE').replace('.BO', ':BOM');
      const url = 'https://www.google.com/finance/quote/' + googleSymbol;

      this.logger.log('hitting google: ' + url);

      const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
      const config: any = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 15000,
      };

      if (proxyUrl) {
        const agent = new HttpsProxyAgent(proxyUrl);
        config.httpsAgent = agent;
        config.proxy = false;
      }

      const response = await axios.get(url, config);
      this.logger.log('got response for ' + symbol);

      const html = cheerio.load(response.data);

      // const priceText = html('div.price').first().text();
      // const priceText = html('div.p29Ibb').first().text();
      // const priceText = html('div.NydbP.VOXKNe').first().text();
      // const priceText = html('div.NydbP.nZQ6l').first().text();

      const priceText = html('div.YMlKec.fxKbKc').first().text();
      this.logger.log('raw price: ' + priceText);

      const cleanedPrice = priceText.replace(/[^\d.]/g, '');
      const price = cleanedPrice ? parseFloat(cleanedPrice) : 0;

      if (price === 0) {
        this.logger.warn('price is zero for ' + symbol);
        return null;
      }

      const peRatioText = this.getMetric(html, 'P/E ratio');
      const marketCapText = this.getMetric(html, 'Market cap');
      const dividendText = this.getMetric(html, 'Dividend yield');

      this.logger.log('pe=' + peRatioText + ', marketCap=' + marketCapText);

      let peRatio = null;
      if (peRatioText) {
        peRatio = parseFloat(peRatioText.replace(/[^\d.]/g, ''));
      }

      let dividend = null;
      if (dividendText) {
        dividend = parseFloat(dividendText.replace(/[^\d.]/g, ''));
      }

      this.logger.log('saving to cache');
      await this.cacheService.setCache(symbol, price, peRatio, marketCapText);

      return {
        symbol: symbol,
        currentPrice: price,
        peRatio: peRatio,
        marketCap: marketCapText,
        dividendYield: dividend,
        cached: false,
      };
    } catch (err) {
      const error = err as Error;
      this.logger.error('failed: ' + error.message);
      return null;
    }
  }

  async fetchFundamentals(symbol: string) {
    this.logger.log('getting fundamentals for ' + symbol);

    try {
      const data = await this.parseGoogle(symbol);
      if (!data) {
        this.logger.warn('no data found');
        return null;
      }
      return data;
    } catch (err) {
      const error = err as Error;
      this.logger.error('fundamentals failed: ' + error.message);
      return null;
    }
  }

  async fetchBatchPrices(symbols: string[]) {
    this.logger.log('batch fetch for ' + symbols.length + ' stocks');
    const results = [];

    for (let i = 0; i < symbols.length; i++) {
      const priceData = await this.fetchCurrentPrice(symbols[i]);
      if (priceData) {
        results.push(priceData);
      }
      // await this.wait(100);
      await this.wait(200);
    }

    this.logger.log('batch done: ' + results.length + '/' + symbols.length);
    return results;
  }

  async getFromCache(symbol: string) {
    const cached = await this.cacheService.getCached(symbol);

    if (cached) {
      const age = Math.floor((Date.now() - new Date(cached.cachedAt).getTime()) / 1000);
      this.logger.log('cache age: ' + age + 's');

      return {
        symbol: cached.symbol,
        currentPrice: cached.currentPrice,
        peRatio: cached.peRatio,
        marketCap: cached.marketCap,
        cached: true,
      };
    }

    return null;
  }

  async parseYahoo(symbol: string) {
    this.logger.log('trying yahoo');

    try {
      const result = await this.yahooFinance.quoteSummary(symbol, {
        modules: ['summaryDetail', 'defaultKeyStatistics', 'financialData'],
      });

      const data = {
        marketCap: result.price?.marketCap?.toString() || null,
        peRatioTTM: result.summaryDetail?.trailingPE || null,
        priceToBook: result.defaultKeyStatistics?.priceToBook || null,
        bookValue: result.defaultKeyStatistics?.bookValue || null,
        debtToEquity: result.financialData?.debtToEquity || null,
        revenueTTM: result.financialData?.totalRevenue || null,
        ebitdaTTM: result.financialData?.ebitda || null,
      };

      if (Object.values(data).every(v => v === null)) {
        return null;
      }

      return data;
    } catch (err) {
      const error = err as Error;
      this.logger.error('yahoo failed: ' + error.message);
      return null;
    }
  }

  async parseGoogle(symbol: string) {
    try {
      const googleSymbol = symbol.replace('.NS', ':NSE').replace('.BO', ':BOM');
      const url = 'https://www.google.com/finance/quote/' + googleSymbol;

      const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
      const config: any = {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        timeout: 15000,
      };

      if (proxyUrl) {
        config.httpsAgent = new HttpsProxyAgent(proxyUrl);
        config.proxy = false;
      }

      const response = await axios.get(url, config);
      const html = cheerio.load(response.data);

      const peText = this.getMetric(html, 'P/E ratio');
      // const peText = this.getMetric(html, 'PE ratio');
      // const peText = this.getMetric(html, 'ratio');

      const divText = this.getMetric(html, 'Dividend yield');
      const prevText = this.getMetric(html, 'Previous close');
      const dayRange = this.getMetric(html, 'Day range');
      const yearRange = this.getMetric(html, 'Year range');
      const marketCap = this.getMetric(html, 'Market cap');
      // const volume = this.getMetric(html, 'Volume');
      const volume = this.getMetric(html, 'Avg Volume');

      let pe = null;
      if (peText) pe = parseFloat(peText.replace(/[^\d.]/g, ''));

      let div = null;
      if (divText) div = parseFloat(divText.replace(/[^\d.]/g, ''));

      let prev = null;
      if (prevText) prev = parseFloat(prevText.replace(/[^\d.]/g, ''));

      const data = {
        peRatio: pe,
        dividendYield: div,
        prevClose: prev,
        dayRange: dayRange,
        yearRange: yearRange,
        marketCap: marketCap,
        avgVolume: volume,
      };

      if (!Object.values(data).some(v => v !== null)) {
        return null;
      }

      return data;
    } catch (err) {
      const error = err as Error;
      this.logger.error('google failed: ' + error.message);
      return null;
    }
  }

  private getMetric(html: cheerio.CheerioAPI, label: string): string | null {
    let value = null;

    // html('div.P6K39c').each((i, elem) => {
    html('div.mfs7Fc').each((i, elem) => {
      if (html(elem).text() === label) {
        // value = html(elem).closest('div.gyFHrc').find('div.P6K39c').text();
        value = html(elem).closest('div.gyFHrc').find('div.P6K39c').text();
        return false;
      }
    });

    return value;
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

'use client';

import { use, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { stocksApi, priceDataApi, stockPriceApi } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RefreshCw, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import Link from 'next/link';
import { format, subDays, subMonths, subYears, startOfDay } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

interface StockDetailPageProps {
  params: Promise<{ id: string }>;
}

type TimeRangeType = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y' | 'custom';

export default function StockDetailPage({ params }: StockDetailPageProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const resolvedParams = use(params);
  const stockId = parseInt(resolvedParams.id);

  const [stock, setStock] = useState<any>(null);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRangeType>('1M');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [error, setError] = useState('');
  const [periodReturn, setPeriodReturn] = useState<{ value: number; percent: number } | null>(null);

  const getDateRange = (range: TimeRangeType) => {
    const end = new Date();
    let start: Date;

    switch (range) {
      case '1D':
        start = startOfDay(new Date());
        break;
      case '1W':
        start = subDays(end, 7);
        break;
      case '1M':
        start = subMonths(end, 1);
        break;
      case '3M':
        start = subMonths(end, 3);
        break;
      case '6M':
        start = subMonths(end, 6);
        break;
      case '1Y':
        start = subYears(end, 1);
        break;
      case '3Y':
        start = subYears(end, 3);
        break;
      case '5Y':
        start = subYears(end, 5);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          return {
            start: new Date(customStartDate),
            end: new Date(customEndDate),
          };
        }
        start = subMonths(end, 1);
        break;
      default:
        start = subMonths(end, 1);
    }

    return { start, end };
  };

  const fetchStockData = async () => {
    console.log('fetching stock data for id:', stockId, 'range:', timeRange);

    if (!isAuthenticated) {
      console.log('not authenticated');
      setLoading(false);
      return;
    }

    try {
      setError('');

      const stockResponse = await stocksApi.getById(stockId);
      const stockData = stockResponse.data.data || stockResponse.data;

      try {
        const currentPriceResponse = await stockPriceApi.getCurrentPrice(stockData.symbol);
        const currentPriceData = currentPriceResponse.data.data || currentPriceResponse.data;

        if (stockData.priceData && stockData.priceData.length > 0) {
          stockData.priceData[0].dividendYield = currentPriceData.dividendYield;
          stockData.priceData[0].dayHigh = currentPriceData.dayHigh;
          stockData.priceData[0].dayLow = currentPriceData.dayLow;
        }
      } catch (priceError) {
        console.warn('failed to fetch current price data:', priceError);
      }

      setStock(stockData);

      if (timeRange === '1D') {
        await fetchTodayData(stockId, stockData);
      } else {
        await fetchHistoricalData(stockData, timeRange);
      }
    } catch (error: any) {
      console.error('fetch failed:', error);
      setError('failed to load stock data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayData = async (stockId: number, stockData: any) => {
    try {
      const today = startOfDay(new Date());

      const historyResponse = await priceDataApi.getHistory(
        stockId,
        format(today, 'yyyy-MM-dd'),
        format(new Date(), 'yyyy-MM-dd'),
      );

      const historyData = historyResponse.data.data || historyResponse.data;

      if (Array.isArray(historyData) && historyData.length > 0) {
        const chartData = historyData.map((item: any) => ({
          date: format(new Date(item.timestamp), 'HH:mm'),
          timestamp: new Date(item.timestamp).getTime(),
          price: item.currentPrice,
          value: item.presentValue,
          gain: item.gainLoss,
        }));

        setPriceHistory(chartData);

        const firstPoint = chartData[0];
        const lastPoint = chartData[chartData.length - 1];
        const returnValue = lastPoint.value - firstPoint.value;
        const returnPercent = firstPoint.value > 0 ? (returnValue / firstPoint.value) * 100 : 0;

        setPeriodReturn({ value: returnValue, percent: returnPercent });
      } else {
        setPriceHistory([]);
        setPeriodReturn(null);
      }
    } catch (error) {
      console.error('today data fetch failed:', error);
      setPriceHistory([]);
      setPeriodReturn(null);
    }
  };

  const fetchHistoricalData = async (stockData: any, range: TimeRangeType) => {
    try {
      const { start, end } = getDateRange(range);

      console.log('calling yahoo historical from', start, 'to', end);

      const response = await stockPriceApi.getHistoricalPrices(
        stockData.symbol,
        format(start, 'yyyy-MM-dd'),
        format(end, 'yyyy-MM-dd'),
      );

      const yahooData = response.data.data || response.data;

      if (Array.isArray(yahooData) && yahooData.length > 0) {
        let dateFormat = 'MMM dd';
        if (range === '3Y' || range === '5Y') {
          dateFormat = 'yyyy';
        } else if (range === '1Y') {
          dateFormat = "MMM ''yy";
        }

        const chartData = yahooData.map((item: any, index: number) => {
          const presentValue = item.close * stockData.quantity;
          const gainLoss = presentValue - stockData.investment;
          const itemDate = new Date(item.date);

          return {
            date: format(itemDate, dateFormat),
            timestamp: itemDate.getTime(),
            year: itemDate.getFullYear(),
            month: itemDate.getMonth(),
            price: item.close,
            value: presentValue,
            gain: gainLoss,
            index: index,
          };
        });

        setPriceHistory(chartData);

        const firstPoint = chartData[0];
        const lastPoint = chartData[chartData.length - 1];
        const returnValue = lastPoint.value - firstPoint.value;
        const returnPercent = firstPoint.value > 0 ? (returnValue / firstPoint.value) * 100 : 0;

        setPeriodReturn({ value: returnValue, percent: returnPercent });
      } else {
        setPriceHistory([]);
        setPeriodReturn(null);
      }
    } catch (error) {
      console.error('yahoo fetch failed:', error);
      setPriceHistory([]);
      setPeriodReturn(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await priceDataApi.refreshStock(stockId);
      await fetchStockData();
    } catch (error: any) {
      console.error('refresh failed:', error);
      setError('failed to refresh');
    } finally {
      setRefreshing(false);
    }
  };

  const handleTimeRangeChange = (range: TimeRangeType) => {
    console.log('time range changed to:', range);
    setTimeRange(range);
  };

  const handleCustomDateApply = () => {
    if (customStartDate && customEndDate) {
      setTimeRange('custom');
    }
  };

  const formatXAxisTick = (value: string, index: number) => {
    if (timeRange === '3Y' || timeRange === '5Y') {
      const currentItem = priceHistory[index];
      if (!currentItem) return '';

      if (index === 0) return value;

      const prevItem = priceHistory[index - 1];
      if (prevItem && currentItem.year === prevItem.year) {
        return '';
      }

      return value;
    }

    return value;
  };

  const getTickInterval = () => {
    const dataLength = priceHistory.length;

    if (timeRange === '5Y') {
      return Math.floor(dataLength / 5);
    } else if (timeRange === '3Y') {
      return Math.floor(dataLength / 4);
    } else if (timeRange === '1Y') {
      return Math.floor(dataLength / 6);
    } else if (timeRange === '6M') {
      return Math.floor(dataLength / 6);
    } else if (timeRange === '3M') {
      return Math.floor(dataLength / 6);
    }

    return 'preserveStartEnd';
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchStockData();

      if (timeRange === '1D') {
        const interval = setInterval(fetchStockData, 15000);
        return () => clearInterval(interval);
      }
    }
  }, [stockId, timeRange, isAuthenticated, authLoading]);

  const formatCurrency = (value?: number | null) => {
    if (value === undefined || value === null) return '₹0.00';
    return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const formatPercent = (value?: number | null) => {
    if (value === undefined || value === null) return '0.00%';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-slate-400" />
          <p className="mt-2 text-slate-500">loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-600">{error}</p>
        <Button onClick={fetchStockData} className="mt-4">
          retry
        </Button>
      </div>
    );
  }

  if (!stock) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <p className="text-yellow-600">stock not found</p>
        <Link href="/dashboard/stocks">
          <Button className="mt-4">back to stocks</Button>
        </Link>
      </div>
    );
  }

  const latestPrice = stock.priceData?.[0];
  const currentPrice = latestPrice?.currentPrice || stock.purchasePrice;
  const currentValue = latestPrice?.presentValue || stock.investment;
  const totalGain = latestPrice?.gainLoss || 0;
  const totalGainPercent = latestPrice?.gainLossPercent || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/stocks">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{stock.symbol}</h1>
            <p className="text-sm sm:text-base text-slate-500">{stock.name}</p>
          </div>
          <Badge variant="outline" className="hidden sm:inline-flex">
            {stock.sector}
          </Badge>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">refresh</span>
        </Button>
      </div>

      <div className="sm:hidden">
        <Badge variant="outline">{stock.sector}</Badge>
      </div>

      <Card
        className={totalGain >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}
      >
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm text-slate-500">current price</p>
              <p className="text-3xl sm:text-4xl font-bold mt-1">{formatCurrency(currentPrice)}</p>
              <div className="flex items-center gap-2 mt-2">
                {totalGain >= 0 ? (
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                )}
                <span
                  className={`text-base sm:text-lg font-semibold ${totalGain >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {formatCurrency(totalGain)} ({formatPercent(totalGainPercent)})
                </span>
              </div>
            </div>
            <div className="text-left sm:text-right border-t sm:border-t-0 sm:border-l sm:pl-4 pt-4 sm:pt-0">
              <p className="text-sm text-slate-500">purchase price</p>
              <p className="text-xl sm:text-2xl font-semibold mt-1">
                {formatCurrency(stock.purchasePrice)}
              </p>
              <p className="text-sm text-slate-500 mt-2">quantity: {stock.quantity}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">investment</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl sm:text-2xl font-bold">{formatCurrency(stock.investment)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">present value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl sm:text-2xl font-bold">{formatCurrency(currentValue)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">p/e ratio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl sm:text-2xl font-bold">
              {latestPrice?.peRatio?.toFixed(2) || stock.peRatioTTM?.toFixed(2) || 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">dividend yield</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl sm:text-2xl font-bold">
              {latestPrice?.dividendYield?.toFixed(2) || 'N/A'}%
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div>
              <CardTitle>price history</CardTitle>
              {periodReturn && (
                <div
                  className={`flex items-center gap-2 mt-2 flex-wrap ${periodReturn.value >= 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {periodReturn.value >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span className="font-semibold text-sm sm:text-base">
                    {formatCurrency(periodReturn.value)} ({formatPercent(periodReturn.percent)})
                  </span>
                  <span className="text-xs sm:text-sm text-slate-500">for selected period</span>
                </div>
              )}
            </div>
            <div className="flex gap-1 sm:gap-2 flex-wrap">
              {['1D', '1W', '1M', '3M', '6M', '1Y', '3Y', '5Y'].map(range => (
                <Button
                  key={range}
                  variant={timeRange === range ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTimeRangeChange(range as TimeRangeType)}
                  className="text-xs sm:text-sm px-2 sm:px-3"
                >
                  {range}
                </Button>
              ))}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={timeRange === 'custom' ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs sm:text-sm px-2 sm:px-3"
                  >
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                    <span className="hidden sm:inline">custom</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">start date</label>
                      <Input
                        type="date"
                        value={customStartDate}
                        onChange={e => setCustomStartDate(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">end date</label>
                      <Input
                        type="date"
                        value={customEndDate}
                        onChange={e => setCustomEndDate(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <Button onClick={handleCustomDateApply} className="w-full">
                      apply
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {priceHistory.length === 0 ? (
            <div className="h-[300px] sm:h-[400px] flex items-center justify-center text-slate-500 text-sm sm:text-base text-center px-4">
              {timeRange === '1D'
                ? 'no data yet, wait for cron or click refresh'
                : 'loading data...'}
            </div>
          ) : (
            <div className="h-[300px] sm:h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={priceHistory}>
                  <defs>
                    <linearGradient id="colorGain" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    style={{ fontSize: '10px' }}
                    interval={getTickInterval()}
                    tickFormatter={formatXAxisTick}
                  />
                  <YAxis
                    stroke="#64748b"
                    style={{ fontSize: '10px' }}
                    tickFormatter={value => `₹${value}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: any, name: string) => {
                      if (name === 'gain') {
                        const val = Number(value);
                        return [`₹${val.toLocaleString('en-IN')}`, 'gain/loss'];
                      }
                      return [`₹${value.toLocaleString('en-IN')}`, name];
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="gain"
                    stroke={
                      (priceHistory[priceHistory.length - 1]?.gain || 0) >= 0
                        ? '#22c55e'
                        : '#ef4444'
                    }
                    strokeWidth={2}
                    fill={
                      (priceHistory[priceHistory.length - 1]?.gain || 0) >= 0
                        ? 'url(#colorGain)'
                        : 'url(#colorLoss)'
                    }
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>fundamentals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-700">valuation metrics</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">market cap</span>
                  <span className="font-medium text-sm">{stock.marketCap || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">p/e ratio (ttm)</span>
                  <span className="font-medium text-sm">
                    {stock.peRatioTTM?.toFixed(2) || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">price to book</span>
                  <span className="font-medium text-sm">
                    {stock.priceToBook?.toFixed(2) || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-slate-700">financial health</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">ebitda %</span>
                  <span className="font-medium text-sm">
                    {stock.ebitdaPercent?.toFixed(2) || 'N/A'}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">debt to equity</span>
                  <span className="font-medium text-sm">
                    {stock.debtToEquity?.toFixed(2) || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">book value</span>
                  <span className="font-medium text-sm">{stock.bookValue || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-slate-700">growth (3y)</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">revenue growth</span>
                  <span className="font-medium text-sm">
                    {stock.revenueGrowth3Y?.toFixed(2) || 'N/A'}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">ebitda growth</span>
                  <span className="font-medium text-sm">
                    {stock.ebitdaGrowth3Y?.toFixed(2) || 'N/A'}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">profit growth</span>
                  <span className="font-medium text-sm">
                    {stock.profitGrowth3Y?.toFixed(2) || 'N/A'}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>trading information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-slate-500">exchange</p>
              <p className="text-base sm:text-lg font-semibold mt-1">{stock.exchange}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">day high</p>
              <p className="text-base sm:text-lg font-semibold mt-1">
                {latestPrice?.dayHigh ? formatCurrency(latestPrice.dayHigh) : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">day low</p>
              <p className="text-base sm:text-lg font-semibold mt-1">
                {latestPrice?.dayLow ? formatCurrency(latestPrice.dayLow) : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">last updated</p>
              <p className="text-base sm:text-lg font-semibold mt-1">
                {latestPrice?.timestamp
                  ? format(new Date(latestPrice.timestamp), 'HH:mm:ss')
                  : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

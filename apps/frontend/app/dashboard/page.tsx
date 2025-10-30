'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { portfolioApi, priceDataApi } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { PortfolioMetrics } from '@/types';
import Link from 'next/link';

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [error, setError] = useState<string>('');

  const fetchMetrics = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setError('');
      const response = await portfolioApi.getMetrics();
      const metricsData = response.data.data || response.data;
      setMetrics(metricsData);
      setLastUpdate(new Date());
    } catch (error: any) {
      console.error('fetch failed:', error);
      setError(error.response?.data?.message || 'failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await priceDataApi.refreshAll();
      await fetchMetrics();
    } catch (error: any) {
      console.error('refresh failed:', error);
      setError('failed to refresh');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchMetrics();
      const interval = setInterval(() => {
        fetchMetrics();
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-slate-400" />
          <p className="mt-2 text-slate-500">loading portfolio...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-600">{error}</p>
        <Button onClick={fetchMetrics} className="mt-4">
          retry
        </Button>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <p className="text-yellow-600">no data available</p>
        <Button onClick={fetchMetrics} className="mt-4">
          load data
        </Button>
      </div>
    );
  }

  const formatCurrency = (value?: number | null) => {
    if (value === undefined || value === null) return '₹0.00';
    return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const formatPercent = (value?: number | null) => {
    if (value === undefined || value === null) return '0.00%';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Portfolio Overview</h2>
          <p className="text-sm text-slate-500 mt-1">
            last updated: {lastUpdate.toLocaleTimeString()} • auto-refresh every 15s
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} disabled={refreshing} size="sm">
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{refreshing ? 'refreshing...' : 'refresh now'}</span>
          </Button>
          <Link href="/dashboard/stocks">
            <Button variant="outline" size="sm">
              <span className="hidden sm:inline">view all stocks</span>
              <span className="sm:hidden">stocks</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {formatCurrency(metrics.totalInvestment)}
            </div>
            <p className="text-xs text-slate-500 mt-1">{metrics.stockCount} stocks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {formatCurrency(metrics.currentValue)}
            </div>
            <p className="text-xs text-slate-500 mt-1">real-time value</p>
          </CardContent>
        </Card>

        <Card
          className={
            (metrics.totalGainLoss || 0) >= 0
              ? 'border-green-200 bg-green-50'
              : 'border-red-200 bg-red-50'
          }
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gain/Loss</CardTitle>
            {(metrics.totalGainLoss || 0) >= 0 ? (
              <ArrowUpRight className="h-4 w-4 text-green-600" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-xl sm:text-2xl font-bold ${(metrics.totalGainLoss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {formatCurrency(metrics.totalGainLoss)}
            </div>
            <p
              className={`text-xs sm:text-sm font-medium mt-1 ${(metrics.totalGainLoss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {formatPercent(metrics.totalGainLossPercent)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg P/E Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {metrics.fundamentalAverages?.avgPE?.toFixed(2) || 'N/A'}
            </div>
            <p className="text-xs text-slate-500 mt-1">weighted avg</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sector Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {!metrics.sectors || metrics.sectors.length === 0 ? (
            <p className="text-center text-slate-500 py-8">no sectors to display</p>
          ) : (
            <div className="space-y-4">
              {metrics.sectors.map(sector => (
                <div
                  key={sector.sector}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4 last:border-0"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-semibold text-sm sm:text-base">{sector.sector}</p>
                      <Badge variant="secondary" className="text-xs">
                        {sector.stockCount} stocks
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-500 mb-2">
                      <span>investment: {formatCurrency(sector.investment)}</span>
                      <span>•</span>
                      <span>{sector.percent?.toFixed(1)}% of portfolio</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{ width: `${Math.min(sector.percent || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-left sm:text-right sm:ml-4 border-t sm:border-t-0 pt-2 sm:pt-0">
                    <p className="font-semibold text-sm sm:text-base">
                      {formatCurrency(sector.currentValue)}
                    </p>
                    <p
                      className={`text-xs sm:text-sm font-medium ${(sector.gainLoss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {formatPercent(sector.gainLossPercent)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center text-green-600 text-base sm:text-lg">
              <TrendingUp className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Top Gainers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!metrics.topGainers || metrics.topGainers.length === 0 ? (
              <p className="text-center text-slate-500 py-8">no gainers yet</p>
            ) : (
              <div className="space-y-3">
                {metrics.topGainers.map(stock => (
                  <Link key={stock.id} href={`/dashboard/stocks/${stock.id}`}>
                    <div className="flex items-center justify-between rounded-lg border border-green-100 bg-green-50 p-3 hover:bg-green-100 transition-colors cursor-pointer gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm sm:text-base truncate">
                          {stock.symbol}
                        </p>
                        <p className="text-xs sm:text-sm text-slate-600 truncate">{stock.name}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatCurrency(stock.currentPrice)} • {stock.sector}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge className="bg-green-600 text-white text-xs">
                          {formatPercent(stock.gainLossPercent)}
                        </Badge>
                        <p className="text-xs sm:text-sm text-green-600 mt-1 font-medium">
                          {formatCurrency(stock.gainLoss)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600 text-base sm:text-lg">
              <TrendingDown className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Top Losers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!metrics.topLosers || metrics.topLosers.length === 0 ? (
              <p className="text-center text-slate-500 py-8">no losers yet</p>
            ) : (
              <div className="space-y-3">
                {metrics.topLosers.map(stock => (
                  <Link key={stock.id} href={`/dashboard/stocks/${stock.id}`}>
                    <div className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50 p-3 hover:bg-red-100 transition-colors cursor-pointer gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm sm:text-base truncate">
                          {stock.symbol}
                        </p>
                        <p className="text-xs sm:text-sm text-slate-600 truncate">{stock.name}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatCurrency(stock.currentPrice)} • {stock.sector}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant="destructive" className="text-xs">
                          {formatPercent(stock.gainLossPercent)}
                        </Badge>
                        <p className="text-xs sm:text-sm text-red-600 mt-1 font-medium">
                          {formatCurrency(stock.gainLoss)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">
            Portfolio Fundamentals (Weighted Averages)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-medium text-slate-500">P/E Ratio</p>
              <p className="text-xl sm:text-2xl font-bold">
                {metrics.fundamentalAverages?.avgPE?.toFixed(2) || 'N/A'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-medium text-slate-500">EBITDA Margin</p>
              <p className="text-xl sm:text-2xl font-bold">
                {metrics.fundamentalAverages?.avgEBITDAMargin?.toFixed(2) || 'N/A'}%
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-medium text-slate-500">Dividend Yield</p>
              <p className="text-xl sm:text-2xl font-bold">
                {metrics.fundamentalAverages?.avgDividendYield?.toFixed(2) || 'N/A'}%
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-medium text-slate-500">Debt/Equity</p>
              <p className="text-xl sm:text-2xl font-bold">
                {metrics.fundamentalAverages?.avgDebtToEquity?.toFixed(2) || 'N/A'}
              </p>
            </div>
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <p className="text-xs sm:text-sm font-medium text-slate-500">P/B Ratio</p>
              <p className="text-xl sm:text-2xl font-bold">
                {metrics.fundamentalAverages?.avgPriceToBook?.toFixed(2) || 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

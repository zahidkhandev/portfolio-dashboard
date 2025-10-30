'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { stocksApi, priceDataApi } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Plus,
  TrendingUp,
  Edit,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function StocksPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [error, setError] = useState('');

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    sector: '',
    purchasePrice: '',
    quantity: '',
    exchange: 'NSE',
  });
  const [formLoading, setFormLoading] = useState(false);

  const fetchStocks = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setError('');
      const response = await stocksApi.getAll();
      const stocksData = response.data.data || response.data;

      if (Array.isArray(stocksData)) {
        setStocks(stocksData);
      } else {
        setStocks([]);
      }

      setLastUpdate(new Date());
    } catch (error: any) {
      console.error('fetch failed:', error);
      setError('failed to load stocks');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await priceDataApi.refreshAll();
      await fetchStocks();
    } catch (error: any) {
      console.error('refresh failed:', error);
      setError('failed to refresh');
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddStock = () => {
    setFormData({
      symbol: '',
      name: '',
      sector: '',
      purchasePrice: '',
      quantity: '',
      exchange: 'NSE',
    });
    setIsAddDialogOpen(true);
  };

  const handleEditStock = (stock: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedStock(stock);
    setFormData({
      symbol: stock.symbol,
      name: stock.name,
      sector: stock.sector,
      purchasePrice: stock.purchasePrice.toString(),
      quantity: stock.quantity.toString(),
      exchange: stock.exchange,
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteStock = (stock: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedStock(stock);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      await stocksApi.create({
        symbol: formData.symbol,
        name: formData.name,
        sector: formData.sector,
        purchasePrice: parseFloat(formData.purchasePrice),
        quantity: parseInt(formData.quantity),
        exchange: formData.exchange as 'NSE' | 'BSE',
      });

      setIsAddDialogOpen(false);
      await fetchStocks();
    } catch (error: any) {
      console.error('add failed:', error);
      setError(error.response?.data?.message || 'failed to add stock');
    } finally {
      setFormLoading(false);
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      await stocksApi.update(selectedStock.id, {
        symbol: formData.symbol,
        name: formData.name,
        sector: formData.sector,
        purchasePrice: parseFloat(formData.purchasePrice),
        quantity: parseInt(formData.quantity),
        exchange: formData.exchange as 'NSE' | 'BSE',
      });

      setIsEditDialogOpen(false);
      await fetchStocks();
    } catch (error: any) {
      console.error('update failed:', error);
      setError(error.response?.data?.message || 'failed to update stock');
    } finally {
      setFormLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    setFormLoading(true);

    try {
      await stocksApi.delete(selectedStock.id);
      setIsDeleteDialogOpen(false);
      await fetchStocks();
    } catch (error: any) {
      console.error('delete failed:', error);
      setError(error.response?.data?.message || 'failed to delete stock');
    } finally {
      setFormLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchStocks();
      const interval = setInterval(fetchStocks, 15000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, authLoading]);

  const formatCurrency = (value?: number | null) => {
    if (value === undefined || value === null) return '₹0.00';
    return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const formatPercent = (value?: number | null) => {
    if (value === undefined || value === null) return '0.00%';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const handleRowClick = (stockId: number) => {
    router.push(`/dashboard/stocks/${stockId}`);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-600">{error}</p>
        <Button onClick={fetchStocks} className="mt-4">
          retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">All Stocks</h2>
            <p className="text-sm text-slate-500 mt-1">
              last updated: {lastUpdate.toLocaleTimeString()} • {stocks.length} stocks
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleRefresh} disabled={refreshing} size="sm">
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{refreshing ? 'refreshing...' : 'refresh'}</span>
            </Button>
            <Button onClick={handleAddStock} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">add stock</span>
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden hidden lg:block">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="font-semibold sticky left-0 bg-slate-50 z-10">
                    Symbol
                  </TableHead>
                  <TableHead className="font-semibold min-w-[150px]">Name</TableHead>
                  <TableHead className="font-semibold">Sector</TableHead>
                  <TableHead className="font-semibold text-center">Qty</TableHead>
                  <TableHead className="text-right font-semibold">Purchase Price</TableHead>
                  <TableHead className="text-right font-semibold">Current Price</TableHead>
                  <TableHead className="text-right font-semibold">Investment</TableHead>
                  <TableHead className="text-right font-semibold">Present Value</TableHead>
                  <TableHead className="text-right font-semibold">Gain/Loss</TableHead>
                  <TableHead className="text-right font-semibold">P/E Ratio</TableHead>
                  <TableHead className="text-right font-semibold">Dividend %</TableHead>
                  <TableHead className="text-right font-semibold">EBITDA %</TableHead>
                  <TableHead className="font-semibold text-center">Stage 2</TableHead>
                  <TableHead className="text-right font-semibold text-xs">Last Updated</TableHead>
                  <TableHead className="font-semibold text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stocks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={15} className="text-center text-slate-500 py-12">
                      <div className="flex flex-col items-center gap-2">
                        <TrendingUp className="h-12 w-12 text-slate-300" />
                        <p className="font-medium">no stocks found</p>
                        <p className="text-sm">add your first stock to get started</p>
                        <Button onClick={handleAddStock} className="mt-4">
                          <Plus className="mr-2 h-4 w-4" />
                          add stock
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  stocks.map(stock => {
                    const latestPrice = stock.priceData?.[0];
                    const currentPrice = latestPrice?.currentPrice || stock.purchasePrice;
                    const presentValue = latestPrice?.presentValue || stock.investment;
                    const gainLoss = latestPrice?.gainLoss || 0;
                    const gainLossPercent = latestPrice?.gainLossPercent || 0;

                    return (
                      <TableRow key={stock.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="font-bold text-slate-900 sticky left-0 bg-white hover:bg-slate-50 z-10">
                          {stock.symbol}
                        </TableCell>
                        <TableCell
                          className="text-slate-900 cursor-pointer hover:text-blue-600 hover:underline transition-colors font-medium"
                          onClick={() => handleRowClick(stock.id)}
                        >
                          {stock.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="whitespace-nowrap">
                            {stock.sector}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium">{stock.quantity}</TableCell>
                        <TableCell className="text-right text-slate-600">
                          {formatCurrency(stock.purchasePrice)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-slate-900">
                          {formatCurrency(currentPrice)}
                        </TableCell>
                        <TableCell className="text-right text-slate-600">
                          {formatCurrency(stock.investment)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-slate-900">
                          {formatCurrency(presentValue)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-0.5">
                            <span
                              className={`font-semibold ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}
                            >
                              {formatCurrency(gainLoss)}
                            </span>
                            <div className="flex items-center gap-1">
                              {gainLossPercent >= 0 ? (
                                <ArrowUpRight className="h-3 w-3 text-green-600" />
                              ) : (
                                <ArrowDownRight className="h-3 w-3 text-red-600" />
                              )}
                              <span
                                className={`text-xs font-medium ${gainLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}
                              >
                                {formatPercent(gainLossPercent)}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-medium">
                            {latestPrice?.peRatio?.toFixed(2) ||
                              stock.peRatioTTM?.toFixed(2) ||
                              'N/A'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-medium text-blue-600">
                            {latestPrice?.dividendYield
                              ? `${latestPrice.dividendYield.toFixed(2)}%`
                              : 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-medium">
                            {stock.ebitdaPercent ? `${stock.ebitdaPercent.toFixed(1)}%` : 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {stock.stage2 === 'Yes' ? (
                            <Badge className="bg-green-600 hover:bg-green-700">Yes</Badge>
                          ) : (
                            <Badge variant="secondary">No</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs text-slate-500">
                          {latestPrice?.timestamp
                            ? format(new Date(latestPrice.timestamp), 'HH:mm:ss')
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 justify-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={e => handleEditStock(stock, e)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={e => handleDeleteStock(stock, e)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        <div className="grid gap-4 lg:hidden">
          {stocks.length === 0 ? (
            <Card className="p-8">
              <div className="flex flex-col items-center gap-2 text-center">
                <TrendingUp className="h-12 w-12 text-slate-300" />
                <p className="font-medium text-slate-500">no stocks found</p>
                <p className="text-sm text-slate-400">add your first stock to get started</p>
                <Button onClick={handleAddStock} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  add stock
                </Button>
              </div>
            </Card>
          ) : (
            stocks.map(stock => {
              const latestPrice = stock.priceData?.[0];
              const currentPrice = latestPrice?.currentPrice || stock.purchasePrice;
              const presentValue = latestPrice?.presentValue || stock.investment;
              const gainLoss = latestPrice?.gainLoss || 0;
              const gainLossPercent = latestPrice?.gainLossPercent || 0;

              return (
                <Card key={stock.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1" onClick={() => handleRowClick(stock.id)}>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg text-slate-900 cursor-pointer hover:text-blue-600">
                          {stock.symbol}
                        </h3>
                        {stock.stage2 === 'Yes' && (
                          <Badge className="bg-green-600 text-xs">Stage 2</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{stock.name}</p>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {stock.sector}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          Qty: {stock.quantity}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-bold text-lg text-slate-900">
                        {formatCurrency(currentPrice)}
                      </p>
                      <div
                        className={`flex items-center gap-1 justify-end mt-1 ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {gainLoss >= 0 ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4" />
                        )}
                        <span className="text-sm font-bold">{formatPercent(gainLossPercent)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t mb-3">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Investment</p>
                      <p className="font-semibold text-sm text-slate-900">
                        {formatCurrency(stock.investment)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 mb-1">Present Value</p>
                      <p className="font-semibold text-sm text-slate-900">
                        {formatCurrency(presentValue)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={e => handleEditStock(stock, e)}
                      className="flex-1"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={e => handleDeleteStock(stock, e)}
                      className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <form onSubmit={handleSubmitAdd}>
            <DialogHeader>
              <DialogTitle>Add New Stock</DialogTitle>
              <DialogDescription>Add a new stock to your portfolio</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="symbol" className="text-right">
                  Symbol
                </Label>
                <Input
                  id="symbol"
                  value={formData.symbol}
                  onChange={e => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                  className="col-span-3"
                  placeholder="INFY.NS"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="col-span-3"
                  placeholder="Infosys"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="sector" className="text-right">
                  Sector
                </Label>
                <Input
                  id="sector"
                  value={formData.sector}
                  onChange={e => setFormData({ ...formData, sector: e.target.value })}
                  className="col-span-3"
                  placeholder="Tech Sector"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="exchange" className="text-right">
                  Exchange
                </Label>
                <Select
                  value={formData.exchange}
                  onValueChange={value => setFormData({ ...formData, exchange: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NSE">NSE</SelectItem>
                    <SelectItem value="BSE">BSE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="purchasePrice" className="text-right">
                  Purchase Price
                </Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  step="0.01"
                  value={formData.purchasePrice}
                  onChange={e => setFormData({ ...formData, purchasePrice: e.target.value })}
                  className="col-span-3"
                  placeholder="1450.00"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="quantity" className="text-right">
                  Quantity
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                  className="col-span-3"
                  placeholder="100"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? 'Adding...' : 'Add Stock'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <form onSubmit={handleSubmitEdit}>
            <DialogHeader>
              <DialogTitle>Edit Stock</DialogTitle>
              <DialogDescription>Update stock details</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-symbol" className="text-right">
                  Symbol
                </Label>
                <Input
                  id="edit-symbol"
                  value={formData.symbol}
                  onChange={e => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-sector" className="text-right">
                  Sector
                </Label>
                <Input
                  id="edit-sector"
                  value={formData.sector}
                  onChange={e => setFormData({ ...formData, sector: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-exchange" className="text-right">
                  Exchange
                </Label>
                <Select
                  value={formData.exchange}
                  onValueChange={value => setFormData({ ...formData, exchange: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NSE">NSE</SelectItem>
                    <SelectItem value="BSE">BSE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-purchasePrice" className="text-right">
                  Purchase Price
                </Label>
                <Input
                  id="edit-purchasePrice"
                  type="number"
                  step="0.01"
                  value={formData.purchasePrice}
                  onChange={e => setFormData({ ...formData, purchasePrice: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-quantity" className="text-right">
                  Quantity
                </Label>
                <Input
                  id="edit-quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? 'Updating...' : 'Update Stock'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Stock</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedStock?.name} ({selectedStock?.symbol})? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={formLoading}
            >
              {formLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

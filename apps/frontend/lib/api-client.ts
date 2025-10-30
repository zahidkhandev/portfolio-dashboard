import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    // if (error.response?.status === 401 && typeof window !== 'undefined') {
    //   localStorage.removeItem('token');
    //   window.location.href = '/login';
    // }
    return Promise.reject(error);
  },
);

// Auth API
export const authApi = {
  login: (username: string, password: string) => api.post('/auth/login', { username, password }),

  register: (username: string, email: string, password: string) =>
    api.post('/auth/register', { username, email, password }),
};

// Portfolio API
export const portfolioApi = {
  getMetrics: () => api.get('/portfolio/metrics'),
};

// Stocks API
export const stocksApi = {
  getAll: () => api.get('/stocks'),

  getById: (id: number) => api.get(`/stocks/${id}`),

  create: (data: {
    symbol: string;
    name: string;
    sector: string;
    purchasePrice: number;
    quantity: number;
    exchange: 'NSE' | 'BSE';
    marketCap?: string;
    peRatioTTM?: number;
  }) => api.post('/stocks', data),

  update: (
    id: number,
    data: Partial<{
      symbol: string;
      name: string;
      sector: string;
      purchasePrice: number;
      quantity: number;
      exchange: 'NSE' | 'BSE';
      marketCap?: string;
      peRatioTTM?: number;
    }>,
  ) => api.patch(`/stocks/${id}`, data),

  delete: (id: number) => api.delete(`/stocks/${id}`),
};

// Price Data API
export const priceDataApi = {
  refreshAll: () => api.post('/price-data/refresh-all'),

  refreshStock: (stockId: number) => api.post(`/price-data/${stockId}/refresh`),

  getLatest: (stockId: number) => api.get(`/price-data/${stockId}/latest`),

  getHistory: (stockId: number, startDate?: string, endDate?: string) =>
    api.get(`/price-data/${stockId}/history`, {
      params: { startDate, endDate },
    }),
};

// Stock Price API
export const stockPriceApi = {
  getCurrentPrice: (symbol: string) => api.get(`/price/${symbol}`),

  getFundamentals: (symbol: string) => api.get(`/price/${symbol}/fundamentals`),

  getCompleteFundamentals: (symbol: string, stockData: any) =>
    api.get(`/price/${symbol}/fundamentals/complete`, { data: stockData }),

  getHistoricalPrices: (symbol: string, startDate?: string, endDate?: string) =>
    api.get(`/price/${symbol}/historical`, {
      params: { startDate, endDate },
    }),

  getBatchPrices: (symbols: string[]) => api.post('/price/batch', { symbols }),
};

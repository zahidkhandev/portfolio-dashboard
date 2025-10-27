-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stocks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "purchasePrice" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL,
    "investment" DOUBLE PRECISION NOT NULL,
    "portfolioPercent" DOUBLE PRECISION NOT NULL,
    "exchange" TEXT NOT NULL,
    "marketCap" TEXT,
    "peRatioTTM" DOUBLE PRECISION,
    "latestEarnings" DOUBLE PRECISION,
    "revenueTTM" DOUBLE PRECISION,
    "ebitdaTTM" DOUBLE PRECISION,
    "ebitdaPercent" DOUBLE PRECISION,
    "pat" DOUBLE PRECISION,
    "patPercent" DOUBLE PRECISION,
    "cfoMarch24" DOUBLE PRECISION,
    "cfo5Years" DOUBLE PRECISION,
    "freeCashFlow5Years" DOUBLE PRECISION,
    "debtToEquity" DOUBLE PRECISION,
    "bookValue" DOUBLE PRECISION,
    "revenueGrowth3Y" DOUBLE PRECISION,
    "ebitdaGrowth3Y" DOUBLE PRECISION,
    "profitGrowth3Y" DOUBLE PRECISION,
    "marketCapGrowth3Y" DOUBLE PRECISION,
    "priceToSales" DOUBLE PRECISION,
    "cfoToEbitda" DOUBLE PRECISION,
    "cfoToPat" DOUBLE PRECISION,
    "priceToBook" DOUBLE PRECISION,
    "stage2" TEXT,
    "salePrice" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_data" (
    "id" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "currentPrice" DOUBLE PRECISION NOT NULL,
    "presentValue" DOUBLE PRECISION NOT NULL,
    "gainLoss" DOUBLE PRECISION NOT NULL,
    "gainLossPercent" DOUBLE PRECISION NOT NULL,
    "peRatio" DOUBLE PRECISION,
    "dividendYield" DOUBLE PRECISION,
    "dayHigh" DOUBLE PRECISION,
    "dayLow" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_cache" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "currentPrice" DOUBLE PRECISION NOT NULL,
    "peRatio" DOUBLE PRECISION,
    "marketCap" TEXT,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "stocks_userId_idx" ON "stocks"("userId");

-- CreateIndex
CREATE INDEX "stocks_sector_idx" ON "stocks"("sector");

-- CreateIndex
CREATE UNIQUE INDEX "stocks_userId_symbol_key" ON "stocks"("userId", "symbol");

-- CreateIndex
CREATE INDEX "price_data_stockId_timestamp_idx" ON "price_data"("stockId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "price_cache_symbol_key" ON "price_cache"("symbol");

-- CreateIndex
CREATE INDEX "price_cache_symbol_expiresAt_idx" ON "price_cache"("symbol", "expiresAt");

-- AddForeignKey
ALTER TABLE "stocks" ADD CONSTRAINT "stocks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_data" ADD CONSTRAINT "price_data_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

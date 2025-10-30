#!/bin/bash

echo ""
echo "===================================="
echo "Portfolio Dashboard - Setup Script"
echo "===================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js v20.0.0+"
    exit 1
fi

# Check if Docker or Podman is running
if ! docker ps &> /dev/null && ! podman ps &> /dev/null; then
    echo "Error: Docker or Podman is not running. Please start Docker/Podman first."
    exit 1
fi

echo "[1/6] Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "Error: Failed to install dependencies"
    exit 1
fi

echo ""
echo "[2/6] Creating .env file..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo ".env file created"
else
    echo ".env file already exists"
fi

echo ""
echo "[3/6] Starting database..."
npm run docker:db:up
sleep 5

echo ""
echo "[4/6] Generating Prisma client..."
npm run db:generate
if [ $? -ne 0 ]; then
    echo "Error: Failed to generate Prisma client"
    exit 1
fi

echo ""
echo "[5/6] Running migrations..."
npm run db:migrate:deploy
if [ $? -ne 0 ]; then
    echo "Error: Failed to run migrations"
    exit 1
fi

echo ""
echo "[6/6] Seeding database..."
npm run db:seed
if [ $? -ne 0 ]; then
    echo "Error: Failed to seed database"
    exit 1
fi

echo ""
echo "===================================="
echo "Setup Complete!"
echo "===================================="
echo ""
echo "Starting development servers..."
echo ""

npm run dev

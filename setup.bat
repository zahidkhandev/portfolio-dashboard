@echo off
setlocal enabledelayedexpansion

echo.
echo ====================================
echo Portfolio Dashboard - Setup Script
echo ====================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed. Please install Node.js v20.0.0+
    pause
    exit /b 1
)

REM Check if Docker/Podman is running
docker ps >nul 2>&1
if errorlevel 1 (
    podman ps >nul 2>&1
    if errorlevel 1 (
        echo Error: Docker or Podman is not running. Please start Docker/Podman first.
        pause
        exit /b 1
    )
)

echo [1/6] Installing dependencies...
call npm install
if errorlevel 1 (
    echo Error: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [2/6] Creating .env file...
if not exist .env (
    copy .env.example .env >nul
    echo .env file created
) else (
    echo .env file already exists
)

echo.
echo [3/6] Starting database...
call npm run docker:db:up
timeout /t 5 /nobreak

echo.
echo [4/6] Generating Prisma client...
call npm run db:generate
if errorlevel 1 (
    echo Error: Failed to generate Prisma client
    pause
    exit /b 1
)

echo.
echo [5/6] Running migrations...
call npm run db:migrate:deploy
if errorlevel 1 (
    echo Error: Failed to run migrations
    pause
    exit /b 1
)

echo.
echo [6/6] Seeding database...
call npm run db:seed
if errorlevel 1 (
    echo Error: Failed to seed database
    pause
    exit /b 1
)

echo.
echo ====================================
echo Setup Complete!
echo ====================================
echo.
echo Starting development servers...
echo.
call npm run dev

pause

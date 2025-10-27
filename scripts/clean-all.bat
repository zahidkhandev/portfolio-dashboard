@echo off
echo Cleaning all cache and artifacts...
echo.

REM Delete turbo cache
echo [1/7] Deleting .turbo folders...
if exist .turbo (
  rmdir /s /q .turbo
  echo   - Deleted root .turbo
) else (
  echo   - Root .turbo not found
)

if exist apps\backend\.turbo (
  rmdir /s /q apps\backend\.turbo
  echo   - Deleted apps\backend\.turbo
) else (
  echo   - apps\backend\.turbo not found
)

if exist packages\database\.turbo (
  rmdir /s /q packages\database\.turbo
  echo   - Deleted packages\database\.turbo
) else (
  echo   - packages\database\.turbo not found
)

REM Delete dist folders
echo [2/7] Deleting dist folders...
if exist apps\backend\dist (
  rmdir /s /q apps\backend\dist
  echo   - Deleted apps\backend\dist
) else (
  echo   - apps\backend\dist not found
)

if exist packages\database\client (
  rmdir /s /q packages\database\client
  echo   - Deleted packages\database\client
) else (
  echo   - packages\database\client not found
)

REM Kill processes
echo [3/7] Killing processes...
taskkill /f /im turbo.exe 2>nul && echo   - Killed turbo.exe || echo   - turbo.exe not running
taskkill /f /im node.exe 2>nul && echo   - Killed node.exe || echo   - node.exe not running

REM Delete node_modules
echo [4/7] Deleting root node_modules (this may take a while)...
if exist node_modules (
  rmdir /s /q node_modules
  echo   - Deleted root node_modules
) else (
  echo   - Root node_modules not found
)

echo [5/7] Deleting apps\backend\node_modules...
if exist apps\backend\node_modules (
  rmdir /s /q apps\backend\node_modules
  echo   - Deleted apps\backend\node_modules
) else (
  echo   - apps\backend\node_modules not found
)

echo [6/7] Deleting packages\database\node_modules...
if exist packages\database\node_modules (
  rmdir /s /q packages\database\node_modules
  echo   - Deleted packages\database\node_modules
) else (
  echo   - packages\database\node_modules not found
)

echo [7/7] Deleting package-lock.json...
if exist package-lock.json (
  del /f /q package-lock.json
  echo   - Deleted package-lock.json
) else (
  echo   - package-lock.json not found
)

echo.
echo Done! Now run: npm install
pause

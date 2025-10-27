Write-Host "Exporting FULL Codebase..." -ForegroundColor Cyan
Write-Host ("=" * 50) -ForegroundColor Cyan

$outputDir = "docs\context"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$outputFile = "$outputDir\portfolio_complete_$timestamp.md"
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

function Get-SyntaxLanguage {
    param([string]$Extension)
    switch ($Extension) {
        { $_ -in @('ts', 'tsx') } { 'typescript' }
        { $_ -in @('js', 'jsx', 'mjs') } { 'javascript' }
        'json' { 'json' }
        { $_ -in @('yaml', 'yml') } { 'yaml' }
        { $_ -in @('css', 'scss') } { 'css' }
        'prisma' { 'prisma' }
        'sql' { 'sql' }
        'html' { 'html' }
        default { 'text' }
    }
}

@"
# Portfolio Dashboard - Complete Export
**Generated:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') IST
---
"@ | Out-File -FilePath $outputFile -Encoding UTF8

function Add-FilesToContext {
    param([string]$SectionTitle, [array]$Files)
    if ($Files.Count -eq 0) { return }

    Write-Host "`n$SectionTitle" -ForegroundColor Yellow
    "## $SectionTitle" | Out-File -FilePath $outputFile -Append -Encoding UTF8
    "" | Out-File -FilePath $outputFile -Append -Encoding UTF8

    foreach ($file in ($Files | Sort-Object FullName)) {
        $relativePath = $file.FullName.Replace((Get-Location).Path + '\', '')
        $lang = Get-SyntaxLanguage -Extension $file.Extension.TrimStart('.')

        "### ``$relativePath``" | Out-File -FilePath $outputFile -Append -Encoding UTF8
        "``````$lang" | Out-File -FilePath $outputFile -Append -Encoding UTF8
        Get-Content $file.FullName -Raw | Out-File -FilePath $outputFile -Append -Encoding UTF8
        "``````" | Out-File -FilePath $outputFile -Append -Encoding UTF8
        "" | Out-File -FilePath $outputFile -Append -Encoding UTF8
        Write-Host "  + $relativePath" -ForegroundColor DarkGray
    }

    "---" | Out-File -FilePath $outputFile -Append -Encoding UTF8
    Write-Host "  Exported $($Files.Count) files" -ForegroundColor Green
}

$totalFiles = 0

# ===== BACKEND =====
if (Test-Path "apps\backend\src") {
    $backendFiles = Get-ChildItem -Path "apps\backend\src" -Include *.ts,*.js -Recurse -File
    Add-FilesToContext "Backend Source" $backendFiles
    $totalFiles += $backendFiles.Count
}

# ===== FRONTEND - EVERYTHING =====

# App Router (Next.js 13+)
if (Test-Path "apps\frontend\app") {
    $appFiles = Get-ChildItem -Path "apps\frontend\app" -Include *.ts,*.tsx,*.jsx,*.js,*.css -Recurse -File
    Add-FilesToContext "Frontend - App Router" $appFiles
    $totalFiles += $appFiles.Count
}

# Components
if (Test-Path "apps\frontend\components") {
    $componentFiles = Get-ChildItem -Path "apps\frontend\components" -Include *.ts,*.tsx,*.jsx,*.js,*.css -Recurse -File
    Add-FilesToContext "Frontend - Components" $componentFiles
    $totalFiles += $componentFiles.Count
}

# Lib/Utils
if (Test-Path "apps\frontend\lib") {
    $libFiles = Get-ChildItem -Path "apps\frontend\lib" -Include *.ts,*.tsx,*.jsx,*.js -Recurse -File
    Add-FilesToContext "Frontend - Lib/Utils" $libFiles
    $totalFiles += $libFiles.Count
}

# Public (HTML, SVG only - no images)
if (Test-Path "apps\frontend\public") {
    $publicFiles = Get-ChildItem -Path "apps\frontend\public" -Include *.html,*.svg,*.xml,*.json -Recurse -File
    if ($publicFiles.Count -gt 0) {
        Add-FilesToContext "Frontend - Public Assets" $publicFiles
        $totalFiles += $publicFiles.Count
    }
}

# Styles (if separate)
if (Test-Path "apps\frontend\styles") {
    $styleFiles = Get-ChildItem -Path "apps\frontend\styles" -Include *.css,*.scss -Recurse -File
    if ($styleFiles.Count -gt 0) {
        Add-FilesToContext "Frontend - Styles" $styleFiles
        $totalFiles += $styleFiles.Count
    }
}

# ===== DATABASE =====
if (Test-Path "packages\database\prisma") {
    $schemaFiles = Get-ChildItem -Path "packages\database\prisma" -Include *.prisma,*.sql,*.ts -Recurse -File
    Add-FilesToContext "Database Schema & Migrations" $schemaFiles
    $totalFiles += $schemaFiles.Count
}

# ===== CONFIGS =====

# Root
$rootFiles = @(".env", "package.json", "turbo.json") | Where-Object { Test-Path $_ } | ForEach-Object { Get-Item $_ }
Add-FilesToContext "Root Config" $rootFiles
$totalFiles += $rootFiles.Count

# Backend
$backendConfigs = @("apps\backend\package.json", "apps\backend\tsconfig.json", "apps\backend\nest-cli.json") | Where-Object { Test-Path $_ } | ForEach-Object { Get-Item $_ }
Add-FilesToContext "Backend Config" $backendConfigs
$totalFiles += $backendConfigs.Count

# Frontend - ALL configs
$frontendConfigs = @(
    "apps\frontend\package.json",
    "apps\frontend\tsconfig.json",
    "apps\frontend\next.config.ts",
    "apps\frontend\next.config.js",
    "apps\frontend\next.config.mjs",
    "apps\frontend\next-env.d.ts",
    "apps\frontend\tailwind.config.ts",
    "apps\frontend\tailwind.config.js",
    "apps\frontend\postcss.config.mjs",
    "apps\frontend\components.json",
    "apps\frontend\eslint.config.mjs"
) | Where-Object { Test-Path $_ } | ForEach-Object { Get-Item $_ }

if ($frontendConfigs.Count -gt 0) {
    Add-FilesToContext "Frontend Config" $frontendConfigs
    $totalFiles += $frontendConfigs.Count
}

# Docker
if (Test-Path "docker") {
    $dockerFiles = Get-ChildItem -Path "docker" -Include *.yaml,*.yml -File
    Add-FilesToContext "Docker Config" $dockerFiles
    $totalFiles += $dockerFiles.Count
}

$fileSize = (Get-Item $outputFile).Length
"## Summary: $totalFiles files, $([math]::Round($fileSize / 1MB, 2)) MB" | Out-File -FilePath $outputFile -Append -Encoding UTF8

Write-Host "`n" + ("=" * 50) -ForegroundColor Green
Write-Host "COMPLETE! $totalFiles files → $outputFile" -ForegroundColor Green
Write-Host "Size: $([math]::Round($fileSize / 1MB, 2)) MB" -ForegroundColor Cyan
Write-Host ("=" * 50) -ForegroundColor Green

# PowerShell script to add UDO WhatsApp configuration to .env file
# Run this script to configure the hookback system

$envFile = ".env"

Write-Host "Setting up UDO WhatsApp Hookback Configuration..." -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (-not (Test-Path $envFile)) {
    Write-Host ".env file not found!" -ForegroundColor Red
    Write-Host "Please create a .env file first." -ForegroundColor Yellow
    exit 1
}

Write-Host "Found .env file" -ForegroundColor Green
Write-Host ""

# Read current .env content
$envContent = Get-Content $envFile -Raw

# Configuration values
$configs = @{
    "UDO_API_KEY" = "Tg0vpLEyKZYZdP0qkMpnAg6XxFySQE"
    "UDO_WHATSAPP_NUMBER" = "+918112367069"
    "UDO_HOOKBACK_TEMPLATE_NAME" = "aigf"
    "HOOKBACK_INACTIVE_DAYS" = "3"
    "ENABLE_HOOKBACKS" = "true"
}

$added = 0
$updated = 0

# Add or update each configuration
foreach ($key in $configs.Keys) {
    $value = $configs[$key]
    $pattern = "^$key=.*$"
    
    if ($envContent -match "(?m)^$key=") {
        # Update existing value
        $envContent = $envContent -replace "(?m)^$key=.*", "$key=$value"
        Write-Host "  Updated: $key" -ForegroundColor Yellow
        $updated++
    } else {
        # Add new value
        if ($envContent -notmatch "`n$") {
            $envContent += "`n"
        }
        $envContent += "$key=$value`n"
        Write-Host "  Added: $key" -ForegroundColor Green
        $added++
    }
}

# Write back to .env file
Set-Content -Path $envFile -Value $envContent -NoNewline

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Configuration Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Added: $added variables" -ForegroundColor Green
Write-Host "Updated: $updated variables" -ForegroundColor Yellow
Write-Host ""
Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  UDO_API_KEY: Tg0vpLEyKZYZdP0qkMpnAg6XxFySQE"
Write-Host "  UDO_WHATSAPP_NUMBER: +918112367069"
Write-Host "  UDO_HOOKBACK_TEMPLATE_NAME: aigf"
Write-Host "  HOOKBACK_INACTIVE_DAYS: 3"
Write-Host "  ENABLE_HOOKBACKS: true"
Write-Host ""
Write-Host "The hookback service will start automatically when the server starts!" -ForegroundColor Green
Write-Host ""

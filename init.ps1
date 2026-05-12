# Check environment
Write-Host "Checking environment..."

# Check Node.js
try {
    $nodeVersion = node -v
    Write-Host "Node version: $nodeVersion"
} catch {
    Write-Error "Node.js is not installed."
    exit 1
}

# Check if dependencies are installed
if (!(Test-Path "node_modules")) {
    Write-Host "node_modules not found. Installing dependencies..."
    npm install
} else {
    Write-Host "node_modules found."
}

Write-Host "Environment is healthy."

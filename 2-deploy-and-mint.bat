@echo off
echo ========================================
echo Deploying Contracts and Minting Tokens
echo ========================================
echo.

cd /d "%~dp0"

echo Step 1: Deploying contracts...
npx hardhat run scripts/deploy.js --network localhost
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Deployment failed!
    echo Make sure the Hardhat node is running in another window.
    pause
    exit /b 1
)

echo.
echo Step 2: Minting tokens...
npx hardhat run scripts/mint.js --network localhost
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Minting failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo SUCCESS! Contracts deployed and tokens minted
echo ========================================
echo.
echo Now check the output above and copy the contract addresses.
echo You'll need to update frontend/app.js with these addresses.
echo.
pause

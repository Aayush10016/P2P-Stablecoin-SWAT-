@echo off
echo ========================================
echo Starting Hardhat Local Node
echo ========================================
echo.
echo This will start a local blockchain at http://127.0.0.1:8545
echo Keep this window open!
echo.

cd /d "%~dp0"
npx hardhat node

pause

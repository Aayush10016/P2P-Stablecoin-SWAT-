@echo off
echo ========================================
echo Starting Frontend Server
echo ========================================
echo.

cd /d "%~dp0\frontend"

echo Server will start at: http://127.0.0.1:8080
echo.
echo Press Ctrl+C to stop the server
echo.

npx http-server -p 8080 -c-1

pause

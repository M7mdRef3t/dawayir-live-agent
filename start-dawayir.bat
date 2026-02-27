@echo off
REM ====================================
REM Dawayir Live Agent - Clean Startup
REM ====================================

echo.
echo ======================================
echo   Dawayir Live Agent - Starting...
echo ======================================
echo.

REM Kill all existing Node.js processes
echo [1/4] Cleaning up old processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

REM Start backend server in new window
echo [2/4] Starting backend server...
start "Dawayir Server" cmd /k "cd /d %~dp0server && npm start"
timeout /t 5 >nul

REM Start frontend client in new window
echo [3/4] Starting frontend client...
start "Dawayir Client" cmd /k "cd /d %~dp0client && npm run dev"
timeout /t 3 >nul

echo [4/4] Opening browser...
timeout /t 5 >nul
start http://localhost:5173

echo.
echo ======================================
echo   Dawayir is running!
echo ======================================
echo.
echo   Backend:  http://localhost:8080
echo   Frontend: http://localhost:5173
echo.
echo   Two windows have been opened for
echo   server and client terminals.
echo.
echo   Press Ctrl+C in each window to stop.
echo ======================================
echo.

pause

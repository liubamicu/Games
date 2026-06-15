@echo off
cd /d "%~dp0"

echo [1/4] Installing hub dependencies...
call npm install

echo [2/4] Installing Banana Invaders dependencies...
cd /d "%~dp0space-invaders\frontend"
call npm install
cd /d "%~dp0"

echo [3/4] Installing Snake Game dependencies...
cd /d "%~dp0snake-game\frontend"
call npm install
cd /d "%~dp0"

echo [4/4] Installing Tetris dependencies...
cd /d "%~dp0tetris-game"
call npm install
cd /d "%~dp0"

echo.
echo All dependencies installed! Starting games...
timeout /t 2 /nobreak >nul
start http://localhost:4000
call npm start
pause

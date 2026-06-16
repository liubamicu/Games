@echo off
cd /d "%~dp0"

echo === SHP Arcade : one-port build ^& run ===

echo [1/5] Installing Python deps...
call py -m pip install -r requirements.txt

echo [2/5] Building Banana Invaders...
cd /d "%~dp0space-invaders\frontend"
call npm install
call npm run build
cd /d "%~dp0"

echo [3/5] Building Snake...
cd /d "%~dp0snake-game\frontend"
call npm install
call npm run build
cd /d "%~dp0"

echo [4/5] Building Tetris...
cd /d "%~dp0tetris-game"
call npm install
call npm run build
cd /d "%~dp0"

echo [5/5] Starting server on http://localhost:4000 ...
start http://localhost:4000
py server.py
pause

@echo off
setlocal
cd /d "%~dp0"

where py >nul 2>&1
if not errorlevel 1 (
  start "Tally Market server" /b py -m http.server 8000 --bind 127.0.0.1
  goto launch
)

where python >nul 2>&1
if not errorlevel 1 (
  start "Tally Market server" /b python -m http.server 8000 --bind 127.0.0.1
  goto launch
)

echo Python 3 is required to run this project.
echo Install Python from https://www.python.org/downloads/ and try again.
pause
exit /b 1

:launch
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8000/index.html"
echo Tally Market is running at http://127.0.0.1:8000
echo Keep this window open while using the website.
pause

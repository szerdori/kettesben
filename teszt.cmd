@echo off
rem Dupla kattintással indítható: lefuttatja a teszteket.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0teszt.ps1" %*
pause

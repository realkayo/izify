@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1" -SourceRoot "%~dp0." -NoPauseOnError %*
set "IZIFY_INSTALL_EXIT=%ERRORLEVEL%"
echo.
if not "%IZIFY_INSTALL_EXIT%"=="0" echo Nao foi possivel instalar. Confira o erro acima.
if not defined IZIFY_NO_PAUSE pause
exit /b %IZIFY_INSTALL_EXIT%

@echo off
chcp 65001 >nul
setlocal

set "EXT_ID=com.alexc.massmarkerexport"
set "SRC=%~dp0"
set "DEST=%APPDATA%\Adobe\CEP\extensions\%EXT_ID%"

echo Установка Mass Marker Export в:
echo   %DEST%
echo.

robocopy "%SRC%." "%DEST%" /MIR /NFL /NDL /NJH /NJS /NP ^
  /XF install.bat uninstall.bat README.md ^
  /XD .git .claude >nul
if %ERRORLEVEL% GEQ 8 (
  echo Ошибка копирования файлов ^(robocopy код %ERRORLEVEL%^).
  pause
  exit /b 1
)

rem Разрешаем загрузку неподписанных CEP-расширений (Premiere Pro 2020-2025).
for %%V in (9 10 11 12) do (
  reg add "HKCU\Software\Adobe\CSXS.%%V" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul
)

echo Готово. Перезапустите Premiere Pro и откройте:
echo   Window ^> Extensions ^> Mass Marker Export
echo.
pause

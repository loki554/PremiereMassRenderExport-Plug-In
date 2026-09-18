@echo off
chcp 65001 >nul

set "DEST=%APPDATA%\Adobe\CEP\extensions\com.alexc.massmarkerexport"

if exist "%DEST%" (
  rmdir /s /q "%DEST%"
  echo Mass Marker Export удалён. Перезапустите Premiere Pro.
) else (
  echo Расширение не установлено.
)
pause

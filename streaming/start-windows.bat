@echo off
setlocal
cd /d "%~dp0"

echo BLW Kenya Zone - MediaMTX local livestream

echo.

if not exist "mediamtx.exe" (
  echo MediaMTX is not installed in this folder.
  echo.
  echo Download the Windows AMD64 release from the official MediaMTX releases page:
  echo https://github.com/bluenviron/mediamtx/releases
  echo Extract mediamtx.exe into this streaming folder, then run this file again.
  echo.
  pause
  exit /b 1
)

if not exist "mediamtx.yml" (
  echo ERROR: mediamtx.yml was not found.
  pause
  exit /b 1
)

echo Starting MediaMTX...
echo RTMP ingest: rtmp://localhost:1935/live
echo HLS playback: http://localhost:8888/live/index.m3u8
echo.
mediamtx.exe mediamtx.yml

endlocal

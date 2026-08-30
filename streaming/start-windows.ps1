$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

Write-Host 'BLW Kenya Zone - MediaMTX local livestream'

if (-not (Test-Path '.\mediamtx.exe')) {
  Write-Host ''
  Write-Host 'MediaMTX is not installed in this folder.' -ForegroundColor Yellow
  Write-Host 'Download the Windows AMD64 release from the official MediaMTX releases page:'
  Write-Host 'https://github.com/bluenviron/mediamtx/releases'
  Write-Host 'Extract mediamtx.exe into this streaming folder, then run this script again.'
  exit 1
}

if (-not (Test-Path '.\mediamtx.yml')) {
  throw 'mediamtx.yml was not found.'
}

Write-Host 'Starting MediaMTX...'
Write-Host 'RTMP ingest: rtmp://localhost:1935/live'
Write-Host 'HLS playback: http://localhost:8888/live/index.m3u8'
Write-Host ''

& .\mediamtx.exe .\mediamtx.yml

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$AndroidRes = Join-Path $Root "client\android\app\src\main\res"
if (-not (Test-Path $AndroidRes)) {
  throw "Could not find $AndroidRes. Put this script in the EMET project root (the folder containing client)."
}

$src = Join-Path $Root "assets"
$sizes = @{
  "mipmap-mdpi"="emet_icon_48.png";
  "mipmap-hdpi"="emet_icon_72.png";
  "mipmap-xhdpi"="emet_icon_96.png";
  "mipmap-xxhdpi"="emet_icon_144.png";
  "mipmap-xxxhdpi"="emet_icon_192.png"
}
foreach ($d in $sizes.Keys) {
  $destDir = Join-Path $AndroidRes $d
  New-Item -ItemType Directory -Force -Path $destDir | Out-Null
  Copy-Item (Join-Path $src $sizes[$d]) (Join-Path $destDir "emet_icon.png") -Force
}

# Remove the malformed SVG-style Android vector that caused resource linking to fail.
Get-ChildItem $AndroidRes -Recurse -Filter "emet_icon_black.xml" -ErrorAction SilentlyContinue | Remove-Item -Force

# Point both standard and round launcher icons at the PNG resource.
$manifest = Join-Path $Root "client\android\app\src\main\AndroidManifest.xml"
if (Test-Path $manifest) {
  $text = Get-Content $manifest -Raw
  $text = [regex]::Replace($text, 'android:icon="@mipmap/[^"]+"', 'android:icon="@mipmap/emet_icon"')
  $text = [regex]::Replace($text, 'android:roundIcon="@mipmap/[^"]+"', 'android:roundIcon="@mipmap/emet_icon"')
  Set-Content -Path $manifest -Value $text -Encoding UTF8
}
Write-Host "EMET branding installed: icon + launcher PNGs + broken vector removed."

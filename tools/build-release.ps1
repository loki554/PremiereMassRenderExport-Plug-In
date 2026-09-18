<#
.SYNOPSIS
    Builds the release packages: a signed .zxp and a .zip for manual install.

.DESCRIPTION
    1. Reads the version from CSXS/manifest.xml.
    2. Stages only the runtime files (no .debug, scripts, docs).
    3. Downloads Adobe's ZXPSignCmd into tools/bin if it is missing.
    4. Creates a self-signed certificate on first run (stored outside the repo).
    5. Signs the package with a timestamp and verifies the signature.
    6. Produces dist/MassMarkerExport-<version>.zxp and .zip.

    The certificate password is taken from $env:MME_CERT_PASSWORD, or generated
    once and saved next to the certificate.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File tools\build-release.ps1
#>
[CmdletBinding()]
param(
    [string]$CertDir = (Join-Path $env:USERPROFILE '.mass-marker-export'),
    [string]$TimestampUrl = 'http://timestamp.digicert.com'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$extensionId = 'com.alexc.massmarkerexport'
$runtimeItems = @('CSXS', 'css', 'js', 'jsx', 'index.html')
$zxpSignUrl = 'https://raw.githubusercontent.com/Adobe-CEP/CEP-Resources/master/ZXPSignCMD/4.1.3/x64/ZXPSignCmd.exe'

[xml]$manifest = Get-Content -Raw -Encoding UTF8 (Join-Path $root 'CSXS\manifest.xml')
$version = $manifest.ExtensionManifest.ExtensionBundleVersion
Write-Host "Building Mass Marker Export v$version"

# --- Signing tool
$binDir = Join-Path $root 'tools\bin'
$zxpSign = Join-Path $binDir 'ZXPSignCmd.exe'
if (-not (Test-Path $zxpSign)) {
    New-Item -ItemType Directory -Force $binDir | Out-Null
    Write-Host "Downloading ZXPSignCmd..."
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $zxpSignUrl -OutFile $zxpSign -UseBasicParsing
}

# --- Certificate
New-Item -ItemType Directory -Force $CertDir | Out-Null
$cert = Join-Path $CertDir 'cert.p12'
$passFile = Join-Path $CertDir 'cert-password.txt'
$password = $env:MME_CERT_PASSWORD
if (-not $password) {
    if (Test-Path $passFile) {
        $password = (Get-Content -Raw $passFile).Trim()
    } else {
        $password = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 24 | ForEach-Object { [char]$_ })
        Set-Content -Path $passFile -Value $password -NoNewline
    }
}
if (-not (Test-Path $cert)) {
    Write-Host "Creating self-signed certificate at $cert"
    & $zxpSign -selfSignedCert RU Moscow MassMarkerExport 'Mass Marker Export' $password $cert -validityDays 3650
    if ($LASTEXITCODE -ne 0) { throw "Certificate creation failed ($LASTEXITCODE)" }
}

# --- Stage runtime files
$dist = Join-Path $root 'dist'
$stage = Join-Path $dist 'stage'
if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
New-Item -ItemType Directory -Force $stage | Out-Null
foreach ($item in $runtimeItems) {
    Copy-Item -Recurse -Path (Join-Path $root $item) -Destination $stage
}

# --- Sign
$baseName = "MassMarkerExport-$version"
$zxp = Join-Path $dist "$baseName.zxp"
$zip = Join-Path $dist "$baseName.zip"
Remove-Item -Force -ErrorAction SilentlyContinue $zxp, $zip

& $zxpSign -sign $stage $zxp $cert $password -tsa $TimestampUrl
if ($LASTEXITCODE -ne 0) { throw "Signing failed ($LASTEXITCODE)" }
& $zxpSign -verify $zxp
if ($LASTEXITCODE -ne 0) { throw "Signature verification failed ($LASTEXITCODE)" }

# --- ZIP for manual install: the signed package contents inside the extension folder
# (entries are copied one by one: ZipFile.CreateFromDirectory on .NET Framework writes
# backslash separators, which breaks extraction on macOS)
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$source = [IO.Compression.ZipFile]::OpenRead($zxp)
$target = [IO.Compression.ZipFile]::Open($zip, [IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($entry in $source.Entries) {
        $name = "$extensionId/" + $entry.FullName.Replace('\', '/')
        $out = $target.CreateEntry($name, [IO.Compression.CompressionLevel]::Optimal)
        $out.LastWriteTime = $entry.LastWriteTime
        $in = $entry.Open(); $dst = $out.Open()
        try { $in.CopyTo($dst) } finally { $dst.Dispose(); $in.Dispose() }
    }
} finally {
    $target.Dispose()
    $source.Dispose()
}

Remove-Item -Recurse -Force $stage

Write-Host ""
Write-Host "Done:"
Get-Item $zxp, $zip | ForEach-Object { "  {0}  ({1:N0} KB)" -f $_.FullName, ($_.Length / 1KB) }

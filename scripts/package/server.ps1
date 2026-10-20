# Tiny local web server for the Campus Compass app (Windows).
# Uses only what ships with Windows: PowerShell 5 and System.Net.HttpListener.
# Nothing to install, no administrator rights needed. It only listens on this computer (127.0.0.1).
# start.bat runs this. To run it by hand:  powershell -ExecutionPolicy Bypass -File server.ps1
param(
    [int]$Port = 8765,        # first port to try; if it is busy, the next free one is used
    [string]$Root = '',       # folder to serve (default: the "app" folder next to this script)
    [switch]$NoBrowser        # don't open the browser (also: set the CAMPUS_NO_BROWSER environment variable)
)

$ErrorActionPreference = 'Stop'
if (-not $Root) { $Root = Join-Path $PSScriptRoot 'app' }

# File type for each extension. Browsers refuse some files (for example .wasm) with the wrong type.
$mime = @{
    '.html'        = 'text/html; charset=utf-8'
    '.htm'         = 'text/html; charset=utf-8'
    '.js'          = 'text/javascript; charset=utf-8'
    '.mjs'         = 'text/javascript; charset=utf-8'
    '.css'         = 'text/css; charset=utf-8'
    '.json'        = 'application/json; charset=utf-8'
    '.map'         = 'application/json; charset=utf-8'
    '.wasm'        = 'application/wasm'
    '.glb'         = 'model/gltf-binary'
    '.gltf'        = 'model/gltf+json'
    '.svg'         = 'image/svg+xml'
    '.png'         = 'image/png'
    '.jpg'         = 'image/jpeg'
    '.jpeg'        = 'image/jpeg'
    '.gif'         = 'image/gif'
    '.webp'        = 'image/webp'
    '.ico'         = 'image/x-icon'
    '.webmanifest' = 'application/manifest+json'
    '.txt'         = 'text/plain; charset=utf-8'
    '.woff'        = 'font/woff'
    '.woff2'       = 'font/woff2'
}

$rootFull = [System.IO.Path]::GetFullPath($Root).TrimEnd('\')
if (-not (Test-Path -LiteralPath (Join-Path $rootFull 'index.html'))) {
    Write-Host "Could not find the app in: $rootFull" -ForegroundColor Red
    Write-Host 'Make sure you unzipped the whole campus-app folder before starting.'
    exit 1
}

# Look for a free port, starting with $Port.
$listener = $null
foreach ($p in $Port..($Port + 50)) {
    $candidate = New-Object System.Net.HttpListener
    $candidate.Prefixes.Add("http://127.0.0.1:$p/")
    try {
        $candidate.Start()
        $listener = $candidate
        $Port = $p
        break
    } catch {
        $candidate.Close()
    }
}
if (-not $listener) {
    Write-Host 'Could not start the local server (no free port found).' -ForegroundColor Red
    exit 1
}

$url = "http://127.0.0.1:$Port/"
$Host.UI.RawUI.WindowTitle = 'Campus Compass'
Write-Host ''
Write-Host '  Campus Compass is running.' -ForegroundColor Green
Write-Host "  Address: $url"
Write-Host ''
Write-Host '  Keep this window open while you use the app.'
Write-Host '  Close this window to stop it.'
Write-Host ''

if (-not $NoBrowser -and -not $env:CAMPUS_NO_BROWSER) {
    try { Start-Process $url } catch { Write-Host "  Open this address in your browser: $url" }
}

function Send-Text($response, [int]$code, [string]$text) {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($text)
    $response.StatusCode = $code
    $response.ContentType = 'text/plain; charset=utf-8'
    $response.ContentLength64 = $bytes.Length
    $response.OutputStream.Write($bytes, 0, $bytes.Length)
}

function Handle-Request($context) {
    $request = $context.Request
    $response = $context.Response
    if ($request.HttpMethod -ne 'GET' -and $request.HttpMethod -ne 'HEAD') {
        Send-Text $response 405 'Method not allowed'
        return
    }

    $path = [System.Uri]::UnescapeDataString($request.Url.AbsolutePath)
    if ($path -eq '/') { $path = '/index.html' }
    $file = [System.IO.Path]::GetFullPath((Join-Path $rootFull ($path.TrimStart('/').Replace('/', '\'))))

    # Never serve anything outside the app folder.
    if (-not $file.StartsWith($rootFull + '\', [System.StringComparison]::OrdinalIgnoreCase)) {
        Send-Text $response 403 'Forbidden'
        return
    }
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
        if ([System.IO.Path]::GetExtension($file)) {
            Send-Text $response 404 'Not found'
            return
        }
        $file = Join-Path $rootFull 'index.html'   # any other address opens the app
    }

    $type = $mime[[System.IO.Path]::GetExtension($file).ToLowerInvariant()]
    if (-not $type) { $type = 'application/octet-stream' }
    $bytes = [System.IO.File]::ReadAllBytes($file)
    $response.StatusCode = 200
    $response.ContentType = $type
    $response.ContentLength64 = $bytes.Length
    $response.Headers.Add('Cache-Control', 'no-store')   # always the current version, never an old cached one
    if ($request.HttpMethod -ne 'HEAD') { $response.OutputStream.Write($bytes, 0, $bytes.Length) }
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        try {
            Handle-Request $context
        } catch {
            try { $context.Response.StatusCode = 500 } catch { }
        } finally {
            try { $context.Response.OutputStream.Close() } catch { }
            try { $context.Response.Close() } catch { }
        }
    }
} finally {
    $listener.Stop()
}

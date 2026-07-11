$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BuildDir = Join-Path $Root ".lambda-build"
$ZipPath = Join-Path $Root "asset-management-lambda.zip"

if (Test-Path $BuildDir) {
    Remove-Item -LiteralPath $BuildDir -Recurse -Force
}
if (Test-Path $ZipPath) {
    Remove-Item -LiteralPath $ZipPath -Force
}

New-Item -ItemType Directory -Path $BuildDir | Out-Null

$Python = Get-Command python -ErrorAction SilentlyContinue
if ($Python) {
    & $Python.Source -m pip install -r (Join-Path $Root "requirements.txt") -t $BuildDir
} else {
    $Py = Get-Command py -ErrorAction SilentlyContinue
    if (-not $Py) {
        throw "Python was not found. Install Python 3.11+ or add python/py to PATH."
    }
    & $Py.Source -m pip install -r (Join-Path $Root "requirements.txt") -t $BuildDir
}

Copy-Item -Path (Join-Path $Root "app") -Destination $BuildDir -Recurse
Copy-Item -Path (Join-Path $Root "static") -Destination $BuildDir -Recurse
Copy-Item -Path (Join-Path $Root "lambda_function.py") -Destination $BuildDir

Compress-Archive -Path (Join-Path $BuildDir "*") -DestinationPath $ZipPath -Force

Write-Host "Created $ZipPath"
Write-Host "AWS Lambda handler: lambda_function.handler"

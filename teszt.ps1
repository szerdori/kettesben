# Lefuttatja a Kettesben regressziós tesztjeit (tesztek\tesztek.js) egy láthatatlan böngészőben.
# Használat:  .\teszt.ps1               – minden teszt
#             .\teszt.ps1 -Csak szinkron – csak azok, amelyek nevében szerepel a szó
#             .\teszt.ps1 -Lathato       – látható böngészőablakban fut (hibakereséshez)
# Kilépési kód: 0 ha minden teszt sikeres, 1 ha nem. A feltoltes.ps1 feltöltés előtt lefuttatja.
param([string]$Csak, [switch]$Lathato, [int]$Port = 8771, [int]$Idokorlat = 240)

$ErrorActionPreference = 'Stop'
$gyoker = $PSScriptRoot

$bongeszo = @(
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $bongeszo) { Write-Host 'Nem találok Edge vagy Chrome böngészőt a tesztekhez.' -ForegroundColor Red; exit 1 }

$tipusok = @{ '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.svg' = 'image/svg+xml'
  '.png' = 'image/png'; '.webmanifest' = 'application/manifest+json'; '.json' = 'application/json' }

$figyelo = New-Object System.Net.HttpListener
$figyelo.Prefixes.Add("http://localhost:$Port/")
try { $figyelo.Start() } catch { Write-Host "A $Port-es port foglalt. Próbáld így: .\teszt.ps1 -Port 8790" -ForegroundColor Red; exit 1 }

$profil = Join-Path $env:TEMP ("kettesben-teszt-" + [guid]::NewGuid())
$cim = "http://localhost:$Port/tesztek/index.html" + $(if ($Csak) { '?csak=' + [uri]::EscapeDataString($Csak) } else { '' })
$kapcsolok = @("--user-data-dir=`"$profil`"", '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--window-size=1000,900')
if (-not $Lathato) { $kapcsolok += '--headless=new' }
$folyamat = Start-Process -FilePath $bongeszo -ArgumentList ($kapcsolok + $cim) -PassThru

Write-Host "Tesztek futnak… ($cim)" -ForegroundColor Cyan
$eredmeny = $null
$hatarido = (Get-Date).AddSeconds($Idokorlat)
try {
  while (-not $eredmeny -and (Get-Date) -lt $hatarido) {
    $keres = $figyelo.GetContextAsync()
    while (-not $keres.Wait(250)) { if ((Get-Date) -ge $hatarido) { break } }
    if (-not $keres.IsCompleted) { break }
    $k = $keres.Result
    $ut = [Uri]::UnescapeDataString($k.Request.Url.AbsolutePath.TrimStart('/'))
    if ($k.Request.HttpMethod -eq 'POST' -and $ut -eq 'eredmeny') {
      $olvaso = New-Object System.IO.StreamReader($k.Request.InputStream, [Text.Encoding]::UTF8)
      $eredmeny = $olvaso.ReadToEnd()
      $k.Response.StatusCode = 204
    } else {
      if (-not $ut) { $ut = 'index.html' }
      $fajl = [IO.Path]::GetFullPath((Join-Path $gyoker $ut))
      if ($fajl.StartsWith($gyoker) -and (Test-Path $fajl -PathType Leaf)) {
        $bajtok = [IO.File]::ReadAllBytes($fajl)
        $tipus = $tipusok[[IO.Path]::GetExtension($fajl)]
        $k.Response.ContentType = $(if ($tipus) { $tipus } else { 'application/octet-stream' })
        $k.Response.Headers.Add('Cache-Control', 'no-store')
        $k.Response.OutputStream.Write($bajtok, 0, $bajtok.Length)
      } else { $k.Response.StatusCode = 404 }
    }
    $k.Response.Close()
  }
} finally {
  $figyelo.Stop()
  if (-not $Lathato -or $eredmeny) {
    try { Stop-Process -Id $folyamat.Id -Force -ErrorAction Stop } catch {}
    Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*$profil*" } | ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {} }
    Start-Sleep -Milliseconds 500
    try { [IO.Directory]::Delete($profil, $true) } catch {}
  }
}

if (-not $eredmeny) { Write-Host "A tesztek nem futottak le $Idokorlat másodperc alatt." -ForegroundColor Red; exit 1 }

$hibas = 0
foreach ($sor in ($eredmeny -split "`n")) {
  if ($sor -like 'HIBA*') { $hibas++; Write-Host $sor -ForegroundColor Red }
  elseif ($sor -like 'EREDMÉNY*') { Write-Host ''; Write-Host $sor -ForegroundColor $(if ($hibas) { 'Red' } else { 'Green' }) }
  else { Write-Host $sor -ForegroundColor DarkGreen }
}
if ($hibas) { exit 1 } else { exit 0 }

[CmdletBinding()]
param([switch]$ShowError, [Parameter(ValueFromRemainingArguments=$true)][string[]]$SpotifyArguments)
$ErrorActionPreference = 'Stop'
if ($ShowError) {
    Write-Host 'Nao foi possivel iniciar o Izify.' -ForegroundColor Red
    Get-Content -LiteralPath (Join-Path $PSScriptRoot 'auto-start.log') -Tail 6 -ErrorAction SilentlyContinue | Write-Host
    Write-Host 'Spotify Desktop: https://download.scdn.co/SpotifySetup.exe'
    Write-Host 'Esta janela fica aberta para voce ler o erro.'
    return
}
try {
    . (Join-Path $PSScriptRoot 'tools/auto-start.ps1')
    $installation = Assert-IzifySpotifyDesktop
    $exe = $installation.Path
    Write-IzifyMonitorStatus -Root $PSScriptRoot -State 'launching' -Message ('Abrindo ' + $installation.Label + ' com depuracao local.') -Kind $installation.Kind
    Start-IzifyMonitor -Root $PSScriptRoot
    $arguments = @('--remote-debugging-port=9222', '--remote-debugging-address=127.0.0.1')
    foreach ($argument in $SpotifyArguments) {
        if ($argument -match '^--remote-debugging-(port|address)(=|$)') { continue }
        $arguments += ConvertTo-IzifyWindowsArgument $argument
    }
    # The Spotify window is the interactive application requested by the user.
    Start-Process -FilePath $exe -ArgumentList $arguments
} catch {
    [IO.File]::AppendAllText((Join-Path $PSScriptRoot 'auto-start.log'), ([DateTime]::UtcNow.ToString('s') + ' ' + $_.Exception.Message + [Environment]::NewLine))
    throw
}

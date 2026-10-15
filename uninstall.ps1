[CmdletBinding()]
param([string]$Destination, [switch]$NoPath, [switch]$NoDetach, [switch]$NoPauseOnError, [switch]$DeferCmdRemoval)
try {
    $ErrorActionPreference = 'Stop'
    if (-not $Destination) {
        if ($PSScriptRoot -and (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'izify-install.json'))) { $Destination = $PSScriptRoot }
        else { $Destination = Join-Path $env:LOCALAPPDATA 'Izify' }
    }
    $Destination = [IO.Path]::GetFullPath($Destination).TrimEnd('\')
    $helper = Join-Path $Destination 'tools/uninstall.ps1'
    if (-not (Test-Path -LiteralPath $helper)) { throw 'Desinstalador nao encontrado nessa instalacao do Izify.' }
    . ([scriptblock]::Create([IO.File]::ReadAllText($helper, [Text.Encoding]::UTF8)))
    Uninstall-Izify -Root $Destination -NoPath:$NoPath -NoDetach:$NoDetach -DeferCmdRemoval:$DeferCmdRemoval
    Write-Host '[OK] Izify desinstalado. Atalhos restaurados e inicio automatico removido.'
} catch {
    $failure = $_
    Write-Host ('[ERRO] ' + $failure.Exception.Message) -ForegroundColor Red
    if (-not $NoPauseOnError) { try { [void](Read-Host 'A janela permanecera aberta ate voce pressionar Enter') } catch {} }
    throw $failure
}

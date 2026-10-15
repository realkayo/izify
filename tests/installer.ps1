param([switch]$RejectStore)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$fixtureRoot = Join-Path $root ('.test-artifacts/fresh user-' + [Guid]::NewGuid().ToString('N'))
[void][IO.Directory]::CreateDirectory($fixtureRoot)
$code = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'installer-fixture.ps1'), [Text.Encoding]::UTF8)
$command = '& {' + $code + "`n} -ProjectDirectory '" + $root.Replace("'", "''") + "' -FixtureRoot '" + $fixtureRoot.Replace("'", "''") + "'"
if ($RejectStore) { $command += ' -RejectStore' }
$encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($command))
# Execute code like IEX; a script file cannot run under the policy being tested.
& powershell.exe -NoProfile -NonInteractive -OutputFormat Text -ExecutionPolicy Restricted -EncodedCommand $encoded
if ($LASTEXITCODE -ne 0) { throw 'Fresh-user remote installation failed.' }

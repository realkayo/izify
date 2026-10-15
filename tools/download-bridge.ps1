# No additional HTTP server: requests use the runner's local CDP connection.
$script:IzifyDownloadJobs = @{}
function Invoke-IzifyDownloadPump {
    param([string]$Endpoint, [string]$Root)
    $batch = Invoke-IzifyExpression $Endpoint 'window.__izifyDownloadBridge?.drain()'
    if (-not $batch) { return }
    foreach ($id in @($script:IzifyDownloadJobs.Keys)) {
        $entry = $script:IzifyDownloadJobs[$id]
        if ($entry.Instance -ne $batch.instance -or $id -in $batch.cancelled) {
            Stop-Job $entry.Job; Remove-Job $entry.Job
            $script:IzifyDownloadJobs.Remove($id); continue
        }
        if ($entry.Job.State -in @('Completed','Failed','Stopped')) {
            $result = @(Receive-Job $entry.Job -ErrorAction SilentlyContinue) | Select-Object -Last 1
            if (-not $result) { $result = @{ ok = $false; error = 'O processo de download terminou sem resposta.' } }
            $json = $result | ConvertTo-Json -Depth 12 -Compress
            Invoke-IzifyExpression $Endpoint ("window.__izifyDownloadBridge?.reply('$id',$json)") | Out-Null
            Remove-Job $entry.Job; $script:IzifyDownloadJobs.Remove($id)
        }
    }
    foreach ($request in $batch.requests) {
        if ($request.id -in $batch.cancelled) { continue }
        if ($request.id -notmatch '^[a-f0-9-]{36}$' -or $request.operation -notin @('status','setup','search','inspect','download')) { continue }
        if ($script:IzifyDownloadJobs.Count -ge 1) {
            Invoke-IzifyExpression $Endpoint ("window.__izifyDownloadBridge?.reply('$($request.id)',{ok:false,error:'Aguarde a operação atual.'})") | Out-Null
            continue
        }
        $job = Start-Job -ArgumentList $Root, $request.operation, $request.data -ScriptBlock {
            param($Root, $Operation, $Data)
            & (Join-Path $Root 'tools/download-worker.ps1') -Operation $Operation -Data $Data
        }
        $script:IzifyDownloadJobs[$request.id] = @{ Job = $job; Instance = $batch.instance }
    }
}

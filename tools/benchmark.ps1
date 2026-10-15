[CmdletBinding()]
param([string]$Label='sample',[int]$Samples=10,[int]$IntervalMs=1500,[string]$Output)
$ErrorActionPreference='Stop'
if($Samples -lt 3 -or $Samples -gt 120 -or $IntervalMs -lt 250){throw 'Use 3-120 samples and an interval of at least 250 ms.'}
. (Join-Path $PSScriptRoot 'cdp.ps1')
$targets=Invoke-RestMethod 'http://127.0.0.1:9222/json/list' -TimeoutSec 3
$target=$targets|Where-Object {$_.type -eq 'page' -and $_.url -like 'https://xpui.app.spotify.com/*'}|Select-Object -First 1
if(-not $target){throw 'Spotify CDP unavailable. Start Izify normally.'}
$session=Open-IzifyCdp $target.webSocketDebuggerUrl
$rows=@();$stopwatch=[Diagnostics.Stopwatch]::StartNew()
try{
 Invoke-IzifyCdp $target.webSocketDebuggerUrl 'Performance.enable' @{} -Connection $session|Out-Null
 $context=Invoke-IzifyExpression $target.webSocketDebuggerUrl @'
(()=>({preset:window.izify?.state.preset,performanceMode:window.izify?.performance?.getState?.()||null,visible:!document.hidden,lyrics:!!document.querySelector('.izify-lyrics-marker'),playbackLabel:document.querySelector('[data-testid="control-button-playpause"]')?.getAttribute('aria-label'),liveNodes:document.querySelectorAll('*').length,videos:[...document.querySelectorAll('video')].map(v=>({paused:v.paused,muted:v.muted,width:v.videoWidth,height:v.videoHeight})),themeStyleBytes:[...document.querySelectorAll('#izify-theme,#izify-palette,#izify-custom')].reduce((n,s)=>n+s.textContent.length*2,0),logs:window.izify?.logs.list().length}))()
'@ -Connection $session
 for($i=0;$i -lt $Samples;$i++){
  $processes=@(Get-Process Spotify -ErrorAction Stop)
  $privateWS=0L
  try{$counters=Get-CimInstance Win32_PerfRawData_PerfProc_Process -Filter "Name LIKE 'Spotify%'";foreach($counter in $counters){if($processes.Id -contains [int]$counter.IDProcess){$privateWS+=[long]$counter.WorkingSetPrivate}}}catch{$privateWS=$null}
  $metrics=Invoke-IzifyCdp $target.webSocketDebuggerUrl 'Performance.getMetrics' @{} -Connection $session
  $m=@{};foreach($metric in $metrics.metrics){$m[$metric.name]=$metric.value}
  $dom=Invoke-IzifyCdp $target.webSocketDebuggerUrl 'Memory.getDOMCounters' @{} -Connection $session
  $rows+=[pscustomobject]@{seconds=$stopwatch.Elapsed.TotalSeconds;privateWorkingSetBytes=$privateWS;workingSetBytes=($processes|Measure-Object WorkingSet64 -Sum).Sum;privateBytes=($processes|Measure-Object PrivateMemorySize64 -Sum).Sum;cpuSeconds=($processes|Measure-Object CPU -Sum).Sum;processIds=@($processes.Id|Sort-Object);jsHeapUsedBytes=$m.JSHeapUsedSize;jsHeapTotalBytes=$m.JSHeapTotalSize;taskSeconds=$m.TaskDuration;scriptSeconds=$m.ScriptDuration;layoutSeconds=$m.LayoutDuration;recalcSeconds=$m.RecalcStyleDuration;nodes=$dom.nodes;documents=$dom.documents;listeners=$dom.jsEventListeners}
  if($i -lt $Samples-1){Start-Sleep -Milliseconds $IntervalMs}
 }
 $elapsed=$rows[-1].seconds-$rows[0].seconds
 $sameProcesses=(@($rows|ForEach-Object {$_.processIds -join ','}|Select-Object -Unique).Count -eq 1)
 $summary=[ordered]@{label=$Label;samples=$Samples;seconds=[math]::Round($elapsed,3);sameProcesses=$sameProcesses;logicalProcessors=[Environment]::ProcessorCount}
 foreach($field in @('privateWorkingSetBytes','workingSetBytes','privateBytes','jsHeapUsedBytes','jsHeapTotalBytes','nodes','documents','listeners')){$values=@($rows|ForEach-Object {$_.$field}|Where-Object {$null -ne $_});$summary[$field]=[ordered]@{mean=($values|Measure-Object -Average).Average;min=($values|Measure-Object -Minimum).Minimum;max=($values|Measure-Object -Maximum).Maximum}}
 $summary.cpuPercentMachine=[math]::Round(100*($rows[-1].cpuSeconds-$rows[0].cpuSeconds)/$elapsed/[Environment]::ProcessorCount,3)
 foreach($field in @('taskSeconds','scriptSeconds','layoutSeconds','recalcSeconds')){$summary[$field+'PerSecond']=($rows[-1].$field-$rows[0].$field)/$elapsed}
 $endContext=Invoke-IzifyExpression $target.webSocketDebuggerUrl '({preset:window.izify?.state.preset,visible:!document.hidden,playbackLabel:document.querySelector("[data-testid=control-button-playpause]")?.getAttribute("aria-label"),liveNodes:document.querySelectorAll("*").length})' -Connection $session
 $result=[ordered]@{label=$Label;context=$context;endContext=$endContext;summary=$summary;rows=$rows}
 if(-not $Output){$Output=Join-Path (Split-Path $PSScriptRoot -Parent) ('.test-artifacts/performance/'+$Label+'.json')}
 $path=[IO.Path]::GetFullPath($Output);[void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($path))
 [IO.File]::WriteAllText($path,($result|ConvertTo-Json -Depth 12),(New-Object Text.UTF8Encoding($false)))
 $summary|ConvertTo-Json -Depth 6 -Compress
}finally{Close-IzifyCdp $session}

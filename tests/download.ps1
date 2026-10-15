# Exercises the real worker/process boundary without downloading copyrighted media.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$fixture = Join-Path $root ('.test-artifacts/download-' + [Guid]::NewGuid().ToString('N'))
$previousLocal = $env:LOCALAPPDATA
try {
    $env:LOCALAPPDATA = $fixture
    $bin = Join-Path $fixture 'Izify/download-tools'
    [void][IO.Directory]::CreateDirectory($bin)
    $fake = @'
using System;
using System.IO;
public class DownloadFixture {
  public static int Main(string[] args) {
    Console.OutputEncoding=new System.Text.UTF8Encoding(false);
    File.WriteAllLines(Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"argv.txt"),args);
    File.WriteAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"pid.txt"),System.Diagnostics.Process.GetCurrentProcess().Id.ToString());
    string last=args[args.Length-1];
    if(last.Contains("fail")){Console.Error.WriteLine("Fixture network failure");return 2;}
    if(last.Contains("hang")){System.Threading.Thread.Sleep(60000);return 0;}
    if(last.Contains("separate")){
      Console.WriteLine("{\"title\":\"Separate\",\"formats\":[{\"vcodec\":\"avc1\",\"acodec\":\"none\",\"ext\":\"mp4\"},{\"vcodec\":\"none\",\"acodec\":\"aac\",\"ext\":\"m4a\"}]}");return 0;
    }
    if(Array.IndexOf(args,"--dump-single-json")>=0){
      Console.WriteLine(last.StartsWith("ytsearch")
        ? "{\"entries\":[{\"id\":\"abcdefghijk\",\"title\":\"Source\",\"channel\":\"Artist\",\"duration\":120}]}"
        : "{\"title\":\"Source\",\"uploader\":\"Artist\",\"is_live\":false,\"formats\":[{\"vcodec\":\"none\",\"acodec\":\"aac\",\"ext\":\"m4a\"},{\"vcodec\":\"none\",\"acodec\":\"opus\",\"ext\":\"webm\"},{\"vcodec\":\"avc1\",\"acodec\":\"aac\",\"ext\":\"mp4\"}]}" );return 0;
    }
    string output=args[Array.IndexOf(args,"-o")+1];
    string selector=args[Array.IndexOf(args,"-f")+1];
    string ext=selector.Contains("m4a")?"m4a":selector.Contains("webm")?"webm":"mp4";
    output=output.Replace("%(title).150B","Source").Replace("%(id)s","abcdefghijk").Replace("%(ext)s",ext);
    File.WriteAllText(output,"fixture");Console.WriteLine(output);return 0;
  }
}
'@
    Add-Type -TypeDefinition $fake -OutputAssembly (Join-Path $bin 'yt-dlp.exe') -OutputType ConsoleApplication
    [IO.File]::WriteAllText((Join-Path $bin 'qjs.exe'), 'fixture')
    function Call-Worker($Operation, $Data) { & (Join-Path $root 'tools/download-worker.ps1') -Operation $Operation -Data $Data }
    function Assert-Download($Value, $Message) { if (-not $Value) { throw $Message } }
    $status = Call-Worker 'status' @{}
    Assert-Download ($status.ok -and $status.data.ready) 'Tools detected'
    $search = Call-Worker 'search' @{ query = 'Artista "teste" & música' }
    Assert-Download ($search.ok -and $search.data.entries.Count -eq 1) 'Search result normalized'
    $argv = [IO.File]::ReadAllLines((Join-Path $bin 'argv.txt'))
    Assert-Download ($argv[-1] -eq 'ytsearch3:Artista "teste" & música') 'Windows argv preserves quotes, unicode and ampersands'
    Assert-Download (($argv -contains '--no-js-runtimes') -and ($argv -contains ('quickjs:' + (Join-Path $bin 'qjs.exe')))) 'Only small QuickJS runtime enabled'
    $inspect = Call-Worker 'inspect' @{ url = 'https://www.youtube.com/watch?v=abcdefghijk' }
    Assert-Download ($inspect.ok -and $inspect.data.video) 'Video availability detected'
    Assert-Download (($inspect.data.audioFormats -join ',') -eq 'm4a,webm') 'Original audio formats detected'
    $separate = Call-Worker 'inspect' @{ url = 'https://youtu.be/separate001' }
    Assert-Download ($separate.ok -and -not $separate.data.video -and ($separate.data.audioFormats -contains 'm4a')) 'Separate video-only stream is not offered as ready MP4 with audio'
    foreach ($format in @('m4a','webm','mp4')) {
        $download = Call-Worker 'download' @{ url = 'https://www.youtube.com/watch?v=abcdefghijk'; format = $format; folder = (Join-Path $fixture 'Saída com espaços') }
        Assert-Download ($download.ok -and (Test-Path -LiteralPath $download.data.file) -and $download.data.file.EndsWith('.' + $format)) ('Download output: ' + $format + ': ' + ($download | ConvertTo-Json -Compress))
        $argv = [IO.File]::ReadAllLines((Join-Path $bin 'argv.txt'))
        Assert-Download ($argv -contains '--ignore-config' -and $argv -contains '--no-overwrites' -and $argv -contains '--no-playlist') 'Explicit config and single-file behavior'
        Assert-Download ($argv -notcontains '-x' -and $argv -notcontains '--audio-format' -and $argv -notcontains '--merge-output-format' -and $argv -notcontains '--ffmpeg-location') 'No conversion or ffmpeg invocation'
    }
    $invalid = Call-Worker 'inspect' @{ url = 'https://example.com/video' }
    Assert-Download (-not $invalid.ok) 'Unsupported URL rejected'
    $failure = Call-Worker 'search' @{ query = 'fail' }
    Assert-Download (-not $failure.ok -and $failure.error -match 'Fixture network failure') 'Process failure surfaced'
    $relative = Call-Worker 'download' @{ url = 'https://youtu.be/abcdefghijk'; format = 'm4a'; folder = 'relative' }
    Assert-Download (-not $relative.ok) 'Relative destination rejected'
    $badFormat = Call-Worker 'download' @{ url = 'https://youtu.be/abcdefghijk'; format = '--exec' }
    Assert-Download (-not $badFormat.ok) 'Invalid output format rejected'
    $conversion = Call-Worker 'download' @{ url = 'https://youtu.be/abcdefghijk'; format = 'mp3' }
    Assert-Download (-not $conversion.ok) 'MP3 conversion unavailable in lite version'
    $pidFile = Join-Path $bin 'pid.txt'
    Remove-Item -LiteralPath $pidFile
    $job = Start-Job -ArgumentList $root, $fixture -ScriptBlock {
        param($Root,$Fixture)
        $env:LOCALAPPDATA=$Fixture
        & (Join-Path $Root 'tools/download-worker.ps1') -Operation search -Data @{query='hang'}
    }
    try {
        for($i=0;$i -lt 50 -and -not (Test-Path -LiteralPath $pidFile);$i++){Start-Sleep -Milliseconds 100}
        Assert-Download (Test-Path -LiteralPath $pidFile) 'Cancelable worker started'
        $childPid=[int][IO.File]::ReadAllText($pidFile)
        $clock=[Diagnostics.Stopwatch]::StartNew()
        Stop-Job $job
        Assert-Download ($clock.Elapsed.TotalSeconds -lt 5) 'Cancellation is prompt, not blocked by process wait'
        Assert-Download (-not (Get-Process -Id $childPid -ErrorAction SilentlyContinue)) 'Cancellation terminates downloader process'
    } finally { Stop-Job $job; Remove-Job $job }
    Write-Host 'PASS: download worker, argv, formats, output files, source validation and process errors.'
} finally { $env:LOCALAPPDATA = $previousLocal }

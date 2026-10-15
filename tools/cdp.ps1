# CDP client using the .NET shipped with Windows. Each connection is scoped.
function Open-IzifyCdp {
    param([Parameter(Mandatory)][string]$WebSocketUrl)
    $uri = [Uri]$WebSocketUrl
    if ($uri.Scheme -ne 'ws' -or -not $uri.IsLoopback -or -not $uri.AbsolutePath.StartsWith('/devtools/')) { throw 'Only local CDP endpoints are accepted.' }
    $socket = New-Object System.Net.WebSockets.ClientWebSocket
    $cancel = New-Object System.Threading.CancellationTokenSource
    $cancel.CancelAfter(30000)
    try {
        $socket.ConnectAsync($uri, $cancel.Token).GetAwaiter().GetResult()
        return [PSCustomObject]@{ Socket = $socket; Cancel = $cancel }
    } catch { $socket.Dispose(); $cancel.Dispose(); throw }
}
function Close-IzifyCdp {
    param([Parameter(Mandatory)]$Connection)
    $Connection.Socket.Abort(); $Connection.Socket.Dispose(); $Connection.Cancel.Dispose()
}
function Invoke-IzifyCdp {
    param(
        [Parameter(Mandatory)][string]$WebSocketUrl,
        [Parameter(Mandatory)][string]$Method,
        [hashtable]$Params = @{},
        [int]$TimeoutSeconds = 30,
        $Connection
    )
    $uri = [Uri]$WebSocketUrl
    if ($uri.Scheme -ne 'ws' -or -not $uri.IsLoopback -or -not $uri.AbsolutePath.StartsWith('/devtools/')) {
        throw 'Only local CDP endpoints are accepted.'
    }
    $owned = -not $Connection
    if ($owned) { $Connection = Open-IzifyCdp -WebSocketUrl $WebSocketUrl }
    $socket = $Connection.Socket
    $cancel = $Connection.Cancel
    $cancel.CancelAfter($TimeoutSeconds * 1000)
    try {
        $payload = @{ id = 1; method = $Method; params = $Params } | ConvertTo-Json -Depth 12 -Compress
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
        $segment = New-Object 'System.ArraySegment[byte]' -ArgumentList (,$bytes)
        $socket.SendAsync($segment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $cancel.Token).GetAwaiter().GetResult()
        $buffer = New-Object byte[] 65536
        $receiveSegment = New-Object 'System.ArraySegment[byte]' -ArgumentList (,$buffer)
        while ($true) {
            $stream = New-Object System.IO.MemoryStream
            try {
                do {
                    $message = $socket.ReceiveAsync($receiveSegment, $cancel.Token).GetAwaiter().GetResult()
                    if ($message.MessageType -eq [System.Net.WebSockets.WebSocketMessageType]::Close) { throw 'CDP connection closed.' }
                    $stream.Write($buffer, 0, $message.Count)
                } while (-not $message.EndOfMessage)
                $response = [System.Text.Encoding]::UTF8.GetString($stream.ToArray()) | ConvertFrom-Json
                if ($response.id -ne 1) { continue }
                if ($response.error) { throw $response.error.message }
                if ($response.result.exceptionDetails) {
                    $details = $response.result.exceptionDetails
                    if ($details.exception.description) { throw $details.exception.description }
                    throw $details.text
                }
                return $response.result
            } finally { $stream.Dispose() }
        }
    } finally { if ($owned) { Close-IzifyCdp $Connection } }
}

function Invoke-IzifyExpression {
    param([Parameter(Mandatory)][string]$WebSocketUrl, [Parameter(Mandatory)][string]$Expression, $Connection)
    $result = Invoke-IzifyCdp -WebSocketUrl $WebSocketUrl -Method 'Runtime.evaluate' -Connection $Connection -Params @{
        expression = $Expression; awaitPromise = $true; returnByValue = $true
    }
    return $result.result.value
}

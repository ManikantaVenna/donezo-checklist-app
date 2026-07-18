param(
  [Parameter(Mandatory = $true)]
  [string]$SourceApk
)

$ErrorActionPreference = "Stop"
$expectedLength = 37562716
$expectedSha256 = "C5E86AFDC9899C948F4EBB8956F5C04EC562EB73E13EF8A5C6101202A87B379D"
$partLengths = @(16777216, 16777216, 4008284)
$partDirectory = Join-Path $PSScriptRoot "assets\_parts"
$partPaths = @(
  (Join-Path $partDirectory "donezo-1.0.3.part-001"),
  (Join-Path $partDirectory "donezo-1.0.3.part-002"),
  (Join-Path $partDirectory "donezo-1.0.3.part-003")
)

$resolvedApk = (Resolve-Path -LiteralPath $SourceApk).Path
$apkFile = Get-Item -LiteralPath $resolvedApk
if ($apkFile.Length -ne $expectedLength) {
  throw "APK length is $($apkFile.Length), expected $expectedLength."
}

$actualSha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $resolvedApk).Hash
if ($actualSha256 -ne $expectedSha256) {
  throw "APK checksum does not match the verified Donezo build."
}

New-Item -ItemType Directory -Force -Path $partDirectory | Out-Null
$inputStream = [System.IO.File]::OpenRead($resolvedApk)
$buffer = New-Object byte[] 1048576

try {
  for ($partIndex = 0; $partIndex -lt $partLengths.Count; $partIndex += 1) {
    $partPath = $partPaths[$partIndex]
    $remaining = $partLengths[$partIndex]
    $outputStream = [System.IO.File]::Create($partPath)

    try {
      while ($remaining -gt 0) {
        $bytesToRead = [Math]::Min($buffer.Length, $remaining)
        $bytesRead = $inputStream.Read($buffer, 0, $bytesToRead)
        if ($bytesRead -le 0) {
          throw "Unexpected end of APK while creating part $($partIndex + 1)."
        }
        $outputStream.Write($buffer, 0, $bytesRead)
        $remaining -= $bytesRead
      }
    }
    finally {
      $outputStream.Dispose()
    }
  }
}
finally {
  $inputStream.Dispose()
}

for ($partIndex = 0; $partIndex -lt $partPaths.Count; $partIndex += 1) {
  $actualLength = (Get-Item -LiteralPath $partPaths[$partIndex]).Length
  if ($actualLength -ne $partLengths[$partIndex]) {
    throw "Part $($partIndex + 1) length is incorrect."
  }
}

Write-Output "Prepared 3 verified APK parts ($expectedLength bytes total)."

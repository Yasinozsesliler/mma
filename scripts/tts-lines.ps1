# TikTok videosu için spiker sesleri: Windows'un yerleşik Türkçe sesiyle (OneCore · Microsoft Tolga) WAV üretir.
# Çalıştırma: powershell -ExecutionPolicy Bypass -File scripts/tts-lines.ps1 <çıkış klasörü>
param([string]$out)
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime]
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($op, [Type]$t) { $task = $asTask.MakeGenericMethod($t).Invoke($null, @($op)); $task.Wait(-1) | Out-Null; $task.Result }

$synth = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
$voice = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where-Object { $_.Language -eq 'tr-TR' } | Select-Object -First 1
if (-not $voice) { throw 'Türkçe ses bulunamadı' }
$synth.Voice = $voice
$synth.Options.SpeakingRate = 0.92
$synth.Options.AudioPitch = 0.85
$lines = @{
  'kirmizi'  = 'Ve kırmızı köşede! Kerem... Çelik... Aslan!'
  'nakavt'   = 'Ve bitti! Nakavt!'
  'sampiyon' = 'Ve yeni... dünya şampiyonu... Kerem, Çelik, Aslan!'
}
foreach ($k in $lines.Keys) {
  $stream = Await ($synth.SynthesizeTextToStreamAsync($lines[$k])) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
  $size = [uint32]$stream.Size
  $reader = New-Object Windows.Storage.Streams.DataReader($stream.GetInputStreamAt(0))
  $null = Await ($reader.LoadAsync($size)) ([uint32])
  $bytes = New-Object byte[] $size
  $reader.ReadBytes($bytes)
  [System.IO.File]::WriteAllBytes((Join-Path $out "$k.wav"), $bytes)
}
Write-Output ("ses: " + $voice.DisplayName)

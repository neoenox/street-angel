$VoiceName = 'Microsoft Haruka Desktop'
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$outputDir = Join-Path (Split-Path $PSScriptRoot -Parent) 'source_art/audio'
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
    $synth.SelectVoice($VoiceName)
    $synth.Rate = 2
    $synth.Volume = 90
    $format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(22050, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
    foreach ($sample in @(@{Name='aoi-hurt-u';Text='うっ'}, @{Name='aoi-hurt-ku';Text='くっ'})) {
        $synth.SetOutputToWaveFile((Join-Path $outputDir ($sample.Name + '.wav')), $format)
        $synth.Speak($sample.Text)
        $synth.SetOutputToNull()
    }
} finally { $synth.Dispose() }

Add-Type -AssemblyName System.Drawing
$pngPath = "C:\Users\AkibKhan\Downloads\Restman\public\icon.png"
$icoPath = "C:\Users\AkibKhan\Downloads\Restman\desktop\icon.ico"
$publicIcoPath = "C:\Users\AkibKhan\Downloads\Restman\public\icon.ico"

if (-not (Test-Path $pngPath)) {
    Write-Error "Source PNG not found at $pngPath"
    exit 1
}

# Load the 256x256 PNG
$srcBmp = [System.Drawing.Bitmap]::FromFile($pngPath)

# We want sizes: 16, 32, 48, 256
$sizes = @(16, 32, 48, 256)
$bitmaps = @()

foreach ($size in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.DrawImage($srcBmp, 0, 0, $size, $size)
    $g.Dispose()
    $bitmaps += $bmp
}

# Save each bitmap to PNG bytes in memory
$pngBytesList = @()
foreach ($bmp in $bitmaps) {
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngBytesList += ,$ms.ToArray()
    $ms.Dispose()
}

$fs = New-Object System.IO.FileStream($icoPath, [System.IO.FileMode]::Create)
$w = New-Object System.IO.BinaryWriter($fs)

# Write header
$w.Write([UInt16]0)
$w.Write([UInt16]1)
$w.Write([UInt16]4) # 4 sizes

# Calculate offsets
# Header (6 bytes) + 4 Dir Entries (4 * 16 = 64 bytes) = 70 bytes total offset for the first PNG
$offset = 70

for ($i = 0; $i -lt 4; $i++) {
    $size = $sizes[$i]
    $bytes = $pngBytesList[$i]
    
    # Write Dir Entry
    $widthByte = if ($size -eq 256) { [byte]0 } else { [byte]$size }
    $heightByte = if ($size -eq 256) { [byte]0 } else { [byte]$size }
    
    $w.Write($widthByte)
    $w.Write($heightByte)
    $w.Write([byte]0)
    $w.Write([byte]0)
    $w.Write([UInt16]1)  # Planes
    $w.Write([UInt16]32) # BPP
    $w.Write([UInt32]$bytes.Length)
    $w.Write([UInt32]$offset)
    
    $offset += $bytes.Length
}

# Write PNG data
for ($i = 0; $i -lt 4; $i++) {
    $w.Write($pngBytesList[$i], 0, $pngBytesList[$i].Length)
}

$w.Close()
$fs.Close()

# Copy to public
Copy-Item $icoPath $publicIcoPath -Force

# Clean up
$srcBmp.Dispose()
foreach ($bmp in $bitmaps) { $bmp.Dispose() }
Write-Output "Successfully compiled multi-resolution ICO file!"

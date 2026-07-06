Add-Type -AssemblyName System.Drawing

function Draw-ApifyLogo([int]$size, [string]$outputPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    # High-quality rendering settings
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    
    $scale = $size / 500.0
    $g.Clear([System.Drawing.Color]::Transparent)
    
    # Orange background rounded rect
    $orangeColor = [System.Drawing.ColorTranslator]::FromHtml("#FF6C37")
    $orangeBrush = New-Object System.Drawing.SolidBrush($orangeColor)
    
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $r = 110.0 * $scale
    $d = $r * 2
    $rect = New-Object System.Drawing.RectangleF(0, 0, $size, $size)
    
    # Handle corner boundary cases
    if ($d -gt $size) { $d = $size }
    
    $path.AddArc($rect.X, $rect.Y, $d, $d, 180, 90)
    $path.AddArc(($rect.Right - $d), $rect.Y, $d, $d, 270, 90)
    $path.AddArc(($rect.Right - $d), ($rect.Bottom - $d), $d, $d, 0, 90)
    $path.AddArc($rect.X, ($rect.Bottom - $d), $d, $d, 90, 90)
    $path.CloseFigure()
    
    $g.FillPath($orangeBrush, $path)
    $path.Dispose()
    
    # Draw central structure with translate group (0, 5)
    $yOffset = 5.0
    
    # Lines (stroke-width=28)
    $whitePen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, (28.0 * $scale))
    $whitePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $whitePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $whitePen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    
    # Left API Pathway: M 160 360 L 250 140
    $g.DrawLine($whitePen, (160.0 * $scale), ((360.0 + $yOffset) * $scale), (250.0 * $scale), ((140.0 + $yOffset) * $scale))
    # Right API Pathway: M 340 360 L 250 140
    $g.DrawLine($whitePen, (340.0 * $scale), ((360.0 + $yOffset) * $scale), (250.0 * $scale), ((140.0 + $yOffset) * $scale))
    # Horizontal Middleware Data Bridge: M 195 270 H 305
    $g.DrawLine($whitePen, (195.0 * $scale), ((270.0 + $yOffset) * $scale), (305.0 * $scale), ((270.0 + $yOffset) * $scale))
    
    $whitePen.Dispose()
    
    # Circles (r=22)
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $orangePen = New-Object System.Drawing.Pen($orangeColor, (8.0 * $scale))
    
    $drawNode = {
        param($cx, $cy, $r)
        $scaledCx = $cx * $scale
        $scaledCy = ($cy + $yOffset) * $scale
        $scaledR = $r * $scale
        
        $circleRect = New-Object System.Drawing.RectangleF(($scaledCx - $scaledR), ($scaledCy - $scaledR), ($scaledR * 2), ($scaledR * 2))
        $g.FillEllipse($whiteBrush, $circleRect)
        $g.DrawEllipse($orangePen, $circleRect)
    }
    
    # Top Apex
    &$drawNode 250 140 22
    # Left Input
    &$drawNode 160 360 22
    # Right Output
    &$drawNode 340 360 22
    
    $orangePen.Dispose()
    
    # Central Data Payload / Status Node: cx="250" cy="270" r="14" fill="#FF6C37" stroke="#FFFFFF" stroke-width="8"
    $gWhitePen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, (8.0 * $scale))
    
    $scaledCx = 250.0 * $scale
    $scaledCy = (270.0 + $yOffset) * $scale
    $scaledR = 14.0 * $scale
    $circleRect = New-Object System.Drawing.RectangleF(($scaledCx - $scaledR), ($scaledCy - $scaledR), ($scaledR * 2), ($scaledR * 2))
    
    $g.FillEllipse($orangeBrush, $circleRect)
    $g.DrawEllipse($gWhitePen, $circleRect)
    
    $gWhitePen.Dispose()
    $orangeBrush.Dispose()
    $whiteBrush.Dispose()
    
    $g.Dispose()
    
    if ($outputPath) {
        $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    
    return $bmp
}

# Run generation
$desktopDir = "C:\Users\AkibKhan\Downloads\Restman\desktop"
$publicDir = "C:\Users\AkibKhan\Downloads\Restman\public"

$icoPath = Join-Path $desktopDir "icon.ico"
$publicIcoPath = Join-Path $publicDir "icon.ico"
$pngPath = Join-Path $publicDir "icon.png"

# Generate 256x256 PNG
$pngBmp = Draw-ApifyLogo 256 $pngPath
$pngBmp.Dispose()

# Generate PWA PNGs
$pwa192Bmp = Draw-ApifyLogo 192 (Join-Path $publicDir "icon-192.png")
$pwa192Bmp.Dispose()

$pwa512Bmp = Draw-ApifyLogo 512 (Join-Path $publicDir "icon-512.png")
$pwa512Bmp.Dispose()

# Create multi-res bitmaps
$sizes = @(16, 32, 48, 256)
$bitmaps = @()
foreach ($size in $sizes) {
    $bitmaps += Draw-ApifyLogo $size $null
}

# Save into valid multi-res ICO file structure
$pngBytesList = @()
foreach ($bmp in $bitmaps) {
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngBytesList += ,$ms.ToArray()
    $ms.Dispose()
}

$fs = New-Object System.IO.FileStream($icoPath, [System.IO.FileMode]::Create)
$w = New-Object System.IO.BinaryWriter($fs)

$w.Write([UInt16]0)
$w.Write([UInt16]1)
$w.Write([UInt16]4) # 4 sizes

$offset = 70 # 6 + 4 * 16

for ($i = 0; $i -lt 4; $i++) {
    $size = $sizes[$i]
    $bytes = $pngBytesList[$i]
    
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

for ($i = 0; $i -lt 4; $i++) {
    $w.Write($pngBytesList[$i], 0, $pngBytesList[$i].Length)
}

$w.Close()
$fs.Close()

# Copy to public
Copy-Item $icoPath $publicIcoPath -Force

# Clean up
foreach ($bmp in $bitmaps) { $bmp.Dispose() }

Write-Output "Successfully compiled multi-resolution vector-perfect ICO file!"

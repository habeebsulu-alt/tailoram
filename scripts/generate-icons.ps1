Add-Type -AssemblyName System.Drawing

function Generate-TailoramIcon {
    param(
        [int]$Size,
        [string]$OutputPath,
        [bool]$IsMaskable = $false,
        [bool]$IsFavicon = $false
    )

    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    if ($IsFavicon) {
        # Transparent background for favicon, with rounded brand badge
        $g.Clear([System.Drawing.Color]::Transparent)
        $badgeMargin = [int]($Size * 0.04)
        $badgeSize = $Size - ($badgeMargin * 2)
        $badgeRect = New-Object System.Drawing.Rectangle($badgeMargin, $badgeMargin, $badgeSize, $badgeSize)
        $radius = [int]($badgeSize * 0.28)
    } elseif ($IsMaskable) {
        # Full bleed brand gradient for maskable icon
        $badgeMargin = 0
        $badgeSize = $Size
        $badgeRect = New-Object System.Drawing.Rectangle(0, 0, $Size, $Size)
        $radius = 0
    } else {
        # Standard launcher/icon: Dark warm background with rounded brand badge
        $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 12, 10, 9)) # #0c0a09
        $g.FillRectangle($bgBrush, 0, 0, $Size, $Size)
        $badgeMargin = [int]($Size * 0.08)
        $badgeSize = $Size - ($badgeMargin * 2)
        $badgeRect = New-Object System.Drawing.Rectangle($badgeMargin, $badgeMargin, $badgeSize, $badgeSize)
        $radius = [int]($badgeSize * 0.26)
    }

    # Brand Linear Gradient (exact App Logo: brand-600 #C25E00 to brand-400 #E4985D at 45 deg)
    $pt1 = New-Object System.Drawing.PointF($badgeRect.X, $badgeRect.Bottom)
    $pt2 = New-Object System.Drawing.PointF($badgeRect.Right, $badgeRect.Y)
    $brandGrad = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $pt1,
        $pt2,
        [System.Drawing.Color]::FromArgb(255, 194, 94, 0),  # #C25E00
        [System.Drawing.Color]::FromArgb(255, 228, 152, 93) # #E4985D
    )

    if ($radius -gt 0) {
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $diameter = $radius * 2
        $path.AddArc($badgeRect.X, $badgeRect.Y, $diameter, $diameter, 180, 90)
        $path.AddArc($badgeRect.Right - $diameter, $badgeRect.Y, $diameter, $diameter, 270, 90)
        $path.AddArc($badgeRect.Right - $diameter, $badgeRect.Bottom - $diameter, $diameter, $diameter, 0, 90)
        $path.AddArc($badgeRect.X, $badgeRect.Bottom - $diameter, $diameter, $diameter, 90, 90)
        $path.CloseFigure()
        $g.FillPath($brandGrad, $path)
    } else {
        $g.FillRectangle($brandGrad, 0, 0, $Size, $Size)
    }

    # Centered White Scissors Icon
    $cx = $Size / 2.0
    $cy = $Size / 2.0
    $targetIconSize = if ($IsMaskable) { $Size * 0.65 } else { $badgeSize * 0.72 }
    $scale = $targetIconSize / 240.0

    # Save state before rotation
    $state = $g.Save()
    $g.TranslateTransform($cx, $cy)
    $g.RotateTransform(-45)

    $penWidth = [Math]::Max(2.0, (20.0 * $scale))
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, $penWidth)
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    # Blades
    $g.DrawLine($pen, (-45.0 * $scale), (-92.0 * $scale), (45.0 * $scale), (92.0 * $scale))
    $g.DrawLine($pen, (45.0 * $scale), (-92.0 * $scale), (-45.0 * $scale), (92.0 * $scale))

    # Handles / Finger Loops
    $loopRadius = 32.0 * $scale
    $loopPen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, $penWidth)
    $g.DrawEllipse($loopPen, (-64.0 * $scale) - $loopRadius, (96.0 * $scale) - $loopRadius, ($loopRadius * 2), ($loopRadius * 2))
    $g.DrawEllipse($loopPen, (64.0 * $scale) - $loopRadius, (96.0 * $scale) - $loopRadius, ($loopRadius * 2), ($loopRadius * 2))

    # Center screw
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $screwR = [Math]::Max(2.0, (11.0 * $scale))
    $g.FillEllipse($whiteBrush, -$screwR, -$screwR, ($screwR * 2), ($screwR * 2))

    $g.Restore($state)

    # Clean up and save
    $g.Dispose()
    $bmp.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Generated $OutputPath ($Size x $Size)"
}

$destDir = "c:\Users\HabeebSulu\Downloads\Tailoram\public\icons"
if (!(Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir }

Generate-TailoramIcon -Size 192 -OutputPath "$destDir\icon-192.png" -IsMaskable $false
Generate-TailoramIcon -Size 512 -OutputPath "$destDir\icon-512.png" -IsMaskable $false
Generate-TailoramIcon -Size 512 -OutputPath "$destDir\icon-maskable-512.png" -IsMaskable $true

# Also generate public favicons and touch icons matching the app logo
$publicDir = "c:\Users\HabeebSulu\Downloads\Tailoram\public"
Generate-TailoramIcon -Size 32  -OutputPath "$publicDir\favicon-32x32.png" -IsMaskable $false -IsFavicon $true
Generate-TailoramIcon -Size 16  -OutputPath "$publicDir\favicon-16x16.png" -IsMaskable $false -IsFavicon $true
Generate-TailoramIcon -Size 180 -OutputPath "$publicDir\apple-touch-icon.png" -IsMaskable $false -IsFavicon $true

# Android Native Launcher Icons
$androidRes = "c:\Users\HabeebSulu\Downloads\Tailoram\android\app\src\main\res"
if (Test-Path $androidRes) {
    $densities = @(
        @{ Name = "mipmap-mdpi"; Size = 48 },
        @{ Name = "mipmap-hdpi"; Size = 72 },
        @{ Name = "mipmap-xhdpi"; Size = 96 },
        @{ Name = "mipmap-xxhdpi"; Size = 144 },
        @{ Name = "mipmap-xxxhdpi"; Size = 192 }
    )

    foreach ($d in $densities) {
        $dir = "$androidRes\$($d.Name)"
        if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir }
        Generate-TailoramIcon -Size $d.Size -OutputPath "$dir\ic_launcher.png" -IsMaskable $false
        Generate-TailoramIcon -Size $d.Size -OutputPath "$dir\ic_launcher_round.png" -IsMaskable $true
        Generate-TailoramIcon -Size $d.Size -OutputPath "$dir\ic_launcher_foreground.png" -IsMaskable $true
    }
}

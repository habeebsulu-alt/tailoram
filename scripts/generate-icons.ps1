Add-Type -AssemblyName System.Drawing

function Generate-TailoramIcon {
    param(
        [int]$Size,
        [string]$OutputPath,
        [bool]$IsMaskable = $false
    )

    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # 1. Background
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 12, 10, 9)) # #0c0a09
    $g.FillRectangle($bgBrush, 0, 0, $Size, $Size)

    # 2. Gold Badge
    $badgeMargin = if ($IsMaskable) { [int]($Size * 0.18) } else { [int]($Size * 0.14) }
    $badgeSize = $Size - ($badgeMargin * 2)
    $badgeRect = New-Object System.Drawing.Rectangle($badgeMargin, $badgeMargin, $badgeSize, $badgeSize)

    # Rounded path for gold badge
    $radius = [int]($badgeSize * 0.26)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $diameter = $radius * 2
    $path.AddArc($badgeRect.X, $badgeRect.Y, $diameter, $diameter, 180, 90)
    $path.AddArc($badgeRect.Right - $diameter, $badgeRect.Y, $diameter, $diameter, 270, 90)
    $path.AddArc($badgeRect.Right - $diameter, $badgeRect.Bottom - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($badgeRect.X, $badgeRect.Bottom - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()

    # Gold Linear Gradient
    $pt1 = New-Object System.Drawing.PointF($badgeRect.X, $badgeRect.Y)
    $pt2 = New-Object System.Drawing.PointF($badgeRect.Right, $badgeRect.Bottom)
    $goldGrad = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $pt1,
        $pt2,
        [System.Drawing.Color]::FromArgb(255, 251, 191, 36), # #fbbf24
        [System.Drawing.Color]::FromArgb(255, 180, 83, 9)     # #b45309
    )
    $g.FillPath($goldGrad, $path)

    # 3. White Scissors Icon in the Center
    $cx = $Size / 2.0
    $cy = $Size / 2.0
    $scale = $badgeSize / 320.0

    # Save state before rotation
    $state = $g.Save()
    $g.TranslateTransform($cx, $cy)
    $g.RotateTransform(-45)

    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, (22.0 * $scale))
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    # Blades
    $g.DrawLine($pen, (-56.0 * $scale), (-116.0 * $scale), (56.0 * $scale), (116.0 * $scale))
    $g.DrawLine($pen, (56.0 * $scale), (-116.0 * $scale), (-56.0 * $scale), (116.0 * $scale))

    # Handles / Finger Loops
    $loopRadius = 40.0 * $scale
    $loopPen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, (20.0 * $scale))
    $g.DrawEllipse($loopPen, (-80.0 * $scale) - $loopRadius, (120.0 * $scale) - $loopRadius, ($loopRadius * 2), ($loopRadius * 2))
    $g.DrawEllipse($loopPen, (76.0 * $scale) - $loopRadius, (120.0 * $scale) - $loopRadius, ($loopRadius * 2), ($loopRadius * 2))

    # Center screw
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $screwR = 12.0 * $scale
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

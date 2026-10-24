#!/bin/bash
# A generator paints a prop's shadow in dark MAGENTA, which keys to a hard black ring. This turns every
# magenta-hued pixel to pure #ff00ff and draws a soft ellipse shadow under the object's base, for --seat:
#   art/deshadow.sh <render> <clean.png> <shadow.png>
set -e
IN="$1"; OUT="$2"; SH="$3"; T=$(mktemp -d)
read W H < <(magick "$IN" -format "%w %h\n" info:)
magick "$IN" -colorspace HSL -channel R -separate +channel -fx "abs(u-0.833)<0.06?1:0" $T/hue.png
magick "$IN" -colorspace HSL -channel G -separate +channel -threshold 30% $T/sat.png
magick $T/hue.png $T/sat.png -compose multiply -composite -morphology Dilate Disk:2 $T/mask.png
magick "$IN" \( -size ${W}x${H} xc:'#FF00FF' \) $T/mask.png -composite "$OUT"
BB=$(magick "$OUT" -fuzz 12% -fill black -opaque '#FF00FF' -fill white +opaque black -format "%@" info:)
BW=${BB%%x*}; R=${BB#*x}; BH=${R%%+*}; R=${R#*+}; BX=${R%%+*}; BY=${R#*+}
CX=$((BX + BW/2)); CY=$((BY + BH - BH/30)); RX=$((BW*52/100)); RY=$((BW/14)); BL=$((BW/30+2))
magick -size ${W}x${H} xc:none -fill 'rgba(20,22,24,1)' -draw "ellipse $CX,$CY $RX,$RY 0,360" -blur 0x$BL "$SH"
echo "bbox $BB"

#!/bin/bash
# Cuts an exterior object (a hill, a ruin) off its magenta render and lays a soft warm shadow under it:
#   art/cutout-exterior.sh <master> <out.png> [keep-height]
# The generator paints its shadow magenta-dark and often a band of sand along the bottom edge, so the key
# is by HUE rather than by distance from #ff00ff, and `keep-height` cuts the band off (default: all rows).
# Holes the key bites into dark paint (a cave mouth is reddish black) are filled from the outside in.
set -e
IN="$1"; OUT="$2"; T=$(mktemp -d)
read W H < <(magick "$IN" -format "%w %h\n" info:)
KH="${3:-$H}"
magick "$IN" -crop ${W}x${KH}+0+0 +repage "$T/src.png"
magick "$T/src.png" -colorspace HSL -fx "Hu=u.r*360; Sa=u.g; ((Hu>265 || Hu<12) && Sa>0.25) ? 0 : 1" \
  -morphology Open Disk:2 -threshold 50% -bordercolor black -border 1 -fill red -draw "color 0,0 floodfill" \
  -shave 1x1 -fill white +opaque red -fill black -opaque red -morphology Erode Disk:1.5 -blur 0x1 "$T/alpha.png"
magick "$T/src.png" "$T/alpha.png" -alpha off -compose CopyOpacity -composite "$T/keyed.png"
BB=$(magick "$T/keyed.png" -alpha extract -threshold 50% -format "%@" info:)
BW=${BB%%x*}; R=${BB#*x}; BH=${R%%+*}; R=${R#*+}; BX=${R%%+*}; BY=${R#*+}
CX=$((BX + BW/2 + BW/20)); CY=$((BY + BH - BH/12)); RX=$((BW/2)); RY=$((BH/9))
magick -size ${W}x${KH} xc:none -fill "rgba(90,60,36,0.5)" -draw "ellipse $CX,$CY $RX,$RY 0,360" \
  -blur 0x$((BW/40)) "$T/shadow.png"
magick "$T/shadow.png" "$T/keyed.png" -compose over -composite -trim +repage -resize 1200x -depth 8 "$OUT"
echo "bbox $BB"

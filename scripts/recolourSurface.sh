#!/usr/bin/env sh
# usage: recolourSurface.sh MASTER OUT [HUE_DEG CHROMA SOFTEN GAIN]
# Recolours a water or sand master at import: keeps its CIELAB lightness, replaces a/b with one muted tint
# (hue/chroma), and scales the lightness above the median by SOFTEN so the pale caustic net sits fainter
# while the dark depth patches stay as painted. GAIN scales the whole lightness (below 1 darkens).
set -e
src=$1; out=$2; h=${3:-230}; c=${4:-17}; k=${5:-0.55}; g=${6:-1}
A=$(awk -v h="$h" -v c="$c" 'BEGIN{print (0.5+c*cos(h*3.14159265/180)/255)*100}')
B=$(awk -v h="$h" -v c="$c" 'BEGIN{print (0.5+c*sin(h*3.14159265/180)/255)*100}')
size=$(magick "$src" -format "%wx%h" info:)
m=$(magick "$src" -colorspace Lab -channel R -separate +channel -format "%[fx:median]" info:)
magick "$src" -colorspace Lab -separate -delete 1,2 \
  -fx "(u>$m ? $m+(u-$m)*$k : u)*$g" \
  \( -size "$size" xc:gray50 -evaluate set "$A%" \) \
  \( -size "$size" xc:gray50 -evaluate set "$B%" \) -combine -set colorspace Lab -colorspace sRGB -depth 8 "$out"

# Fonts

`kenney-future.ttf` is "Kenney Future" from Kenney's CC0 fonts pack.

kaplay's built-in font is a small bitmap font, and bitmap glyphs with 1px
strokes fall apart under any scaling that isn't exactly 1:1 -- letters lost and
gained pixel columns, so "Pickup" rendered as "Pirkup". A TTF is rasterised at
whatever size it is asked for instead of being resampled from a fixed image,
so it stays legible regardless of how the canvas is scaled.

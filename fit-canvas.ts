// Snap the canvas to a whole-number scale of its internal resolution.
//
// kaplay renders a fixed 1280x720 and CSS was stretching that to whatever the
// container happened to be -- about 1.04x on a typical window. Nearest-neighbour
// sampling (crisp: true) at a fractional scale duplicates some pixel columns
// and drops others, which chunky 48px tiles shrug off and 1px font strokes do
// not: letters came out as "Pirkup" and "scunc". Rounding the displayed size
// down to an exact multiple makes every source pixel land on a whole number of
// device pixels, so text is sharp at any window size that fits.
//
// Only upscaling is snapped. A window too small for even 1x still has to shrink
// the canvas, and a hard floor there would push the game off-screen instead.

const MIN_MARGIN = 12;

export function fitCanvas(canvas: HTMLCanvasElement, logicalWidth: number, logicalHeight: number): void {
  const host = canvas.parentElement ?? document.body;

  const apply = () => {
    // The host's top is set by the page header above it, not by the canvas, so
    // reading it here doesn't feed back into the size being computed.
    const top = host.getBoundingClientRect().top;
    const availableWidth = host.clientWidth;
    const availableHeight = window.innerHeight - top - MIN_MARGIN;
    if (availableWidth <= 0 || availableHeight <= 0) return;

    const raw = Math.min(availableWidth / logicalWidth, availableHeight / logicalHeight);
    const scale = raw >= 1 ? Math.floor(raw) : raw;

    canvas.style.width = `${Math.round(logicalWidth * scale)}px`;
    canvas.style.height = `${Math.round(logicalHeight * scale)}px`;
  };

  apply();
  window.addEventListener("resize", apply);
  // Catches container changes a resize event misses -- devtools opening, the
  // page's own layout settling after fonts load.
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(apply).observe(host);
  }
}

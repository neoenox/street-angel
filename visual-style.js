/* Clothing colors preserve shade, skin, ink outlines and alpha.
   Thug has variants; Yankee uses one teal identity for every animation. */
function shiftClothingPixels(pixels, kind, variant) {
  const tones = {
    thug: [[1, 1, 1], [.44, .76, 1], [.72, .78, .40]],
  };
  // Yankee keeps one jacket identity across legacy walking and newer combat art.
  const tone = kind === 'yankee' ? [.22, .72, .74] : tones[kind] && tones[kind][variant];
  if (!tone || (variant === 0 && kind !== 'yankee')) return pixels;
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    const selected = kind === 'thug'
      ? r > g * 1.55 && r > b * 1.35 && r - g > 25 && r - b > 25
      : g > r * 1.25 && b > r * 1.2 && g > b * .70 && g - r > 18;
    if (!pixels[i + 3] || !selected) continue;
    const light = Math.max(r, g, b), shade = Math.min(r, g, b) * .35;
    for (let channel = 0; channel < 3; channel++)
      pixels[i + channel] = shade + (light - shade) * tone[channel];
  }
  return pixels;
}
if (typeof module !== 'undefined') module.exports = { shiftClothingPixels };

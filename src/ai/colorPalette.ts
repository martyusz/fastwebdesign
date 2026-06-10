function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/** Extracts `count` dominant colors from a canvas via k-means on sampled pixels. */
export function extractPalette(canvas: HTMLCanvasElement, count = 5): string[] {
  const ctx = canvas.getContext('2d')!;
  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);

  const samples: [number, number, number][] = [];
  const step = Math.max(1, Math.floor((width * height) / 5000));
  for (let i = 0; i < data.length; i += 4 * step) {
    const alpha = data[i + 3];
    if (alpha < 16) continue;
    samples.push([data[i], data[i + 1], data[i + 2]]);
  }
  if (samples.length === 0) return Array(count).fill('#808080');

  // Initialize centroids by spreading across the sample array.
  let centroids: [number, number, number][] = Array.from({ length: count }, (_, i) => {
    const idx = Math.floor((i / count) * samples.length);
    return [...samples[idx]] as [number, number, number];
  });

  for (let iter = 0; iter < 8; iter++) {
    const sums = Array.from({ length: count }, () => [0, 0, 0, 0]);
    for (const [r, g, b] of samples) {
      let best = 0;
      let bestDist = Infinity;
      for (let c = 0; c < count; c++) {
        const [cr, cg, cb] = centroids[c];
        const dist = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
        if (dist < bestDist) {
          bestDist = dist;
          best = c;
        }
      }
      sums[best][0] += r;
      sums[best][1] += g;
      sums[best][2] += b;
      sums[best][3] += 1;
    }
    centroids = centroids.map((centroid, i) => {
      const [sr, sg, sb, n] = sums[i];
      return n > 0 ? ([sr / n, sg / n, sb / n] as [number, number, number]) : centroid;
    });
  }

  // Sort swatches by perceived luminance, darkest first.
  centroids.sort((a, b) => (a[0] * 0.299 + a[1] * 0.587 + a[2] * 0.114) - (b[0] * 0.299 + b[1] * 0.587 + b[2] * 0.114));

  return centroids.map(([r, g, b]) => rgbToHex(r, g, b));
}

/** Returns a complementary palette (180° hue shift) for the given hex colors. */
export function complementaryPalette(hexColors: string[]): string[] {
  return hexColors.map((hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const [h, s, l] = rgbToHsl(r, g, b);
    const [nr, ng, nb] = hslToRgb(h + 180, s, l);
    return rgbToHex(nr, ng, nb);
  });
}

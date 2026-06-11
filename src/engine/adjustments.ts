import type {
  AdjustmentLayerData,
  AdjustmentType,
  BrightnessContrastSettings,
  ColorBalanceSettings,
  CurvePoint,
  CurvesSettings,
  ExposureSettings,
  HueSaturationSettings,
  LevelsSettings,
  VibranceSettings,
} from './types';

export const ADJUSTMENT_LABELS: Record<AdjustmentType, string> = {
  curves: 'Curves',
  levels: 'Levels',
  'brightness-contrast': 'Brightness/Contrast',
  'hue-saturation': 'Hue/Saturation',
  'color-balance': 'Color Balance',
  exposure: 'Exposure',
  vibrance: 'Vibrance',
};

const IDENTITY_CURVE: CurvePoint[] = [
  { x: 0, y: 0 },
  { x: 255, y: 255 },
];

/** Returns default settings for a freshly-created adjustment layer of the given type. */
export function defaultAdjustmentSettings(type: AdjustmentType): AdjustmentLayerData['settings'] {
  switch (type) {
    case 'curves':
      return {
        rgb: IDENTITY_CURVE.map((p) => ({ ...p })),
        r: IDENTITY_CURVE.map((p) => ({ ...p })),
        g: IDENTITY_CURVE.map((p) => ({ ...p })),
        b: IDENTITY_CURVE.map((p) => ({ ...p })),
      } satisfies CurvesSettings;
    case 'levels':
      return { inputBlack: 0, inputWhite: 255, gamma: 1, outputBlack: 0, outputWhite: 255 } satisfies LevelsSettings;
    case 'brightness-contrast':
      return { brightness: 0, contrast: 0 } satisfies BrightnessContrastSettings;
    case 'hue-saturation':
      return { hue: 0, saturation: 0, lightness: 0 } satisfies HueSaturationSettings;
    case 'color-balance':
      return { cyanRed: 0, magentaGreen: 0, yellowBlue: 0, preserveLuminosity: true } satisfies ColorBalanceSettings;
    case 'exposure':
      return { exposure: 0, offset: 0, gamma: 1 } satisfies ExposureSettings;
    case 'vibrance':
      return { vibrance: 0, saturation: 0 } satisfies VibranceSettings;
  }
}

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

/** Builds a 256-entry lookup table from a tone curve via Catmull-Rom interpolation through sorted points. */
export function buildCurveLUT(points: CurvePoint[]): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256);
  const sorted = [...points].sort((a, b) => a.x - b.x);
  if (sorted.length < 2) {
    for (let x = 0; x < 256; x++) lut[x] = x;
    return lut;
  }

  for (let x = 0; x < 256; x++) {
    if (x <= sorted[0].x) {
      lut[x] = clamp255(sorted[0].y);
      continue;
    }
    if (x >= sorted[sorted.length - 1].x) {
      lut[x] = clamp255(sorted[sorted.length - 1].y);
      continue;
    }

    let i = 0;
    while (i < sorted.length - 2 && x > sorted[i + 1].x) i++;

    const p1 = sorted[i];
    const p2 = sorted[i + 1];
    const p0 = sorted[i - 1] ?? p1;
    const p3 = sorted[i + 2] ?? p2;

    const span = p2.x - p1.x;
    const t = span === 0 ? 0 : (x - p1.x) / span;
    const t2 = t * t;
    const t3 = t2 * t;

    const y =
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

    lut[x] = clamp255(Math.round(y));
  }

  return lut;
}

function buildLevelsLUT(s: LevelsSettings): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256);
  const inLow = Math.min(s.inputBlack, s.inputWhite);
  const inHigh = Math.max(s.inputBlack, s.inputWhite);
  const range = Math.max(1, inHigh - inLow);
  const invGamma = 1 / Math.max(0.01, s.gamma);
  const outLow = s.outputBlack;
  const outHigh = s.outputWhite;

  for (let x = 0; x < 256; x++) {
    let v = (x - inLow) / range;
    v = v < 0 ? 0 : v > 1 ? 1 : v;
    v = Math.pow(v, invGamma);
    v = outLow + v * (outHigh - outLow);
    lut[x] = clamp255(Math.round(v));
  }

  return lut;
}

function midtoneWeight(v: number): number {
  const n = v / 255;
  return Math.max(0, 1 - (2 * n - 1) * (2 * n - 1));
}

/** Computes per-channel (r/g/b) and luminance histograms for a canvas (each array has 256 buckets). */
export function computeHistogram(source: HTMLCanvasElement): { r: number[]; g: number[]; b: number[]; luma: number[] } {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(source, 0, 0);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const r = new Array(256).fill(0);
  const g = new Array(256).fill(0);
  const b = new Array(256).fill(0);
  const luma = new Array(256).fill(0);

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0) continue;
    const rv = data[i];
    const gv = data[i + 1];
    const bv = data[i + 2];
    r[rv]++;
    g[gv]++;
    b[bv]++;
    luma[Math.round(0.299 * rv + 0.587 * gv + 0.114 * bv)]++;
  }

  return { r, g, b, luma };
}

/** Applies a non-destructive adjustment to a copy of `source`, returning a new canvas. */
export function applyAdjustment(source: HTMLCanvasElement, adjustment: AdjustmentLayerData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(source, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  switch (adjustment.type) {
    case 'curves': {
      const s = adjustment.settings as CurvesSettings;
      const rgbLUT = buildCurveLUT(s.rgb);
      const rLUT = buildCurveLUT(s.r);
      const gLUT = buildCurveLUT(s.g);
      const bLUT = buildCurveLUT(s.b);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = rgbLUT[rLUT[data[i]]];
        data[i + 1] = rgbLUT[gLUT[data[i + 1]]];
        data[i + 2] = rgbLUT[bLUT[data[i + 2]]];
      }
      break;
    }

    case 'levels': {
      const lut = buildLevelsLUT(adjustment.settings as LevelsSettings);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = lut[data[i]];
        data[i + 1] = lut[data[i + 1]];
        data[i + 2] = lut[data[i + 2]];
      }
      break;
    }

    case 'brightness-contrast': {
      const s = adjustment.settings as BrightnessContrastSettings;
      const brightness = s.brightness * 1.275; // map -100..100 to -127.5..127.5
      const c = s.contrast * 2.55;
      const factor = (259 * (c + 255)) / (255 * (259 - c));
      for (let i = 0; i < data.length; i += 4) {
        data[i] = clamp255(factor * (data[i] + brightness - 128) + 128);
        data[i + 1] = clamp255(factor * (data[i + 1] + brightness - 128) + 128);
        data[i + 2] = clamp255(factor * (data[i + 2] + brightness - 128) + 128);
      }
      break;
    }

    case 'hue-saturation': {
      const s = adjustment.settings as HueSaturationSettings;
      const angle = (s.hue * Math.PI) / 180;
      const sat = 1 + s.saturation / 100;
      const lightness = s.lightness / 100;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const m = [
        0.213 + cosA * 0.787 - sinA * 0.213,
        0.715 - cosA * 0.715 - sinA * 0.715,
        0.072 - cosA * 0.072 + sinA * 0.928,
        0.213 - cosA * 0.213 + sinA * 0.143,
        0.715 + cosA * 0.285 + sinA * 0.14,
        0.072 - cosA * 0.072 - sinA * 0.283,
        0.213 - cosA * 0.213 - sinA * 0.787,
        0.715 - cosA * 0.715 + sinA * 0.715,
        0.072 + cosA * 0.928 + sinA * 0.072,
      ];
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const hr = m[0] * r + m[1] * g + m[2] * b;
        const hg = m[3] * r + m[4] * g + m[5] * b;
        const hb = m[6] * r + m[7] * g + m[8] * b;
        const luma = 0.213 * hr + 0.715 * hg + 0.072 * hb;
        let nr = luma + (hr - luma) * sat;
        let ng = luma + (hg - luma) * sat;
        let nb = luma + (hb - luma) * sat;
        if (lightness > 0) {
          nr = nr * (1 - lightness) + 255 * lightness;
          ng = ng * (1 - lightness) + 255 * lightness;
          nb = nb * (1 - lightness) + 255 * lightness;
        } else if (lightness < 0) {
          nr = nr * (1 + lightness);
          ng = ng * (1 + lightness);
          nb = nb * (1 + lightness);
        }
        data[i] = clamp255(nr);
        data[i + 1] = clamp255(ng);
        data[i + 2] = clamp255(nb);
      }
      break;
    }

    case 'color-balance': {
      const s = adjustment.settings as ColorBalanceSettings;
      const shiftR = (s.cyanRed / 100) * 255;
      const shiftG = (s.magentaGreen / 100) * 255;
      const shiftB = (s.yellowBlue / 100) * 255;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        let nr = r + shiftR * midtoneWeight(r);
        let ng = g + shiftG * midtoneWeight(g);
        let nb = b + shiftB * midtoneWeight(b);
        if (s.preserveLuminosity) {
          const before = 0.299 * r + 0.587 * g + 0.114 * b;
          const after = 0.299 * nr + 0.587 * ng + 0.114 * nb;
          const diff = before - after;
          nr += diff;
          ng += diff;
          nb += diff;
        }
        data[i] = clamp255(nr);
        data[i + 1] = clamp255(ng);
        data[i + 2] = clamp255(nb);
      }
      break;
    }

    case 'exposure': {
      const s = adjustment.settings as ExposureSettings;
      const exposureFactor = Math.pow(2, s.exposure);
      const invGamma = 1 / Math.max(0.01, s.gamma);
      for (let i = 0; i < data.length; i += 4) {
        for (let c = 0; c < 3; c++) {
          let v = data[i + c] / 255;
          v = v * exposureFactor + s.offset;
          v = v < 0 ? 0 : v;
          v = Math.pow(v, invGamma);
          data[i + c] = clamp255(v * 255);
        }
      }
      break;
    }

    case 'vibrance': {
      const s = adjustment.settings as VibranceSettings;
      const vib = s.vibrance / 100;
      const sat = s.saturation / 100;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const currentSat = (max - min) / 255;
        const satIncrease = vib * (1 - currentSat) + sat;
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        data[i] = clamp255(luma + (r - luma) * (1 + satIncrease));
        data[i + 1] = clamp255(luma + (g - luma) * (1 + satIncrease));
        data[i + 2] = clamp255(luma + (b - luma) * (1 + satIncrease));
      }
      break;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

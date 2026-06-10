import type { FilterDef } from './types';

/** Runs a per-pixel transform over a copy of the source canvas. */
function mapPixels(
  source: HTMLCanvasElement,
  transform: (data: Uint8ClampedArray) => void,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(source, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  transform(imageData.data);
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export const brightnessContrast: FilterDef = {
  id: 'brightness-contrast',
  label: 'Brightness / Contrast',
  params: [
    { id: 'brightness', label: 'Brightness', min: -100, max: 100, step: 1, defaultValue: 0 },
    { id: 'contrast', label: 'Contrast', min: -100, max: 100, step: 1, defaultValue: 0 },
  ],
  apply: (source, params) => {
    const brightness = (params.brightness ?? 0) * 1.275; // map -100..100 to -127.5..127.5
    const c = (params.contrast ?? 0) * 2.55;
    const factor = (259 * (c + 255)) / (255 * (259 - c));
    return mapPixels(source, (data) => {
      for (let i = 0; i < data.length; i += 4) {
        data[i] = factor * (data[i] + brightness - 128) + 128;
        data[i + 1] = factor * (data[i + 1] + brightness - 128) + 128;
        data[i + 2] = factor * (data[i + 2] + brightness - 128) + 128;
      }
    });
  },
};

export const hueSaturation: FilterDef = {
  id: 'hue-saturation',
  label: 'Hue / Saturation',
  params: [
    { id: 'hue', label: 'Hue', min: -180, max: 180, step: 1, defaultValue: 0, unit: '°' },
    { id: 'saturation', label: 'Saturation', min: -100, max: 100, step: 1, defaultValue: 0 },
  ],
  apply: (source, params) => {
    const angle = ((params.hue ?? 0) * Math.PI) / 180;
    const sat = 1 + (params.saturation ?? 0) / 100;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    // Hue rotation matrix (Rec. 709 luma weights), then saturation lerp toward luma.
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

    return mapPixels(source, (data) => {
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const hr = m[0] * r + m[1] * g + m[2] * b;
        const hg = m[3] * r + m[4] * g + m[5] * b;
        const hb = m[6] * r + m[7] * g + m[8] * b;
        const luma = 0.213 * hr + 0.715 * hg + 0.072 * hb;
        data[i] = luma + (hr - luma) * sat;
        data[i + 1] = luma + (hg - luma) * sat;
        data[i + 2] = luma + (hb - luma) * sat;
      }
    });
  },
};

export const grayscale: FilterDef = {
  id: 'grayscale',
  label: 'Grayscale',
  params: [],
  apply: (source) =>
    mapPixels(source, (data) => {
      for (let i = 0; i < data.length; i += 4) {
        const luma = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        data[i] = luma;
        data[i + 1] = luma;
        data[i + 2] = luma;
      }
    }),
};

export const invert: FilterDef = {
  id: 'invert',
  label: 'Invert',
  params: [],
  apply: (source) =>
    mapPixels(source, (data) => {
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i];
        data[i + 1] = 255 - data[i + 1];
        data[i + 2] = 255 - data[i + 2];
      }
    }),
};

export const sepia: FilterDef = {
  id: 'sepia',
  label: 'Sepia',
  params: [],
  apply: (source) =>
    mapPixels(source, (data) => {
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        data[i] = 0.393 * r + 0.769 * g + 0.189 * b;
        data[i + 1] = 0.349 * r + 0.686 * g + 0.168 * b;
        data[i + 2] = 0.272 * r + 0.534 * g + 0.131 * b;
      }
    }),
};

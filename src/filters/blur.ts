import type { FilterDef } from './types';

export const gaussianBlur: FilterDef = {
  id: 'gaussian-blur',
  label: 'Gaussian Blur',
  params: [{ id: 'radius', label: 'Radius', min: 0, max: 50, step: 1, defaultValue: 8, unit: 'px' }],
  apply: (source, params) => {
    const radius = params.radius ?? 0;
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext('2d')!;
    if (radius > 0) ctx.filter = `blur(${radius}px)`;
    ctx.drawImage(source, 0, 0);
    return canvas;
  },
};

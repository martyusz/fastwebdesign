import { brightnessContrast, grayscale, hueSaturation, invert, sepia } from './adjustments';
import { gaussianBlur } from './blur';
import type { FilterDef } from './types';

export type { FilterDef, FilterParamDef } from './types';

export const FILTERS: FilterDef[] = [
  brightnessContrast,
  hueSaturation,
  gaussianBlur,
  grayscale,
  invert,
  sepia,
];

export function getFilter(filterId: string): FilterDef | undefined {
  return FILTERS.find((f) => f.id === filterId);
}

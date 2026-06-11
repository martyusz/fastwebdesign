export interface FilterParamDef {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit?: string;
}

export interface FilterDef {
  id: string;
  label: string;
  /** An empty params list means the filter applies instantly, without a dialog. */
  params: FilterParamDef[];
  apply: (source: HTMLCanvasElement, params: Record<string, number>) => HTMLCanvasElement;
}

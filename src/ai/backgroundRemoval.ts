import { cloneCanvas } from '../engine/layer';

// transformers.js types are loose; keep this module's surface narrow and typed locally.
type ProgressInfo = { status: string; progress?: number };
type Segmenter = (input: string) => Promise<Array<{ mask: { data: Uint8ClampedArray | Uint8Array; width: number; height: number } }>>;

let segmenterPromise: Promise<Segmenter> | null = null;

async function getSegmenter(onProgress?: (status: string) => void): Promise<Segmenter> {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const { env, pipeline } = await import('@xenova/transformers');
      env.allowLocalModels = false;
      const segmenter = await pipeline('image-segmentation', 'Xenova/modnet', {
        progress_callback: (info: ProgressInfo) => {
          if (!onProgress) return;
          if (info.status === 'progress' && typeof info.progress === 'number') {
            onProgress(`Downloading model… ${Math.round(info.progress)}%`);
          } else if (info.status === 'ready' || info.status === 'done') {
            onProgress('Running…');
          } else {
            onProgress(info.status);
          }
        },
      });
      return segmenter as unknown as Segmenter;
    })();
  }
  return segmenterPromise;
}

/**
 * Runs client-side background segmentation on a canvas and returns a copy with the
 * background made transparent.
 */
export async function removeBackground(
  source: HTMLCanvasElement,
  onProgress?: (status: string) => void,
): Promise<HTMLCanvasElement> {
  onProgress?.('Loading model…');
  const segmenter = await getSegmenter(onProgress);

  onProgress?.('Segmenting…');
  const dataUrl = source.toDataURL('image/png');
  const result = await segmenter(dataUrl);
  const mask = result[0]?.mask;
  if (!mask) throw new Error('Segmentation produced no mask');

  const out = cloneCanvas(source);
  const ctx = out.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, out.width, out.height);

  const sameSize = mask.width === out.width && mask.height === out.height;
  for (let y = 0; y < out.height; y++) {
    for (let x = 0; x < out.width; x++) {
      const pixelIndex = y * out.width + x;
      let maskValue: number;
      if (sameSize) {
        maskValue = mask.data[pixelIndex];
      } else {
        const mx = Math.floor((x / out.width) * mask.width);
        const my = Math.floor((y / out.height) * mask.height);
        maskValue = mask.data[my * mask.width + mx];
      }
      const alphaIndex = pixelIndex * 4 + 3;
      imageData.data[alphaIndex] = Math.round((imageData.data[alphaIndex] * maskValue) / 255);
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return out;
}

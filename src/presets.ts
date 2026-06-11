export interface SocialPreset {
  id: string;
  label: string;
  width: number;
  height: number;
  /** Safe-zone inset as a fraction of width/height on each side. */
  safeZoneInset: number;
}

export const SOCIAL_PRESETS: SocialPreset[] = [
  { id: 'ig-post', label: 'Instagram Post', width: 1080, height: 1080, safeZoneInset: 0.05 },
  { id: 'ig-story', label: 'IG Story', width: 1080, height: 1920, safeZoneInset: 0.08 },
  { id: 'reel-cover', label: 'Reel Cover', width: 1080, height: 1920, safeZoneInset: 0.08 },
  { id: 'tiktok', label: 'TikTok', width: 1080, height: 1920, safeZoneInset: 0.08 },
  { id: 'x-header', label: 'X Header', width: 1500, height: 500, safeZoneInset: 0.05 },
  { id: 'yt-thumb', label: 'YouTube Thumbnail', width: 1280, height: 720, safeZoneInset: 0.05 },
];

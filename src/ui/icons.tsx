import type { ReactNode } from 'react';
import type { ToolName } from '../engine/types';

interface IconProps {
  className?: string;
}

const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const ICON_PATHS: Record<ToolName, ReactNode> = {
  move: (
    <>
      <path d="M12 2v20M2 12h20" />
      <path d="M5 9l-3 3 3 3M19 9l3 3-3 3M9 5l3-3 3 3M9 19l3 3 3-3" />
    </>
  ),
  marquee: (
    <rect x="3" y="3" width="18" height="18" rx="1" strokeDasharray="3 3" />
  ),
  lasso: (
    <path d="M5 8c0-3 3-5 7-5s7 2 7 5-3 5-7 5c-1.5 0-2.8-.3-3.8-.8L6 16l1.5-3.2C5.6 11.7 5 10 5 8z" />
  ),
  brush: (
    <>
      <path d="M9.06 11.9l8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.07" />
      <path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 .74C2.92 17.5 2.5 16 4 14.5c1.06-1.06 2.5-1.5 3.07-1.06" />
    </>
  ),
  eraser: (
    <>
      <path d="M20 20H8.5L4 15.5a1 1 0 0 1 0-1.41L13.59 4.5a2 2 0 0 1 2.82 0l4.18 4.18a2 2 0 0 1 0 2.82L13 19" />
    </>
  ),
  pencil: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),
  bucket: (
    <>
      <path d="M2 12l9-9 9 9-9 9-9-9z" />
      <path d="M11 3l8 8" />
      <path d="M19 14c1 1.5 2 2.6 2 3.8 0 1.3-1 2.2-2 2.2s-2-.9-2-2.2c0-1.2 1-2.3 2-3.8z" />
    </>
  ),
  gradient: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 12h18" opacity="0.4" />
      <path d="M3 7h18" opacity="0.2" />
      <path d="M3 17h18" opacity="0.6" />
    </>
  ),
  eyedropper: (
    <>
      <path d="M14 6l4 4" />
      <path d="M3 21l1.5-4.5L13 8l3 3-8.5 8.5z" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L18 8l-3-3z" />
    </>
  ),
  rectangle: <rect x="3" y="5" width="18" height="14" rx="1" />,
  ellipse: <ellipse cx="12" cy="12" rx="9" ry="7" />,
  line: <path d="M4 20L20 4" />,
  text: (
    <>
      <path d="M5 5h14" />
      <path d="M12 5v14" />
      <path d="M9 19h6" />
    </>
  ),
  crop: (
    <>
      <path d="M6 2v14a2 2 0 0 0 2 2h14" />
      <path d="M18 22V8a2 2 0 0 0-2-2H2" />
    </>
  ),
  transform: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="1" strokeDasharray="2 2" />
      <path d="M4 4l-2-2M20 4l2-2M4 20l-2 2M20 20l2 2" />
    </>
  ),
  zoom: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
      <path d="M8 11h6M11 8v6" />
    </>
  ),
  hand: (
    <>
      <path d="M8 12V5a1.5 1.5 0 0 1 3 0v6" />
      <path d="M11 11V3.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M14 10.5V4.5a1.5 1.5 0 0 1 3 0V12" />
      <path d="M17 11.5a1.5 1.5 0 0 1 3 0V16c0 3.5-2 7-7 7s-7-2.5-7.5-5L4 13.5a1.4 1.4 0 0 1 2.5-1.2L8 14" />
    </>
  ),
};

export function ToolIcon({ name, className }: { name: ToolName } & IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      {ICON_PATHS[name]}
    </svg>
  );
}

export function Icon({
  path,
  className,
}: { path: ReactNode } & IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      {path}
    </svg>
  );
}

export const ICONS = {
  undo: <path d="M3 7v6h6M3 13a9 9 0 1 0 3-7" />,
  redo: <path d="M21 7v6h-6M21 13a9 9 0 1 1-3-7" />,
  layers: (
    <>
      <path d="M12 2 2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </>
  ),
  eye: (
    <>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a18.7 18.7 0 0 1 4.22-5.22M9.9 4.24A10.94 10.94 0 0 1 12 5c7 0 11 7 11 7a18.7 18.7 0 0 1-2.16 3.19" />
      <path d="M1 1l22 22" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="11" width="16" height="9" rx="1" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  unlock: (
    <>
      <rect x="4" y="11" width="16" height="9" rx="1" />
      <path d="M8 11V7a4 4 0 0 1 7.5-3" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6" />
    </>
  ),
  duplicate: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="1" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  history: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
      <path d="M12 8v4l3 3" />
    </>
  ),
  mask: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="12" cy="12" r="5" fill="currentColor" stroke="none" />
    </>
  ),
  grip: (
    <>
      <circle cx="9" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="18" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="18" r="1" fill="currentColor" stroke="none" />
    </>
  ),
};

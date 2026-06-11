import type { ReactNode } from 'react';

const base = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function Icon({ path, className }: { path: ReactNode; className?: string }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      {path}
    </svg>
  );
}

export const ICONS = {
  play: <path d="M6 4l14 8-14 8V4z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <rect x="6" y="4" width="4" height="16" fill="currentColor" stroke="none" />
      <rect x="14" y="4" width="4" height="16" fill="currentColor" stroke="none" />
    </>
  ),
  stop: <rect x="5" y="5" width="14" height="14" rx="1" fill="currentColor" stroke="none" />,
  skipStart: (
    <>
      <path d="M5 4v16" />
      <path d="M19 5L8 12l11 7V5z" fill="currentColor" stroke="none" />
    </>
  ),
  skipEnd: (
    <>
      <path d="M19 4v16" />
      <path d="M5 5l11 7-11 7V5z" fill="currentColor" stroke="none" />
    </>
  ),
  loop: (
    <>
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
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
  download: (
    <>
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M4 21h16" />
    </>
  ),
};

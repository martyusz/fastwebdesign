export function Logo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 select-none ${className ?? ''}`}>
      <svg
        width="22"
        height="22"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Anvil */}
        <path
          d="M5 22h12l3-3h6l2 3v2H5v-2z"
          fill="#7c5cff"
        />
        <rect x="13" y="24" width="6" height="4" rx="1" fill="#7c5cff" />
        {/* Spark */}
        <path
          d="M21 4l1.6 4.2L27 10l-4.4 1.8L21 16l-1.6-4.2L15 10l4.4-1.8z"
          fill="#ffffff"
        />
        <path
          d="M21 4l1.6 4.2L27 10l-4.4 1.8L21 16l-1.6-4.2L15 10l4.4-1.8z"
          fill="#7c5cff"
          fillOpacity="0.35"
        />
      </svg>
      <span className="text-[15px] font-semibold tracking-tight text-zinc-100">
        Pixel<span className="text-[#7c5cff]">Forge</span>
      </span>
    </div>
  );
}

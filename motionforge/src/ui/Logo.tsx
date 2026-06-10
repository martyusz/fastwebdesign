export function Logo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 select-none ${className ?? ''}`}>
      <svg
        width="24"
        height="24"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Motion trails */}
        <path d="M3 8 L17 16 L3 24 Z" fill="#22d3ee" fillOpacity="0.18" />
        <path d="M7 8 L21 16 L7 24 Z" fill="#22d3ee" fillOpacity="0.35" />
        {/* Play triangle */}
        <path d="M11 7 L26 16 L11 25 Z" fill="#22d3ee" />
      </svg>
      <span className="text-[15px] font-semibold tracking-tight text-zinc-100">
        Motion<span className="text-[#22d3ee]">Forge</span>
      </span>
    </div>
  );
}

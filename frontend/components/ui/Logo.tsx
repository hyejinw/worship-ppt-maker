export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 십자가 */}
      <rect x="14" y="4" width="4" height="16" rx="2" fill="#3a7d44" />
      <rect x="8" y="8" width="16" height="4" rx="2" fill="#3a7d44" />
      {/* 마이크 */}
      <rect x="13" y="20" width="6" height="6" rx="3" fill="#4e9e5a" opacity="0.9" />
      <path d="M10 23 Q10 28 16 28 Q22 28 22 23" stroke="#3a7d44" strokeWidth="1.5" fill="none" />
      <line x1="16" y1="28" x2="16" y2="30" stroke="#3a7d44" strokeWidth="1.5" />
      <line x1="13" y1="30" x2="19" y2="30" stroke="#3a7d44" strokeWidth="1.5" />
    </svg>
  );
}

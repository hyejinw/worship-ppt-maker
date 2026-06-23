import Link from "next/link";
import Image from "next/image";
import { StepIndicator } from "./StepIndicator";

const HEADER_BG = "rgba(248,248,245,0.95)";
const HEADER_BORDER = "#D6DAD3";
const HEADER_TEXT = "#151A16";
const HEADER_MUTED = "#6B746C";

interface HeaderProps {
  step?: 1 | 2 | 3;
}

export function Header({ step }: HeaderProps) {
  return (
    <header className="px-4 sm:px-10 py-3 sm:py-4 flex items-center justify-between gap-3"
      style={{ borderBottom: `1px solid ${HEADER_BORDER}`, background: HEADER_BG, backdropFilter: "blur(14px)" }}>
      <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
        <Image src="/hymnly-logo.png" alt="Hymnly" width={37} height={37} className="object-contain" />
        <div className="min-w-0">
          <span className="font-bold text-base tracking-tight" style={{ color: HEADER_TEXT }}>Hymnly</span>
          <p className="hidden sm:block text-[10px] font-medium tracking-widest uppercase -mt-0.5" style={{ color: HEADER_MUTED }}>Worship Slides</p>
        </div>
      </Link>
      <div className="shrink-0">
        {step && <StepIndicator current={step} />}
      </div>
    </header>
  );
}

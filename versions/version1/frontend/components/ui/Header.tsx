import Link from "next/link";
import Image from "next/image";
import { StepIndicator } from "./StepIndicator";

interface HeaderProps {
  step?: 1 | 2 | 3;
}

export function Header({ step }: HeaderProps) {
  return (
    <header className="px-6 sm:px-10 py-4 flex items-center justify-between"
      style={{ borderBottom: "1px solid #D8EBD0", background: "#F2F7F0" }}>
      <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
        <Image src="/hymnly-logo.png" alt="Hymnly" width={37} height={37} className="object-contain" />
        <div>
          <span className="font-bold text-[#2E5E3E] text-base tracking-tight">Hymnly</span>
          <p className="text-[10px] text-[#5BAA72] font-medium tracking-widest uppercase -mt-0.5">Worship Slides</p>
        </div>
      </Link>
      {step && <StepIndicator current={step} />}
    </header>
  );
}

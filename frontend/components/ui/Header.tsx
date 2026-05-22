import Link from "next/link";
import { Logo } from "./Logo";
import { StepIndicator } from "./StepIndicator";

interface HeaderProps {
  step?: 1 | 2 | 3;
}

export function Header({ step }: HeaderProps) {
  return (
    <header className="border-b border-border bg-bg-sub px-6 py-3 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <Logo size={28} />
        <span className="font-bold text-text-primary tracking-tight">찬양 PPT</span>
      </Link>
      {step && <StepIndicator current={step} />}
    </header>
  );
}

import { clsx } from "clsx";
import { Check } from "lucide-react";

const STEPS = ["곡 선택", "슬라이드 편집", "PPT 설정"];

export function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isDone = step < current;
        return (
          <div key={step} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={clsx(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                  isActive && "bg-accent text-white shadow-sm",
                  isDone && "bg-accent/20 text-accent border border-accent/40",
                  !isActive && !isDone && "bg-card border border-border text-text-muted"
                )}
              >
                {isDone ? <Check size={12} strokeWidth={3} /> : step}
              </div>
              <span
                className={clsx(
                  "text-sm hidden sm:block",
                  isActive ? "text-text-primary font-medium" : isDone ? "text-accent/70" : "text-text-muted"
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={clsx("w-8 h-px mx-2", isDone ? "bg-accent/30" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

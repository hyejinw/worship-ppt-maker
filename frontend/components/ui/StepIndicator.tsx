import { clsx } from "clsx";

const STEPS = ["곡 선택", "슬라이드 편집", "PPT 설정"];

export function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isDone = step < current;
        return (
          <div key={step} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className={clsx(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                  isActive && "bg-gold text-black",
                  isDone && "bg-success text-black",
                  !isActive && !isDone && "bg-card border border-border text-text-muted"
                )}
              >
                {isDone ? "✓" : step}
              </div>
              <span
                className={clsx(
                  "text-sm",
                  isActive ? "text-text-primary font-medium" : "text-text-muted"
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="w-8 h-px bg-border mx-1" />
            )}
          </div>
        );
      })}
    </div>
  );
}

import { clsx } from "clsx";
import { Check } from "lucide-react";

const STEPS = ["가사 검색", "슬라이드 편집", "PPT 설정"];

export function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const activeStep = current;

  return (
    <div className="flex items-center gap-1">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const isActive = step === activeStep;
        const isDone = step < activeStep;
        return (
          <div key={step} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={clsx(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                  isActive && "text-white",
                  isDone && "border",
                  !isActive && !isDone && "border"
                )}
                style={
                  isActive
                    ? { background: "#2E5E3E" }
                    : isDone
                    ? { background: "rgba(46,94,62,0.12)", color: "#2E5E3E", borderColor: "rgba(46,94,62,0.3)" }
                    : { background: "white", color: "#86a88e", borderColor: "#D8EBD0" }
                }
              >
                {isDone ? <Check size={12} strokeWidth={3} /> : step}
              </div>
              <span
                className={clsx("text-sm hidden sm:block")}
                style={
                  isActive
                    ? { color: "#1a3824", fontWeight: 600 }
                    : isDone
                    ? { color: "#5BAA72" }
                    : { color: "#86a88e" }
                }
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="w-8 h-px mx-2"
                style={{ background: isDone ? "rgba(91,170,114,0.4)" : "#D8EBD0" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

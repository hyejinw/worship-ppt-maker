"use client";
import { useRef, useState, useEffect } from "react";
import { clsx } from "clsx";

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("");
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [mode, setMode] = useState<"hex" | "rgb">("hex");
  const ref = useRef<HTMLDivElement>(null);

  // 피커 닫힐 때 draft를 현재 확정값으로 동기화
  useEffect(() => {
    if (!open) setDraft(value);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const rgb = hexToRgb(draft.length === 7 ? draft : value);

  const handleRgbChange = (channel: "r" | "g" | "b", raw: string) => {
    const n = parseInt(raw);
    if (isNaN(n)) return;
    const next = { ...rgb, [channel]: Math.max(0, Math.min(255, n)) };
    setDraft(rgbToHex(next.r, next.g, next.b));
  };

  const handleHexInput = (v: string) => {
    const clean = v.startsWith("#") ? v : "#" + v;
    if (/^#[0-9a-fA-F]{0,6}$/.test(clean)) setDraft(clean);
  };

  const handleConfirm = () => {
    const full = draft.length === 7 ? draft : value;
    onChange(full);
    setOpen(false);
  };

  const safeValue = value.length === 7 ? value : "#000000";

  return (
    <div className="relative" ref={ref}>
      {/* 트리거: 클릭하면 바로 피커 표시 */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "flex items-center gap-2 w-full border rounded-lg px-3 py-2 transition-colors",
          open ? "border-gold" : "border-border hover:border-gold"
        )}
      >
        <div
          className="w-5 h-5 rounded border border-border flex-shrink-0"
          style={{ backgroundColor: safeValue }}
        />
        <span className="text-sm text-text-primary font-mono">{safeValue}</span>
        {label && <span className="ml-auto text-xs text-text-muted">{label}</span>}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 z-50 bg-card border border-border rounded-xl shadow-2xl p-4 w-64">
          {/* 컬러 스펙트럼 */}
          <input
            type="color"
            value={draft.length === 7 ? draft : safeValue}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full rounded border-0 cursor-pointer block"
            style={{ height: 120, padding: 0 }}
          />

          {/* HEX / RGB 탭 */}
          <div className="flex mt-3 mb-2 rounded-lg overflow-hidden border border-border text-xs">
            {(["hex", "rgb"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={clsx(
                  "flex-1 py-1 font-medium transition-colors uppercase",
                  mode === m ? "bg-gold text-black" : "text-text-muted hover:text-text-primary"
                )}
              >
                {m}
              </button>
            ))}
          </div>

          {mode === "hex" ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted w-8">HEX</span>
              <input
                type="text"
                value={draft}
                onChange={(e) => handleHexInput(e.target.value)}
                className="flex-1 bg-bg border border-border rounded px-2 py-1.5 text-sm text-text-primary font-mono focus:border-gold"
                spellCheck={false}
              />
            </div>
          ) : (
            <div className="flex gap-1">
              {(["r", "g", "b"] as const).map((ch) => (
                <div key={ch} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-text-muted uppercase">{ch}</span>
                  <input
                    type="number"
                    min={0}
                    max={255}
                    value={rgb[ch]}
                    onChange={(e) => handleRgbChange(ch, e.target.value)}
                    className="w-full bg-bg border border-border rounded px-1 py-1.5 text-sm text-text-primary text-center focus:border-gold"
                  />
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleConfirm}
            className="mt-3 w-full py-1.5 bg-gold text-black rounded-lg text-sm font-medium hover:bg-gold-light transition-colors"
          >
            선택
          </button>
        </div>
      )}
    </div>
  );
}

"use client";
import { useState } from "react";

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
}

const PRESETS = [
  "#000000", "#0d0d0d", "#1a1a2e", "#16213e", "#1a1a40",
  "#0f2027", "#1b2838", "#2c2c54", "#1e3a5f", "#0a3d62",
  "#2E5E3E", "#1e6b4a", "#155724", "#1a3a1a", "#2d4a22",
  "#4a1942", "#6b1a1a", "#1a3a5c", "#3d2b1f", "#4a3728",
  "#ffffff", "#f5f5f5", "#e8e8e8", "#d4d4d4", "#b0b0b0",
  "#fffde7", "#e8f5e9", "#e3f2fd", "#fce4ec", "#f3e5f5",
];

const PANEL_TEXT = "#151A16";
const PANEL_MUTED = "#6B746C";
const PANEL_SOFT = "#EEF2EC";
const PANEL_BORDER = "#D6DAD3";
const PANEL_ACCENT = "#223B2A";

function isValidHex(v: string) {
  return /^#[0-9a-fA-F]{6}$/.test(v);
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  const safeValue = isValidHex(value) ? value : "#000000";
  const safeDraft = isValidHex(draft) ? draft : safeValue;

  const handleHexInput = (v: string) => {
    const clean = v.startsWith("#") ? v : "#" + v;
    setDraft(clean);
    if (isValidHex(clean)) onChange(clean);
  };

  const handlePreset = (hex: string) => {
    setDraft(hex);
    onChange(hex);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* 트리거 */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl transition-all"
        style={{
          background: "#FFFFFF",
          border: `1.5px solid ${open ? PANEL_ACCENT : PANEL_BORDER}`,
        }}
      >
        <div
          className="w-5 h-5 rounded-md flex-shrink-0"
          style={{ backgroundColor: safeValue, boxShadow: "0 0 0 1px rgba(0,0,0,0.12)" }}
        />
        <span className="text-sm font-mono" style={{ color: PANEL_TEXT }}>{safeValue}</span>
        {label && <span className="ml-auto text-xs" style={{ color: PANEL_MUTED }}>{label}</span>}
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className="ml-auto flex-shrink-0 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", color: PANEL_MUTED }}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* 인라인 패널 */}
      {open && (
        <div
          className="rounded-2xl p-3 flex flex-col gap-3"
          style={{ background: PANEL_SOFT, border: `1px solid ${PANEL_BORDER}` }}
        >
          {/* 현재 색상 + hex 입력 */}
          <div className="flex items-center gap-2">
            <label
              className="w-8 h-8 rounded-lg flex-shrink-0 cursor-pointer transition-transform hover:scale-110 active:scale-95"
              style={{ backgroundColor: safeDraft, boxShadow: "0 0 0 1px rgba(0,0,0,0.1)" }}
              title="색상 휠에서 선택"
            >
              <input
                type="color"
                value={safeDraft}
                onChange={(e) => { setDraft(e.target.value); onChange(e.target.value); }}
                className="sr-only"
              />
            </label>
            <input
              type="text"
              value={draft}
              onChange={(e) => handleHexInput(e.target.value)}
              onBlur={() => { if (!isValidHex(draft)) setDraft(safeValue); }}
              className="flex-1 min-w-0 text-sm font-mono rounded-lg px-2.5 py-1.5 focus:outline-none"
              style={{ background: "#FFFFFF", border: `1px solid ${PANEL_BORDER}`, color: PANEL_TEXT }}
              spellCheck={false}
              maxLength={7}
              placeholder="#000000"
            />
          </div>

          {/* 프리셋 팔레트 */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: PANEL_MUTED }}>
              색상 팔레트
            </p>
            <div className="grid grid-cols-10 gap-1">
              {PRESETS.map((hex) => (
                <button
                  key={hex}
                  onClick={() => handlePreset(hex)}
                  title={hex}
                  className="rounded-md transition-transform hover:scale-110 active:scale-95"
                  style={{
                    aspectRatio: "1",
                    backgroundColor: hex,
                    boxShadow:
                      safeDraft === hex
                        ? `0 0 0 2px white, 0 0 0 3.5px ${PANEL_ACCENT}`
                        : "0 0 0 1px rgba(0,0,0,0.1)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

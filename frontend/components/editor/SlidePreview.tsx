"use client";
import { useRef, useState, useCallback } from "react";
import { PPTSettings } from "@/store/pptStore";

interface SlidePreviewProps {
  lyrics: string;
  settings: PPTSettings;
  onPositionChange: (x: number, y: number) => void;
}

const SNAP_POSITIONS = [20, 50, 75];
const SNAP_THRESHOLD = 5;

const GOOGLE_FONTS: Record<string, string> = {
  NanumGothic: "'Nanum Gothic', sans-serif",
  NanumMyeongjo: "'Nanum Myeongjo', serif",
  NanumSquare: "'Nanum Square', sans-serif",
  NotoSansKR: "'Noto Sans KR', sans-serif",
};

export function SlidePreview({ lyrics, settings, onPositionChange }: SlidePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [snapY, setSnapY] = useState<number | null>(null);

  const { text_position, bg_type, bg_value, overlay_opacity, font_family, font_size } = settings;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setDragging(true);

      const move = (ev: MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const xPct = Math.max(0, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100));
        let yPct = Math.max(0, Math.min(100, ((ev.clientY - rect.top) / rect.height) * 100));

        // 스냅
        let snapped: number | null = null;
        for (const snap of SNAP_POSITIONS) {
          if (Math.abs(yPct - snap) <= SNAP_THRESHOLD) {
            yPct = snap;
            snapped = snap;
            break;
          }
        }
        setSnapY(snapped);
        onPositionChange(xPct, yPct);
      };

      const up = () => {
        setDragging(false);
        setSnapY(null);
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
      };

      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    },
    [onPositionChange]
  );

  const bgStyle: React.CSSProperties = (() => {
    if (bg_type === "black") return { backgroundColor: "#000" };
    if (bg_type === "color" && bg_value) return { backgroundColor: bg_value };
    if (bg_type === "image" && bg_value)
      return { backgroundImage: `url(${bg_value})`, backgroundSize: "cover", backgroundPosition: "center" };
    return { backgroundColor: "#000" };
  })();

  const scaledFontSize = Math.max(8, Math.round(font_size * 0.4));

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none overflow-hidden rounded-lg border border-border"
      style={{ aspectRatio: "16/9", cursor: dragging ? "grabbing" : "default", ...bgStyle }}
    >
      {/* Google Fonts 로드 */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Nanum+Gothic&family=Nanum+Myeongjo&family=Nanum+Square&family=Noto+Sans+KR&display=swap"
      />

      {/* 오버레이 */}
      {overlay_opacity > 0 && (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: `rgba(0,0,0,${overlay_opacity})` }}
        />
      )}

      {/* 스냅 가이드라인 */}
      {snapY !== null && (
        <div
          className="absolute inset-x-0 pointer-events-none"
          style={{
            top: `${snapY}%`,
            height: "1px",
            backgroundColor: "#4a9eff",
            boxShadow: "0 0 4px #4a9eff",
          }}
        />
      )}
      {SNAP_POSITIONS.map((pos) => (
        <div
          key={pos}
          className="absolute inset-x-0 pointer-events-none opacity-20"
          style={{ top: `${pos}%`, height: "1px", backgroundColor: "#4a9eff" }}
        />
      ))}

      {/* 텍스트 박스 */}
      <div
        className="absolute pointer-events-auto"
        style={{
          left: "50%",
          top: `${text_position.y}%`,
          transform: "translate(-50%, -50%)",
          width: "85%",
          cursor: "grab",
          padding: "4px",
          border: "1px dashed rgba(255,255,255,0.3)",
          borderRadius: "4px",
        }}
        onMouseDown={handleMouseDown}
      >
        <p
          style={{
            fontFamily: GOOGLE_FONTS[font_family] || "sans-serif",
            fontSize: `${scaledFontSize}px`,
            color: "white",
            textAlign: "center",
            whiteSpace: "pre-line",
            lineHeight: 1.5,
            textShadow: "0 1px 4px rgba(0,0,0,0.8)",
            userSelect: "none",
          }}
        >
          {lyrics || "슬라이드 미리보기"}
        </p>
      </div>
    </div>
  );
}

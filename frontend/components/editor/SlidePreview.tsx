"use client";
import { useRef, useState, useCallback, useEffect } from "react";
import { PPTSettings } from "@/store/pptStore";

interface SlidePreviewProps {
  lyrics: string;
  songTitle?: string;
  settings: PPTSettings;
  onPositionChange: (x: number, y: number) => void;
  onTitlePositionChange?: (x: number, y: number) => void;
  editable?: boolean;
  onLyricsChange?: (lyrics: string) => void;
  onLyricsEditStart?: () => void;
  onTextBoxWidthChange?: (width: number) => void;
  onTextDragStart?: () => void;
  onTitleDragStart?: () => void;
  onResizeStart?: () => void;
  fullscreen?: boolean;
  thumbnail?: boolean;
}

const SNAP_POSITIONS = [30, 50, 70];
const SNAP_X_POSITIONS = [20, 50, 80];
const SNAP_THRESHOLD = 5;

const GOOGLE_FONTS: Record<string, string> = {
  NanumGothic: "'Nanum Gothic', sans-serif",
  NanumMyeongjo: "'Nanum Myeongjo', serif",
  NanumSquare: "'Nanum Square', sans-serif",
  NotoSansKR: "'Noto Sans KR', sans-serif",
  ATitleGothic1: "'ATitleGothic1', sans-serif",
  ATitleGothic2: "'ATitleGothic2', sans-serif",
  ATitleGothic3: "'ATitleGothic3', sans-serif",
};

// 실제 PPT 슬라이드 너비 (Inches(13.33) = 960pt 기준)
const PPT_WIDTH_PT = 13.33 * 72;

export function SlidePreview({
  lyrics,
  songTitle,
  settings,
  onPositionChange,
  onTitlePositionChange,
  editable = false,
  onLyricsChange,
  onLyricsEditStart,
  onTextBoxWidthChange,
  onTextDragStart,
  onTitleDragStart,
  onResizeStart,
  fullscreen = false,
  thumbnail = false,
}: SlidePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [dragging, setDragging] = useState(false);
  const [draggingTitle, setDraggingTitle] = useState(false);
  const [resizing, setResizing] = useState<null | "left" | "right">(null);
  const [isEditing, setIsEditing] = useState(false);
  const [snapX, setSnapX] = useState<number | null>(null);
  const [snapY, setSnapY] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const { text_position, title_position, bg_type, bg_value, overlay_opacity, font_family, font_size, font_color, show_title } = settings;
  const textBoxWidth = Math.max(35, Math.min(95, settings.text_box_width ?? 95));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerWidth(el.offsetWidth));
    ro.observe(el);
    setContainerWidth(el.offsetWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (isEditing) {
      textareaRef.current?.focus();
    }
  }, [isEditing]);

  // 프리뷰 컨테이너 너비 기준으로 실제 PPT 비율에 맞게 폰트 크기 환산
  const scaledFontSize = containerWidth > 0
    ? Math.max(4, Math.round(font_size * (containerWidth / PPT_WIDTH_PT)))
    : Math.round(font_size * 0.4);
  const scaledTitleFontSize = Math.max(10, Math.round(scaledFontSize * 0.48));

  useEffect(() => {
    if (!isEditing || !textareaRef.current) return;
    const el = textareaRef.current;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [isEditing, lyrics, containerWidth, scaledFontSize]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isEditing) return;
      e.preventDefault();

      const startX = e.clientX;
      const startY = e.clientY;
      let moved = false;

      const move = (ev: MouseEvent) => {
        if (!containerRef.current) return;
        if (!moved && Math.hypot(ev.clientX - startX, ev.clientY - startY) > 4) {
          moved = true;
          onTextDragStart?.();
          setDragging(true);
        }
        if (!moved) return;

        const rect = containerRef.current.getBoundingClientRect();
        let xPct = 50;
        let yPct = Math.max(0, Math.min(100, ((ev.clientY - rect.top) / rect.height) * 100));

        let snappedX: number | null = null;
        for (const snap of SNAP_X_POSITIONS) {
          if (Math.abs(xPct - snap) <= SNAP_THRESHOLD) {
            xPct = snap;
            snappedX = snap;
            break;
          }
        }
        let snapped: number | null = null;
        for (const snap of SNAP_POSITIONS) {
          if (Math.abs(yPct - snap) <= SNAP_THRESHOLD) {
            yPct = snap;
            snapped = snap;
            break;
          }
        }
        setSnapX(snappedX);
        setSnapY(snapped);
        onPositionChange(xPct, yPct);
      };

      const up = () => {
        if (!moved && editable && !fullscreen) {
          onLyricsEditStart?.();
          setIsEditing(true);
        }
        setDragging(false);
        setSnapX(null);
        setSnapY(null);
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
      };

      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    },
    [editable, fullscreen, isEditing, onLyricsEditStart, onPositionChange, onTextDragStart]
  );

  const handleTitleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!editable || fullscreen || !onTitlePositionChange) return;
      e.preventDefault();
      e.stopPropagation();
      onTitleDragStart?.();
      setDraggingTitle(true);

      const move = (ev: MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        let xPct = Math.max(10, Math.min(90, ((ev.clientX - rect.left) / rect.width) * 100));
        let yPct = Math.max(10, Math.min(95, ((ev.clientY - rect.top) / rect.height) * 100));

        let snappedX: number | null = null;
        for (const snap of SNAP_X_POSITIONS) {
          if (Math.abs(xPct - snap) <= SNAP_THRESHOLD) {
            xPct = snap;
            snappedX = snap;
            break;
          }
        }
        let snappedY: number | null = null;
        for (const snap of SNAP_POSITIONS) {
          if (Math.abs(yPct - snap) <= SNAP_THRESHOLD) {
            yPct = snap;
            snappedY = snap;
            break;
          }
        }
        setSnapX(snappedX);
        setSnapY(snappedY);
        onTitlePositionChange(xPct, yPct);
      };

      const up = () => {
        setDraggingTitle(false);
        setSnapX(null);
        setSnapY(null);
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
      };

      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    },
    [editable, fullscreen, onTitleDragStart, onTitlePositionChange]
  );

  const handleResizeStart = useCallback(
    (direction: "left" | "right") => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!containerRef.current) return;
      onResizeStart?.();
      setResizing(direction);

      const startX = e.clientX;
      const startWidth = textBoxWidth;
      const rect = containerRef.current.getBoundingClientRect();

      const move = (ev: MouseEvent) => {
        const deltaPx = direction === "right" ? ev.clientX - startX : startX - ev.clientX;
        const deltaPct = (deltaPx / rect.width) * 200;
        const nextWidth = Math.max(35, Math.min(95, Math.round(startWidth + deltaPct)));
        onTextBoxWidthChange?.(nextWidth);
      };

      const up = () => {
        setResizing(null);
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
      };

      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    },
    [onResizeStart, onTextBoxWidthChange, textBoxWidth]
  );

  const bgStyle: React.CSSProperties = (() => {
    if (bg_type === "black") return { backgroundColor: "#000" };
    if (bg_type === "color" && bg_value) return { backgroundColor: bg_value };
    if (bg_type === "image" && bg_value)
      return { backgroundImage: `url(${bg_value})`, backgroundSize: "cover", backgroundPosition: "center" };
    return { backgroundColor: "#000" };
  })();

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none overflow-hidden"
      style={{
        ...(fullscreen
          ? { height: "100%" }
          : thumbnail
          ? { aspectRatio: "16/9", borderRadius: "6px" }
          : { aspectRatio: "16/9", borderRadius: "8px", boxShadow: "0 0 0 1px #1e1e1e, 0 8px 24px rgba(0,0,0,0.5)" }
        ),
        cursor: dragging ? "grabbing" : draggingTitle ? "grabbing" : resizing ? "ew-resize" : "default",
        ...bgStyle,
      }}
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
      {snapX !== null && (
        <div
          className="absolute inset-y-0 pointer-events-none"
          style={{
            left: `${snapX}%`,
            width: "1px",
            backgroundColor: "#4a9eff",
            boxShadow: "0 0 4px #4a9eff",
          }}
        />
      )}
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
      {SNAP_X_POSITIONS.map((pos) => (
        <div
          key={`x-${pos}`}
          className="absolute inset-y-0 pointer-events-none opacity-20"
          style={{ left: `${pos}%`, width: "1px", backgroundColor: "#4a9eff" }}
        />
      ))}

      {/* 텍스트 박스 */}
      <div
        className="absolute pointer-events-auto"
        style={{
          left: "50%",
          top: `${text_position.y}%`,
          transform: "translate(-50%, -50%)",
          width: `${textBoxWidth}%`,
          padding: "4px",
          border: "1px dashed rgba(255,255,255,0.3)",
          borderRadius: "4px",
          cursor: editable && !fullscreen && !isEditing ? "move" : "default",
        }}
        onMouseDown={handleMouseDown}
      >
        {editable && !fullscreen && (
          <>
            <button
              type="button"
              aria-label="텍스트 박스 너비 조절 왼쪽"
              onMouseDown={handleResizeStart("left")}
              className="absolute left-0 top-0 bottom-0 w-3 -translate-x-1/2 cursor-ew-resize"
              style={{ background: "transparent" }}
            />
            <button
              type="button"
              aria-label="텍스트 박스 너비 조절 오른쪽"
              onMouseDown={handleResizeStart("right")}
              className="absolute right-0 top-0 bottom-0 w-3 translate-x-1/2 cursor-ew-resize"
              style={{ background: "transparent" }}
            />
          </>
        )}
        {editable && !fullscreen && isEditing ? (
          <textarea
            ref={textareaRef}
            value={lyrics}
            onChange={(e) => onLyricsChange?.(e.target.value)}
            onBlur={() => setIsEditing(false)}
            className="w-full resize-none overflow-hidden bg-transparent text-center focus:outline-none"
            style={{
              height: `${Math.max(96, scaledFontSize * 3.6)}px`,
              fontFamily: GOOGLE_FONTS[font_family] || "sans-serif",
              fontSize: `${scaledFontSize}px`,
              color: font_color || "#ffffff",
              lineHeight: 1.5,
              textShadow: "0 1px 4px rgba(0,0,0,0.8)",
            }}
            spellCheck={false}
          />
        ) : (
          <p
            style={{
              fontFamily: GOOGLE_FONTS[font_family] || "sans-serif",
              fontSize: `${scaledFontSize}px`,
              color: font_color || "#ffffff",
              textAlign: "center",
              whiteSpace: "pre-line",
              lineHeight: 1.5,
              textShadow: "0 1px 4px rgba(0,0,0,0.8)",
              userSelect: editable && !fullscreen ? "text" : "none",
            }}
          >
            {lyrics || "슬라이드 미리보기"}
          </p>
        )}
      </div>

      {/* 하단 오른쪽 곡 제목 */}
      {show_title && songTitle && (
        <div
          className="absolute pointer-events-auto"
          style={{
            left: `${title_position.x}%`,
            top: `${title_position.y}%`,
            transform: "translate(-50%, -50%)",
            width: "32%",
            maxWidth: "32%",
            cursor: editable && !fullscreen ? "move" : "default",
          }}
          onMouseDown={handleTitleMouseDown}
        >
          <p
            style={{
              fontFamily: GOOGLE_FONTS[font_family] || "sans-serif",
              fontSize: `${scaledTitleFontSize}px`,
              color: font_color || "#ffffff",
              textAlign: "center",
              whiteSpace: "nowrap",
              userSelect: "none",
              textShadow: "0 1px 4px rgba(0,0,0,0.8)",
            }}
          >
            - {songTitle}
          </p>
        </div>
      )}
    </div>
  );
}

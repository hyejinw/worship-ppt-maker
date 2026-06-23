"use client";
import { useRef, useState } from "react";
import { PPTSettings } from "@/store/pptStore";
import { api } from "@/lib/api";
import { Upload, Loader2, Clock } from "lucide-react";
import { clsx } from "clsx";
import { ColorPicker } from "./ColorPicker";

interface BackgroundPanelProps {
  settings: PPTSettings;
  onChange: (patch: Partial<PPTSettings>) => void;
  uploadedUrl: string | null;
  onUploadedUrlChange: (url: string) => void;
  colorValue: string;
  onColorChange: (hex: string) => void;
}

type BgTab = "black" | "color" | "upload" | "unsplash";

const TAB_LABELS: { key: BgTab; label: string }[] = [
  { key: "black", label: "블랙" },
  { key: "color", label: "단색" },
  { key: "upload", label: "업로드" },
  { key: "unsplash", label: "Unsplash" },
];

const PANEL_MUTED = "#6B746C";
const PANEL_SOFT = "#EEF2EC";
const PANEL_BORDER = "#D6DAD3";
const PANEL_ACCENT = "#223B2A";

export function BackgroundPanel({
  settings,
  onChange,
  uploadedUrl,
  onUploadedUrlChange,
  colorValue,
  onColorChange,
}: BackgroundPanelProps) {
  const [tab, setTab] = useState<BgTab>(() => {
    if (settings.bg_type === "image") {
      if (settings.bg_value?.includes("unsplash")) return "unsplash";
      return "upload";
    }
    return (settings.bg_type as BgTab) || "black";
  });
  const [uploadLoading, setUploadLoading] = useState(false);
  const [unsplashHovered, setUnsplashHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTabChange = (t: BgTab) => {
    setTab(t);
    if (t === "black") {
      onChange({ bg_type: "black", bg_value: null });
    } else if (t === "color") {
      onChange({ bg_type: "color", bg_value: colorValue });
    } else if (t === "upload") {
      if (uploadedUrl) {
        onChange({ bg_type: "image", bg_value: uploadedUrl });
      }
    }
  };

  const handleColorChange = (hex: string) => {
    onColorChange(hex);
    onChange({ bg_type: "color", bg_value: hex });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploadLoading(true);
    try {
      const result = await api.uploadImage(file);
      onUploadedUrlChange(result.url);
      onChange({ bg_type: "image", bg_value: result.url });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploadLoading(false);
    }
  };

  const isUploadActive = settings.bg_type === "image" && settings.bg_value === uploadedUrl;

  return (
    <div>
      <div className="relative mb-3">
        <div className="flex rounded-2xl overflow-hidden p-1" style={{ border: `1px solid ${PANEL_BORDER}`, background: PANEL_SOFT }}>
          {TAB_LABELS.map((t) => (
            <button
              key={t.key}
              onClick={() => t.key !== "unsplash" && handleTabChange(t.key)}
              onMouseEnter={() => t.key === "unsplash" && setUnsplashHovered(true)}
              onMouseLeave={() => t.key === "unsplash" && setUnsplashHovered(false)}
              className={clsx("flex-1 py-1.5 rounded-xl text-xs font-semibold transition-colors", t.key === "unsplash" && "opacity-40 cursor-not-allowed")}
              style={{
                background: tab === t.key ? PANEL_ACCENT : "transparent",
                color: tab === t.key ? "#FFFFFF" : PANEL_MUTED,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        {unsplashHovered && (
          <div className="absolute -top-8 right-0 whitespace-nowrap rounded-md bg-gray-800 px-2 py-1 text-[11px] text-white z-10">
            서비스 준비 중
          </div>
        )}
      </div>

      {tab === "black" && (
        <div className="h-12 rounded-xl bg-black flex items-center justify-center text-xs" style={{ border: `1px solid ${PANEL_BORDER}`, color: "#AAB2AA" }}>
          #000000
        </div>
      )}

      {tab === "color" && (
        <ColorPicker value={colorValue} onChange={handleColorChange} />
      )}

      {tab === "upload" && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileUpload}
          />
          {uploadedUrl ? (
            <div className="flex flex-col gap-2">
              <div
                className="h-24 rounded-xl bg-cover bg-center border-2 transition-colors"
                style={{
                  backgroundImage: `url(${uploadedUrl})`,
                  borderColor: isUploadActive ? PANEL_ACCENT : PANEL_BORDER,
                }}
              />
              <div className="flex gap-2">
                {!isUploadActive && (
                  <button
                    onClick={() => onChange({ bg_type: "image", bg_value: uploadedUrl })}
                    className="flex-1 py-1.5 text-xs font-semibold rounded-xl transition-colors"
                    style={{ border: `1px solid ${PANEL_ACCENT}`, color: PANEL_ACCENT, background: "#FFFFFF" }}
                  >
                    이 이미지 사용
                  </button>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadLoading}
                  className="flex-1 py-1.5 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1"
                  style={{ border: `1px solid ${PANEL_BORDER}`, color: PANEL_MUTED, background: "#FFFFFF" }}
                >
                  {uploadLoading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                  {uploadLoading ? "업로드 중..." : "교체"}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadLoading}
              className="w-full rounded-xl py-6 flex flex-col items-center gap-2 transition-colors"
              style={{ border: `1px dashed ${PANEL_BORDER}`, color: PANEL_MUTED, background: "#FFFFFF" }}
            >
              {uploadLoading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
              <span className="text-xs">{uploadLoading ? "업로드 중..." : "이미지 선택 (JPG/PNG/WebP, 10MB 이하)"}</span>
            </button>
          )}
        </div>
      )}

      {tab === "unsplash" && (
        <div className="h-20 rounded-xl flex flex-col items-center justify-center gap-1.5" style={{ border: `1px dashed ${PANEL_BORDER}`, color: PANEL_MUTED, background: "#FFFFFF" }}>
          <Clock size={16} />
          <span className="text-xs">Unsplash 검색은 준비 중이에요</span>
        </div>
      )}
    </div>
  );
}

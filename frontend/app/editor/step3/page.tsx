"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/ui/Header";
import { Button } from "@/components/ui/Button";
import { SlidePreview } from "@/components/editor/SlidePreview";
import { BackgroundPanel } from "@/components/editor/BackgroundPanel";
import { usePPTStore } from "@/store/pptStore";
import { api } from "@/lib/api";
import { saveProject, getOrCreateSessionId } from "@/lib/localStorage";
import { ArrowLeft, Wand2, ChevronLeft, ChevronRight } from "lucide-react";

const FONTS = [
  { value: "NanumGothic", label: "나눔고딕" },
  { value: "NanumMyeongjo", label: "나눔명조" },
  { value: "NanumSquare", label: "나눔스퀘어" },
  { value: "NotoSansKR", label: "Noto Sans KR" },
];

export default function Step3() {
  const router = useRouter();
  const { slides, settings, updateSettings, songs, setJob } = usePPTStore();
  const [previewIndex, setPreviewIndex] = useState(0);
  const [generating, setGenerating] = useState(false);

  const activeSlide = slides[previewIndex];

  const handleGenerate = async () => {
    if (slides.length === 0) return;
    setGenerating(true);

    try {
      const sessionId = getOrCreateSessionId();
      const result = await api.generatePPT({
        slides,
        settings: settings as unknown as object,
        session_id: sessionId,
        songs: songs.map((s) => s.title),
      });

      setJob(result.job_id);

      const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
      saveProject({
        id: result.job_id,
        title: `${today} 찬양`,
        songs: songs.map((s) => s.title),
        createdAt: new Date().toISOString(),
      });

      router.push(`/done?job_id=${result.job_id}`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "PPT 생성 요청에 실패했습니다.");
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <Header step={3} />

      <main className="flex-1 flex overflow-hidden" style={{ height: "calc(100vh - 57px - 73px)" }}>
        {/* 왼쪽: 미리보기 */}
        <div className="flex-1 flex flex-col p-6 gap-4 overflow-auto">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-text-primary">슬라이드 미리보기</h2>
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <button
                onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))}
                disabled={previewIndex === 0}
                className="p-1 hover:text-text-primary disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <span>{previewIndex + 1} / {slides.length}</span>
              <button
                onClick={() => setPreviewIndex(Math.min(slides.length - 1, previewIndex + 1))}
                disabled={previewIndex >= slides.length - 1}
                className="p-1 hover:text-text-primary disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <SlidePreview
            lyrics={activeSlide?.lyrics || ""}
            settings={settings}
            onPositionChange={(x, y) =>
              updateSettings({ text_position: { x, y } })
            }
          />

          <p className="text-xs text-text-muted text-center">
            텍스트 박스를 드래그해서 위치를 조정하세요. 가이드라인에 스냅됩니다.
          </p>
        </div>

        {/* 오른쪽: 설정 패널 */}
        <div className="w-80 border-l border-border bg-bg-sub overflow-y-auto p-5 flex flex-col gap-5">
          {/* 배경 */}
          <section>
            <h3 className="text-sm font-semibold text-text-primary mb-3">배경</h3>
            <BackgroundPanel settings={settings} onChange={updateSettings} />
          </section>

          {/* 오버레이 투명도 */}
          {(settings.bg_type === "image") && (
            <section>
              <h3 className="text-sm font-semibold text-text-primary mb-2">
                오버레이 투명도{" "}
                <span className="text-text-muted font-normal">
                  {Math.round(settings.overlay_opacity * 100)}%
                </span>
              </h3>
              <input
                type="range"
                min={0}
                max={0.8}
                step={0.05}
                value={settings.overlay_opacity}
                onChange={(e) =>
                  updateSettings({ overlay_opacity: parseFloat(e.target.value) })
                }
                className="w-full accent-gold"
              />
            </section>
          )}

          {/* 폰트 */}
          <section>
            <h3 className="text-sm font-semibold text-text-primary mb-2">폰트</h3>
            <select
              value={settings.font_family}
              onChange={(e) => updateSettings({ font_family: e.target.value })}
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-gold"
            >
              {FONTS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </section>

          {/* 폰트 크기 */}
          <section>
            <h3 className="text-sm font-semibold text-text-primary mb-2">
              폰트 크기{" "}
              <span className="text-text-muted font-normal">{settings.font_size}pt</span>
            </h3>
            <input
              type="range"
              min={20}
              max={60}
              step={2}
              value={settings.font_size}
              onChange={(e) => updateSettings({ font_size: parseInt(e.target.value) })}
              className="w-full accent-gold"
            />
            <div className="flex justify-between text-xs text-text-muted mt-1">
              <span>20pt</span>
              <span>60pt</span>
            </div>
          </section>

          {/* 텍스트 위치 수동 */}
          <section>
            <h3 className="text-sm font-semibold text-text-primary mb-2">텍스트 위치</h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "상단", y: 20 },
                { label: "중앙", y: 50 },
                { label: "하단", y: 75 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() =>
                    updateSettings({ text_position: { x: 50, y: preset.y } })
                  }
                  className={`py-2 rounded-lg border text-xs font-medium transition-colors ${
                    settings.text_position.y === preset.y
                      ? "border-gold bg-gold/10 text-gold"
                      : "border-border text-text-muted hover:border-[#555]"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* 하단 버튼 */}
      <div className="border-t border-border bg-bg-sub px-6 py-4 flex justify-between">
        <Button
          variant="secondary"
          size="lg"
          onClick={() => router.push("/editor/step2")}
          className="gap-2"
        >
          <ArrowLeft size={18} />
          이전
        </Button>
        <Button
          size="lg"
          onClick={handleGenerate}
          disabled={generating || slides.length === 0}
          className="gap-2"
        >
          {generating ? (
            <>
              <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              생성 중...
            </>
          ) : (
            <>
              <Wand2 size={18} />
              PPT 생성
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePPTStore } from "@/store/pptStore";
import { api } from "@/lib/api";
import { updateProjectDownloadUrl } from "@/lib/localStorage";
import { Button } from "@/components/ui/Button";
import { Download, Plus, ExternalLink, Loader2, CheckCircle, XCircle } from "lucide-react";

const FONT_LINKS: Record<string, { label: string; url: string; external?: boolean; downloadName?: string }> = {
  NanumGothic: { label: "나눔고딕", url: "/fonts/NanumGothic.ttf", downloadName: "NanumGothic.ttf" },
  NanumMyeongjo: { label: "나눔명조", url: "/fonts/NanumMyeongjo.ttf", downloadName: "NanumMyeongjo.ttf" },
  NanumSquare: { label: "나눔스퀘어", url: "/fonts/NanumSquareR.ttf", downloadName: "NanumSquareR.ttf" },
  NotoSansKR: { label: "Noto Sans KR", url: "/fonts/NotoSansKR-Regular.ttf", downloadName: "NotoSansKR-Regular.ttf" },
  ATitleGothic1: { label: "a타이틀고딕1", url: "/fonts/a%E1%84%90%E1%85%A1%E1%84%8B%E1%85%B5%E1%84%90%E1%85%B3%E1%86%AF%E1%84%80%E1%85%A9%E1%84%83%E1%85%B5%E1%86%A81.ttf", downloadName: "a타이틀고딕1.ttf" },
  ATitleGothic2: { label: "a타이틀고딕2", url: "/fonts/a%E1%84%90%E1%85%A1%E1%84%8B%E1%85%B5%E1%84%90%E1%85%B3%E1%86%AF%E1%84%80%E1%85%A9%E1%84%83%E1%85%B5%E1%86%A82.ttf", downloadName: "a타이틀고딕2.ttf" },
  ATitleGothic3: { label: "a타이틀고딕3", url: "/fonts/a%E1%84%90%E1%85%A1%E1%84%8B%E1%85%B5%E1%84%90%E1%85%B3%E1%86%AF%E1%84%80%E1%85%A9%E1%84%83%E1%85%B5%E1%86%A83.ttf", downloadName: "a타이틀고딕3.ttf" },
};

function formatTimestamp(date = new Date()) {
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yy}${mm}${dd}-${hh}${min}${ss}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function DoneContent({ jobId }: { jobId: string | null }) {
  const router = useRouter();
  const { jobStatus, downloadUrl, setJobStatus, settings, songSettings, songs, slides, reset } = usePPTStore();
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [pdfPreparing, setPdfPreparing] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getFileName = () => {
    const timestamp = formatTimestamp();
    const ext = !settings.merge_songs && songs.length > 1 ? "zip" : "pptx";
    return `${timestamp}-찬양.${ext}`;
  };

  const handleDownload = async () => {
    if (!downloadUrl) return;
    setDownloading(true);
    try {
      const res = await fetch(downloadUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = getFileName();
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(downloadUrl, "_blank");
    } finally {
      setDownloading(false);
    }
  };

  const handlePdfDownload = () => {
    setPdfPreparing(true);
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) {
      alert("브라우저에서 팝업을 차단했습니다. 이 사이트의 팝업 허용 후 다시 시도해주세요.");
      setPdfPreparing(false);
      return;
    }

    try {
      const songTitleMap = new Map(songs.map((song) => [song.id, song.title]));
      const groupedSongIds = songs.map((song) => song.id);
      const sortedSlides = [...slides].sort((a, b) => a.order - b.order);

      const printableSlides = settings.merge_songs
        ? sortedSlides.map((slide) => ({
            slide,
            title: slide.song_id ? songTitleMap.get(slide.song_id) : undefined,
            slideSettings: settings,
          }))
        : groupedSongIds.flatMap((songId) => {
            const perSongSettings = songSettings[songId]
              ? { ...settings, ...songSettings[songId] }
              : { ...settings };
            return sortedSlides
              .filter((slide) => slide.song_id === songId)
              .map((slide) => ({
                slide,
                title: songTitleMap.get(songId),
                slideSettings: perSongSettings,
              }));
          });

      const slidesMarkup = printableSlides
        .map(({ slide, title, slideSettings }) => {
          const bgStyle =
            slideSettings.bg_type === "color" && slideSettings.bg_value
              ? `background:${slideSettings.bg_value};`
              : slideSettings.bg_type === "image" && slideSettings.bg_value
              ? `background-image:url('${slideSettings.bg_value}');background-size:cover;background-position:center;`
              : "background:#000;";

          const overlay =
            slideSettings.bg_type === "image" && slideSettings.overlay_opacity > 0
              ? `<div class="overlay" style="background:rgba(0,0,0,${slideSettings.overlay_opacity});"></div>`
              : "";

          const titleMarkup =
            slideSettings.show_title && title
              ? `<div class="slide-title" style="left:${slideSettings.title_position.x}%;top:${slideSettings.title_position.y}%;color:${slideSettings.font_color};font-family:${slideSettings.font_family};">- ${escapeHtml(title)}</div>`
              : "";

          return `
            <section class="slide" style="${bgStyle}">
              ${overlay}
              <div class="lyrics" style="top:${slideSettings.text_position.y}%;width:${slideSettings.text_box_width}%;color:${slideSettings.font_color};font-family:${slideSettings.font_family};font-size:${slideSettings.font_size}px;">
                ${escapeHtml(slide.lyrics || "").replaceAll("\n", "<br />")}
              </div>
              ${titleMarkup}
            </section>
          `;
        })
        .join("");

      const html = `
        <!doctype html>
        <html lang="ko">
          <head>
            <meta charset="utf-8" />
            <title>${formatTimestamp()}-찬양.pdf</title>
            <style>
              @page { size: 16in 9in; margin: 0; }
              html, body { margin: 0; padding: 0; background: #111; font-family: sans-serif; }
              .slide {
                position: relative;
                width: 100vw;
                height: 56.25vw;
                max-height: 100vh;
                min-height: 100vh;
                overflow: hidden;
                page-break-after: always;
                break-after: page;
              }
              .overlay {
                position: absolute;
                inset: 0;
              }
              .lyrics {
                position: absolute;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
                white-space: pre-wrap;
                line-height: 1.5;
                text-shadow: 0 1px 4px rgba(0,0,0,0.8);
                z-index: 1;
              }
              .slide-title {
                position: absolute;
                transform: translate(-50%, -50%);
                width: 32%;
                text-align: center;
                white-space: nowrap;
                text-shadow: 0 1px 4px rgba(0,0,0,0.8);
                z-index: 1;
              }
            </style>
          </head>
          <body>${slidesMarkup}</body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.onload = () => {
        printWindow.print();
      };
    } catch (err) {
      printWindow.close();
      alert(err instanceof Error ? err.message : "PDF 준비에 실패했습니다.");
    } finally {
      setPdfPreparing(false);
    }
  };

  useEffect(() => {
    if (!jobId) {
      router.replace("/");
      return;
    }

    if (jobStatus === "done") return;

    const poll = async () => {
      try {
        const result = await api.getJobStatus(jobId);

        if (result.status === "DONE" && result.download_url) {
          setJobStatus("done", result.download_url);
          updateProjectDownloadUrl(jobId, result.download_url);
          clearInterval(pollingRef.current!);
        } else if (result.status === "FAILED") {
          setError(result.error || "PPT 생성에 실패했습니다.");
          setJobStatus("failed");
          clearInterval(pollingRef.current!);
        }
      } catch {
        // 네트워크 오류는 무시하고 계속 폴링
      }
    };

    poll();
    pollingRef.current = setInterval(poll, 2000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [jobId, jobStatus, router, setJobStatus]);

  const fontInfo = FONT_LINKS[settings.font_family];
  const isDone = jobStatus === "done" && downloadUrl;
  const isLoading = !isDone && jobStatus !== "failed";

  if (isDone || isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden" style={{ background: "#F2F7F0" }}>
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none select-none">
          <svg viewBox="0 0 800 220" xmlns="http://www.w3.org/2000/svg" className="w-full" preserveAspectRatio="none" style={{ display: "block" }}>
            <path d="M0,180 C120,100 240,60 400,90 C560,120 680,80 800,120 L800,220 L0,220 Z" fill="#C8E6C9" opacity="0.35" />
            <path d="M0,200 C100,130 220,100 380,130 C540,160 660,110 800,150 L800,220 L0,220 Z" fill="#A5D6A7" opacity="0.3" />
            <path d="M0,215 C150,170 300,150 450,170 C600,190 700,160 800,180 L800,220 L0,220 Z" fill="#81C784" opacity="0.25" />
          </svg>
        </div>

        <div className="w-full max-w-sm flex flex-col items-center text-center relative z-10">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ border: "3px solid #2E5E3E" }}>
              {isDone ? (
                <CheckCircle size={44} style={{ color: "#2E5E3E" }} />
              ) : (
                <Loader2 size={40} className="animate-spin" style={{ color: "#2E5E3E" }} />
              )}
            </div>
            {[
              { top: "-10px", left: "50%", color: "#5BAA72" },
              { top: "0px", right: "-8px", color: "#2E5E3E" },
              { top: "50%", right: "-14px", color: "#86C59A" },
              { bottom: "0px", right: "-4px", color: "#5BAA72" },
              { top: "-8px", left: "-8px", color: "#86C59A" },
              { top: "50%", left: "-14px", color: "#2E5E3E" },
              { bottom: "-4px", left: "10px", color: "#F5C842" },
              { top: "10px", right: "8px", color: "#F5C842" },
            ].map((s, i) => (
              <span key={i} className="absolute" style={{ ...s, fontSize: i % 2 === 0 ? "10px" : "8px", lineHeight: 1 }}>
                {i % 3 === 0 ? "✦" : i % 3 === 1 ? "●" : "✕"}
              </span>
            ))}
          </div>

          <h1 className="text-3xl font-extrabold mb-3" style={{ color: "#1a3824" }}>
            {isDone ? "PPT 생성 완료!" : "PPT 생성 중..."}
          </h1>
          <p className="text-sm mb-2" style={{ color: "#5BAA72" }}>
            {isDone ? "예배 PPT 파일이 성공적으로 생성되었습니다." : "예배 PPT 파일을 만들고 있습니다."}
          </p>
          <p className="text-sm mb-8" style={{ color: "#5BAA72" }}>
            {isDone ? "아래 버튼을 통해 다운로드하거나 바로 확인해보세요." : "잠시만 기다려주세요. 완료되면 같은 화면에서 바로 다운로드할 수 있습니다."}
          </p>

          {isDone && (
            <>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-base font-bold text-white transition-all disabled:opacity-60 mb-3"
                style={{ background: "#2E5E3E", boxShadow: "0 4px 20px rgba(46,94,62,0.25)" }}
              >
                {downloading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    다운로드 중...
                  </>
                ) : (
                  <>
                    <Download size={20} />
                    .pptx 다운로드
                  </>
                )}
              </button>

              <button
                onClick={handlePdfDownload}
                disabled={pdfPreparing || slides.length === 0}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-base font-bold transition-all disabled:opacity-60 mb-3"
                style={{ background: "white", color: "#2E5E3E", border: "1px solid #D8EBD0" }}
              >
                {pdfPreparing ? (
                  <>
                    <span className="w-5 h-5 border-2 border-[#D8EBD0] border-t-[#2E5E3E] rounded-full animate-spin" />
                    PDF 준비 중...
                  </>
                ) : (
                  <>
                    <Download size={20} />
                    PDF 저장
                  </>
                )}
              </button>

              <p className="text-sm mb-14 flex items-center justify-center gap-1.5" style={{ color: "#4a4a4a" }}>
                <span style={{ fontSize: 14 }}>⏱</span>
                다운로드 링크는 1시간 후 만료됩니다.
              </p>
            </>
          )}

          {isDone && fontInfo && (
            <div className="w-full rounded-2xl p-5 mb-4 text-center" style={{ background: "white", border: "1px solid #D8EBD0" }}>
              <p className="text-sm mb-1" style={{ color: "#86C59A" }}>사용된 폰트</p>
              <p className="text-lg font-bold mb-4" style={{ color: "#1a3824" }}>{fontInfo.label}</p>
              <a
                href={fontInfo.url}
                target={fontInfo.external ? "_blank" : undefined}
                rel={fontInfo.external ? "noopener noreferrer" : undefined}
                download={fontInfo.external ? undefined : fontInfo.downloadName}
                className="block"
              >
                <button
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
                  style={{ border: "1px solid #D8EBD0", color: "#1a3824", background: "white" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#F2F7F0"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}
                >
                  <ExternalLink size={14} />
                  폰트 파일 다운로드
                </button>
              </a>
              <p className="text-xs mt-3" style={{ color: "#86C59A" }}>
                PPT 파일을 열 때 폰트가 필요할 수 있습니다.
              </p>
            </div>
          )}

          {isDone && (
            <div
              className="w-full rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-all"
              style={{ background: "white", border: "1px solid #D8EBD0" }}
              onClick={() => { reset(); router.push("/editor/step1"); }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#F2F7F0"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}
            >
              <div className="relative w-12 h-12 flex-shrink-0 rounded-xl flex items-center justify-center" style={{ background: "#EAF4EC" }}>
                <svg width="26" height="22" viewBox="0 0 26 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="1" width="24" height="16" rx="2.5" stroke="#2E5E3E" strokeWidth="1.8" fill="none" />
                  <path d="M9 20h8M13 17v3" stroke="#2E5E3E" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <div
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: "#2E5E3E", border: "2px solid white" }}
                >
                  <Plus size={10} color="white" strokeWidth={3} />
                </div>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold" style={{ color: "#1a3824" }}>새 PPT 만들기</p>
              </div>
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#F2F7F0" }}>
                <span style={{ color: "#5BAA72", fontSize: 16, lineHeight: 1 }}>›</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (jobStatus === "failed") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <XCircle size={64} className="text-error mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-text-primary mb-2">생성 실패</h1>
        <p className="text-text-muted mb-8">{error || "PPT 생성 중 오류가 발생했습니다."}</p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => router.back()}>
            돌아가기
          </Button>
          <Link href="/editor/step1" onClick={reset}>
            <Button>처음부터 다시</Button>
          </Link>
        </div>
      </div>
    );
  }

  return null;
}

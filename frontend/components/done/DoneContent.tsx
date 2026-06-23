"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePPTStore } from "@/store/pptStore";
import { api } from "@/lib/api";
import { updateProjectDownloadUrl } from "@/lib/localStorage";
import { Button } from "@/components/ui/Button";
import { Download, Plus, ExternalLink, Loader2, CheckCircle, XCircle } from "lucide-react";

const TEXT = "#151A16";
const MUTED = "#6B746C";
const SOFT = "#EEF2EC";
const BORDER = "#D6DAD3";
const ACCENT = "#223B2A";

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

export function DoneContent({ jobId }: { jobId: string | null }) {
  const router = useRouter();
  const { jobStatus, downloadUrl, setJobStatus, settings, songs, slides, reset } = usePPTStore();
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [pdfHovered, setPdfHovered] = useState(false);
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
  const fileFormat = !settings.merge_songs && songs.length > 1 ? "ZIP" : "PPTX";

  if (isDone || isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden" style={{ background: "linear-gradient(145deg, #ECEEE9 0%, #DCE4DA 52%, #C9D4C8 100%)" }}>
        <div className="absolute inset-x-0 bottom-0 h-44 pointer-events-none" style={{ background: "linear-gradient(180deg, rgba(236,238,233,0) 0%, rgba(184,197,183,0.48) 100%)" }} />

        <div className="w-full max-w-sm flex flex-col items-center text-center relative z-10">
          <div className="relative mb-6">
            <div
              className="w-20 h-20 rounded-[26px] flex items-center justify-center"
              style={{ background: isDone ? ACCENT : "#F8F8F5", color: isDone ? "#FFFFFF" : ACCENT, border: `1px solid ${isDone ? ACCENT : BORDER}`, boxShadow: "0 18px 42px rgba(20,26,22,0.12)" }}
            >
              {isDone ? (
                <CheckCircle size={42} />
              ) : (
                <Loader2 size={38} className="animate-spin" />
              )}
            </div>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight mb-3" style={{ color: TEXT }}>
            {isDone ? "파일이 준비되었습니다" : "PPT를 만들고 있습니다"}
          </h1>
          <p className="text-sm mb-2 leading-6" style={{ color: MUTED }}>
            {isDone ? "예배 PPT 파일이 생성되었습니다." : "예배 PPT 파일을 만드는 중입니다."}
          </p>
          <p className="text-sm mb-8 leading-6" style={{ color: MUTED }}>
            {isDone ? "아래 버튼으로 다운로드하거나 PDF로 저장하세요." : "완료되면 이 화면에서 바로 다운로드할 수 있습니다."}
          </p>

          {!isDone && (
            <div className="w-full h-3 mb-8 overflow-hidden rounded-full" style={{ background: SOFT, border: `1px solid ${BORDER}` }}>
              <div className="h-full w-2/3 animate-pulse rounded-full" style={{ background: "linear-gradient(90deg, #9AA895 0%, #223B2A 100%)" }} />
            </div>
          )}

          {isDone && (
            <>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-base font-semibold text-white transition-all disabled:opacity-60 mb-3"
                style={{ background: ACCENT, boxShadow: "0 16px 34px rgba(34,59,42,0.18)" }}
              >
                {downloading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    다운로드 중...
                  </>
                ) : (
                  <>
                    <Download size={20} />
                    {fileFormat === "ZIP" ? "ZIP 다운로드" : "PPTX 다운로드"}
                  </>
                )}
              </button>

              <div className="relative mb-3 w-full">
                <button
                  type="button"
                  onMouseEnter={() => setPdfHovered(true)}
                  onMouseLeave={() => setPdfHovered(false)}
                  className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-base font-semibold transition-all"
                  style={{ background: "#FFFFFF", color: TEXT, border: `1px solid ${BORDER}` }}
                >
                  <Download size={20} />
                  PDF 저장
                </button>
                {pdfHovered && (
                  <div className="absolute -top-8 right-0 whitespace-nowrap rounded-md bg-gray-800 px-2 py-1 text-[11px] text-white z-10">
                    서비스 준비 중
                  </div>
                )}
              </div>

              <p className="text-sm mb-12 flex items-center justify-center gap-1.5" style={{ color: MUTED }}>
                다운로드 링크는 1시간 후 만료됩니다.
              </p>
            </>
          )}

          {isDone && fontInfo && (
            <div className="w-full rounded-[26px] p-5 mb-4 text-center" style={{ background: "#F8F8F5", border: `1px solid ${BORDER}`, boxShadow: "0 18px 42px rgba(20,26,22,0.08)" }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: MUTED }}>사용된 폰트</p>
              <p className="text-lg font-semibold mb-4" style={{ color: TEXT }}>{fontInfo.label}</p>
              <a
                href={fontInfo.url}
                target={fontInfo.external ? "_blank" : undefined}
                rel={fontInfo.external ? "noopener noreferrer" : undefined}
                download={fontInfo.external ? undefined : fontInfo.downloadName}
                className="block"
              >
                <button
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all"
                  style={{ border: `1px solid ${BORDER}`, color: TEXT, background: "#FFFFFF" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = SOFT; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFFFF"; }}
                >
                  <ExternalLink size={14} />
                  폰트 파일 다운로드
                </button>
              </a>
              <p className="text-xs mt-3 leading-5" style={{ color: MUTED }}>
                PPT 파일을 열 때 폰트가 필요할 수 있습니다.
              </p>
            </div>
          )}

          {isDone && (
            <button
              className="w-full rounded-[26px] p-4 flex items-center gap-4 cursor-pointer transition-all text-left"
              style={{ background: "#F8F8F5", border: `1px solid ${BORDER}`, boxShadow: "0 18px 42px rgba(20,26,22,0.08)" }}
              onClick={() => { reset(); router.push("/editor/step1"); }}
              onMouseEnter={(e) => { e.currentTarget.style.background = SOFT; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#F8F8F5"; }}
            >
              <div className="relative w-12 h-12 flex-shrink-0 rounded-2xl flex items-center justify-center" style={{ background: SOFT, color: ACCENT, border: `1px solid ${BORDER}` }}>
                <Plus size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: TEXT }}>새 PPT 만들기</p>
                <p className="text-xs mt-1" style={{ color: MUTED }}>처음 단계로 돌아갑니다.</p>
              </div>
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: SOFT }}>
                <span style={{ color: ACCENT, fontSize: 16, lineHeight: 1 }}>›</span>
              </div>
            </button>
          )}
        </div>
      </div>
    );
  }

  if (jobStatus === "failed") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={{ background: "linear-gradient(145deg, #ECEEE9 0%, #DCE4DA 100%)" }}>
        <div className="w-full max-w-sm rounded-[30px] p-8" style={{ background: "#F8F8F5", border: `1px solid ${BORDER}`, boxShadow: "0 24px 54px rgba(20,26,22,0.12)" }}>
          <XCircle size={56} className="mx-auto mb-6" style={{ color: "#8A2F2F" }} />
          <h1 className="text-2xl font-semibold mb-2" style={{ color: TEXT }}>생성 실패</h1>
          <p className="mb-8 text-sm leading-6" style={{ color: MUTED }}>{error || "PPT 생성 중 오류가 발생했습니다."}</p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => router.back()}>
              돌아가기
            </Button>
            <Link href="/editor/step1" onClick={reset}>
              <Button>처음부터 다시</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

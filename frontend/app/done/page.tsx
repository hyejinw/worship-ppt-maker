"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { usePPTStore } from "@/store/pptStore";
import { api } from "@/lib/api";
import { updateProjectDownloadUrl } from "@/lib/localStorage";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Download, Plus, ExternalLink, Loader2, CheckCircle, XCircle } from "lucide-react";

const FONT_LINKS: Record<string, { label: string; url: string }> = {
  NanumGothic: { label: "나눔고딕", url: "https://fonts.google.com/specimen/Nanum+Gothic" },
  NanumMyeongjo: { label: "나눔명조", url: "https://fonts.google.com/specimen/Nanum+Myeongjo" },
  NanumSquare: { label: "나눔스퀘어", url: "https://hangeul.naver.com/font" },
  NotoSansKR: { label: "Noto Sans KR", url: "https://fonts.google.com/specimen/Noto+Sans+KR" },
};

function DoneContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const jobId = searchParams.get("job_id");

  const { jobStatus, downloadUrl, setJobStatus, settings, songs, reset } = usePPTStore();
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getFileName = () => {
    const d = new Date();
    const date = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    const ext = !settings.merge_songs && songs.length > 1 ? "zip" : "pptx";
    return `${date}-찬양.${ext}`;
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
  }, [jobId]);

  const fontInfo = FONT_LINKS[settings.font_family];

  if (jobStatus === "done" && downloadUrl) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden" style={{ background: "#F2F7F0" }}>

        {/* 언덕 배경 SVG */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none select-none">
          <svg viewBox="0 0 800 220" xmlns="http://www.w3.org/2000/svg" className="w-full" preserveAspectRatio="none" style={{ display: "block" }}>
            <path d="M0,180 C120,100 240,60 400,90 C560,120 680,80 800,120 L800,220 L0,220 Z" fill="#C8E6C9" opacity="0.35" />
            <path d="M0,200 C100,130 220,100 380,130 C540,160 660,110 800,150 L800,220 L0,220 Z" fill="#A5D6A7" opacity="0.3" />
            <path d="M0,215 C150,170 300,150 450,170 C600,190 700,160 800,180 L800,220 L0,220 Z" fill="#81C784" opacity="0.25" />
          </svg>
        </div>

        <div className="w-full max-w-sm flex flex-col items-center text-center relative z-10">

          {/* 체크 아이콘 */}
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ border: "3px solid #2E5E3E" }}>
              <CheckCircle size={44} style={{ color: "#2E5E3E" }} />
            </div>
            {/* 파티클 장식 */}
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
              <span
                key={i}
                className="absolute"
                style={{ ...s, fontSize: i % 2 === 0 ? "10px" : "8px", lineHeight: 1 }}
              >
                {i % 3 === 0 ? "✦" : i % 3 === 1 ? "●" : "✕"}
              </span>
            ))}
          </div>

          <h1 className="text-3xl font-extrabold mb-3" style={{ color: "#1a3824" }}>PPT 생성 완료!</h1>
          <p className="text-sm mb-2" style={{ color: "#5BAA72" }}>예배 PPT 파일이 성공적으로 생성되었습니다.</p>
          <p className="text-sm mb-8" style={{ color: "#5BAA72" }}>아래 버튼을 통해 다운로드하거나 바로 확인해보세요.</p>

          {/* 다운로드 버튼 */}
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
          <p className="text-sm mb-14 flex items-center justify-center gap-1.5" style={{ color: "#4a4a4a" }}>
            <span style={{ fontSize: 14 }}>⏱</span>
            다운로드 링크는 1시간 후 만료됩니다.
          </p>

          {/* 폰트 카드 */}
          {fontInfo && (
            <div className="w-full rounded-2xl p-5 mb-4 text-center" style={{ background: "white", border: "1px solid #D8EBD0" }}>
              <p className="text-sm mb-1" style={{ color: "#86C59A" }}>사용된 폰트</p>
              <p className="text-lg font-bold mb-4" style={{ color: "#1a3824" }}>{fontInfo.label}</p>
              <a href={fontInfo.url} target="_blank" rel="noopener noreferrer" className="block">
                <button
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
                  style={{ border: "1px solid #D8EBD0", color: "#1a3824", background: "white" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#F2F7F0"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}
                >
                  <ExternalLink size={14} />
                  폰트 다운로드
                </button>
              </a>
              <p className="text-xs mt-3" style={{ color: "#86C59A" }}>
                PPT 파일을 다른 기기에서 열 때 폰트가 필요할 수 있습니다.
              </p>
            </div>
          )}

          {/* 새 PPT 만들기 */}
          <div
            className="w-full rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-all"
            style={{ background: "white", border: "1px solid #D8EBD0" }}
            onClick={() => { reset(); router.push("/editor/step1"); }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#F2F7F0"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}
          >
            {/* 아이콘: 모니터 + 플러스 뱃지 */}
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <Logo size={56} />
      <div className="mt-8 mb-4">
        <Loader2 size={40} className="animate-spin text-accent mx-auto" />
      </div>
      <h1 className="text-2xl font-bold text-text-primary mb-2">PPT 생성 중...</h1>
      <p className="text-text-muted text-sm">잠시만 기다려주세요.</p>
      <div className="mt-6 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-accent animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function DonePage() {
  return (
    <Suspense>
      <DoneContent />
    </Suspense>
  );
}

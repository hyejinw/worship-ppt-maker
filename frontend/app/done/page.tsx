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
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="mb-6">
          <CheckCircle size={64} className="text-success mx-auto" />
        </div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">PPT 생성 완료!</h1>
        <p className="text-text-muted mb-8">
          {songs.map((s) => s.title).join(", ")}
        </p>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <a href={downloadUrl} download="worship.pptx">
            <Button size="lg" className="w-full gap-2">
              <Download size={20} />
              .pptx 다운로드
            </Button>
          </a>
          <p className="text-xs text-text-muted">다운로드 링크는 1시간 후 만료됩니다.</p>
        </div>

        {/* 폰트 다운로드 */}
        {fontInfo && (
          <div className="mt-8 p-4 bg-card border border-border rounded-xl max-w-xs w-full">
            <p className="text-sm text-text-muted mb-2">사용된 폰트</p>
            <p className="font-medium text-text-primary mb-3">{fontInfo.label}</p>
            <a href={fontInfo.url} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" size="sm" className="w-full gap-2">
                <ExternalLink size={14} />
                폰트 다운로드
              </Button>
            </a>
            <p className="text-xs text-text-muted mt-2">
              PPT 파일을 다른 기기에서 열 때 폰트가 필요할 수 있습니다.
            </p>
          </div>
        )}

        <div className="mt-8">
          <Link href="/editor/step1" onClick={reset}>
            <Button variant="ghost" size="md" className="gap-2">
              <Plus size={16} />
              새 PPT 만들기
            </Button>
          </Link>
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
        <Loader2 size={40} className="animate-spin text-gold mx-auto" />
      </div>
      <h1 className="text-2xl font-bold text-text-primary mb-2">PPT 생성 중...</h1>
      <p className="text-text-muted text-sm">잠시만 기다려주세요.</p>
      <div className="mt-6 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-gold animate-bounce"
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

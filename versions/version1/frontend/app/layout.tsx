import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "찬양 PPT 생성기",
  description: "곡명 입력 → 가사 자동 수집 → AI 슬라이드 구분 → .pptx 다운로드",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-bg text-text-primary">{children}</body>
    </html>
  );
}

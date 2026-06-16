import { DoneContent } from "@/components/done/DoneContent";

type DonePageProps = {
  searchParams?: {
    job_id?: string | string[];
  };
};

export default function DonePage({ searchParams }: DonePageProps) {
  const rawJobId = searchParams?.job_id;
  const jobId = typeof rawJobId === "string" ? rawJobId : rawJobId?.[0] ?? null;

  return <DoneContent jobId={jobId} />;
}

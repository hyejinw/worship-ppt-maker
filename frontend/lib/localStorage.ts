export interface ProjectRecord {
  id: string;
  title: string;
  songs: string[];
  createdAt: string;
  downloadUrl?: string;
}

const KEY = "worship_ppt_projects";

export function getProjects(): ProjectRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveProject(project: ProjectRecord) {
  const projects = getProjects().filter((p) => p.id !== project.id);
  const updated = [project, ...projects].slice(0, 5);
  localStorage.setItem(KEY, JSON.stringify(updated));
}

export function updateProjectDownloadUrl(id: string, downloadUrl: string) {
  const projects = getProjects().map((p) =>
    p.id === id ? { ...p, downloadUrl } : p
  );
  localStorage.setItem(KEY, JSON.stringify(projects));
}

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("worship_session_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("worship_session_id", id);
  }
  return id;
}

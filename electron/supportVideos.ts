import fs from "node:fs";
import path from "node:path";
import type { LicenseService } from "./license";

export interface SupportTutorial {
  id: string;
  title: string;
  description: string;
  fileName: string;
  videoUrl: string;
  downloaded: boolean;
}

interface StoredTutorial {
  id: string;
  title: string;
  description: string;
  fileName: string;
  savedAt: string;
}

export class SupportVideos {
  private readonly dir: string;
  private readonly indexPath: string;

  constructor(
    userDataDir: string,
    private readonly license: LicenseService,
  ) {
    this.dir = path.join(userDataDir, "support-videos");
    this.indexPath = path.join(this.dir, "index.json");
  }

  fileFor(id: string): string | null {
    const row = this.readIndex().find((item) => item.id === id);
    if (!row) return null;
    const filePath = this.filePath(row);
    return fs.existsSync(filePath) ? filePath : null;
  }

  async list(): Promise<{ tutorials: SupportTutorial[]; offline: boolean }> {
    const local = this.readIndex().filter((row) => this.fileFor(row.id));
    try {
      const data = await this.license.callFunction("listTutorials", {}, 20000);
      if (data.ok === false) throw new Error(String(data.message || "Could not load tutorials."));
      const remote = Array.isArray(data.tutorials) ? data.tutorials : [];
      const downloaded = new Set(local.map((row) => row.id));
      const tutorials = remote
        .map((row) => this.remoteTutorial(row, downloaded))
        .filter((row) => row.id && row.title);
      return { tutorials, offline: false };
    } catch {
      return {
        offline: true,
        tutorials: local.map((row) => ({
          id: row.id,
          title: row.title,
          description: row.description,
          fileName: row.fileName,
          videoUrl: "",
          downloaded: true,
        })),
      };
    }
  }

  async download(tutorial: {
    id: string;
    title?: string;
    description?: string;
    fileName?: string;
    videoUrl?: string;
  }): Promise<SupportTutorial> {
    const id = String(tutorial.id || "").trim();
    const videoUrl = String(tutorial.videoUrl || "").trim();
    if (!id || !/^https?:\/\//i.test(videoUrl)) throw new Error("This tutorial has no video to download.");
    const response = await fetch(videoUrl);
    if (!response.ok) throw new Error("Could not download that tutorial.");
    const fileName = String(tutorial.fileName || "tutorial.mp4");
    const stored: StoredTutorial = {
      id,
      title: String(tutorial.title || "Tutorial"),
      description: String(tutorial.description || ""),
      fileName,
      savedAt: new Date().toISOString(),
    };
    fs.mkdirSync(this.dir, { recursive: true });
    fs.writeFileSync(this.filePath(stored), Buffer.from(await response.arrayBuffer()));
    const next = this.readIndex().filter((row) => row.id !== id);
    next.push(stored);
    fs.writeFileSync(this.indexPath, JSON.stringify(next, null, 2));
    return {
      id,
      title: stored.title,
      description: stored.description,
      fileName,
      videoUrl,
      downloaded: true,
    };
  }

  private remoteTutorial(row: unknown, downloaded: Set<string>): SupportTutorial {
    const item = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
    const id = String(item.id || "");
    return {
      id,
      title: String(item.title || ""),
      description: String(item.description || ""),
      fileName: String(item.fileName || ""),
      videoUrl: String(item.videoUrl || ""),
      downloaded: downloaded.has(id),
    };
  }

  private filePath(row: StoredTutorial): string {
    const ext = path.extname(row.fileName).toLowerCase() === ".webm" ? ".webm" : ".mp4";
    const clean = row.id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "tutorial";
    return path.join(this.dir, `${clean}${ext}`);
  }

  private readIndex(): StoredTutorial[] {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.indexPath, "utf8")) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((row): row is StoredTutorial => Boolean(row && typeof row === "object" && typeof row.id === "string"));
    } catch {
      return [];
    }
  }
}

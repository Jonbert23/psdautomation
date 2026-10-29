import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { LicenseService } from "./license";

function readSortOrder(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const sortOrder = Number(value);
  return Number.isFinite(sortOrder) ? sortOrder : null;
}

export interface SupportTutorial {
  id: string;
  title: string;
  description: string;
  fileName: string;
  videoUrl: string;
  downloaded: boolean;
  sortOrder: number | null;
}

interface StoredTutorial {
  id: string;
  title: string;
  description: string;
  fileName: string;
  savedAt: string;
  sortOrder?: number;
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
      this.rememberOrder(tutorials);
      return { tutorials, offline: false };
    } catch {
      return {
        offline: true,
        tutorials: this.inAdminOrder(
          local.map((row) => ({
            id: row.id,
            title: row.title,
            description: row.description,
            fileName: row.fileName,
            videoUrl: "",
            downloaded: true,
            sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : null,
          })),
        ),
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
    if (!response.ok || !response.body) throw new Error("Could not download that tutorial.");
    const fileName = String(tutorial.fileName || "tutorial.mp4");
    const stored: StoredTutorial = {
      id,
      title: String(tutorial.title || "Tutorial"),
      description: String(tutorial.description || ""),
      fileName,
      savedAt: new Date().toISOString(),
    };
    fs.mkdirSync(this.dir, { recursive: true });
    const destination = this.filePath(stored);
    const partial = `${destination}.part`;
    try {
      await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(partial));
      fs.renameSync(partial, destination);
    } catch (error) {
      fs.rmSync(partial, { force: true });
      throw error;
    }
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
      sortOrder: typeof stored.sortOrder === "number" ? stored.sortOrder : null,
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
      sortOrder: readSortOrder(item.sortOrder),
    };
  }

  private inAdminOrder(tutorials: SupportTutorial[]): SupportTutorial[] {
    return tutorials
      .map((tutorial, index) => ({ tutorial, index }))
      .sort((left, right) => {
        const leftOrder = left.tutorial.sortOrder ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = right.tutorial.sortOrder ?? Number.MAX_SAFE_INTEGER;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return left.index - right.index;
      })
      .map((item) => item.tutorial);
  }

  private rememberOrder(tutorials: SupportTutorial[]) {
    const order = new Map(tutorials.map((tutorial) => [tutorial.id, tutorial.sortOrder]));
    const current = this.readIndex();
    let changed = false;
    const next = current.map((row) => {
      if (!order.has(row.id)) return row;
      const sortOrder = order.get(row.id);
      const stored = typeof sortOrder === "number" ? sortOrder : undefined;
      if (row.sortOrder === stored) return row;
      changed = true;
      return stored === undefined ? { ...row, sortOrder: undefined } : { ...row, sortOrder: stored };
    });
    if (!changed) return;
    fs.mkdirSync(this.dir, { recursive: true });
    fs.writeFileSync(this.indexPath, JSON.stringify(next, null, 2));
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

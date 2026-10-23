import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { LicenseGrant, StoredLicense } from "../shared/licenseGrant";

export class LicenseStore {
  readonly dir: string;
  private readonly machineIdPath: string;
  private readonly filePath: string;
  private machineId: string;
  private record: StoredLicense | null;

  constructor(userDataDir: string) {
    this.dir = path.join(userDataDir, "license");
    this.machineIdPath = path.join(this.dir, "machine-id");
    this.filePath = path.join(this.dir, "license.json");
    if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, { recursive: true });
    this.machineId = this.loadMachineId();
    this.record = this.loadRecord();
  }

  getMachineId(): string {
    return this.machineId;
  }

  getToken(): string | null {
    return this.record?.token || null;
  }

  getGrant(): LicenseGrant | null {
    return this.record?.grant || null;
  }

  getLastCode(): string | null {
    return this.record?.lastCode || null;
  }

  getLastMessage(): string | null {
    return this.record?.lastMessage || null;
  }

  getSessionId(): string | null {
    return this.record?.sessionId || null;
  }

  saveSession(patch: Partial<StoredLicense> & { token: string }): void {
    const next: StoredLicense = {
      token: patch.token,
      grant: patch.grant === undefined ? this.record?.grant || null : patch.grant,
      lastCode: patch.lastCode === undefined ? this.record?.lastCode || null : patch.lastCode,
      lastMessage: patch.lastMessage === undefined ? this.record?.lastMessage || null : patch.lastMessage,
      sessionId: patch.sessionId === undefined ? this.record?.sessionId || null : patch.sessionId,
    };
    this.record = next;
    this.write(next);
  }

  clear(): void {
    this.record = null;
    if (fs.existsSync(this.filePath)) fs.unlinkSync(this.filePath);
  }

  private loadMachineId(): string {
    if (fs.existsSync(this.machineIdPath)) {
      const existing = fs.readFileSync(this.machineIdPath, "utf8").trim();
      if (existing) return existing.slice(0, 200);
    }
    const id = randomUUID();
    fs.writeFileSync(this.machineIdPath, id, "utf8");
    return id;
  }

  private loadRecord(): StoredLicense | null {
    if (!fs.existsSync(this.filePath)) return null;
    try {
      const parsed = JSON.parse(fs.readFileSync(this.filePath, "utf8")) as StoredLicense;
      if (!parsed || typeof parsed !== "object") return null;
      if (!parsed.token && parsed.lastCode !== "session_replaced") return null;
      return parsed;
    } catch {
      return null;
    }
  }

  private write(record: StoredLicense): void {
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(record, null, 2), "utf8");
    fs.renameSync(tmp, this.filePath);
  }
}

import fs from "node:fs";
import path from "node:path";
import { app, Notification } from "electron";
import type { AutomationJob, GarmentProfile, JobItem } from "../shared/types";
import { createId, nowIso } from "../shared/ids";
import { profileReadyForAutomation, validateOrder } from "../shared/validation";
import { findPreset, isPngPresetPath } from "../shared/presets";
import { renderNamingTemplate } from "../shared/naming";
import { detectPhotoshop } from "./photoshop";
import { launchPhotoshopScript, readResult, toJsxPath, waitForResult } from "./psLaunch";
import type { WorkspaceStore } from "./store";

export interface JobPayload {
  schemaVersion: 1;
  jobId: string;
  orderId: string;
  designTemplatePath: string;
  outputFolder: string;
  profile: GarmentProfile;
  orderName: string;
  customerName: string;
  exportFormats: {
    savePsd: boolean;
    savePng: boolean;
    saveJpg: boolean;
    jpgQuality: number;
  };
  items: Array<{
    id: string;
    orderItemId: string;
    sizeId: string;
    sizeLabel: string;
    quantity: number;
    attributeValues: Record<string, string | number | boolean | null>;
    fileName: string;
  }>;
}

function engineSourcePath(): string {
  const candidates = [
    path.join(app.getAppPath(), "photoshop", "engine.jsx"),
    path.join(__dirname, "..", "photoshop", "engine.jsx"),
    path.join(process.cwd(), "photoshop", "engine.jsx"),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? candidates[0];
}

function jobsRoot(): string {
  return path.join(app.getPath("userData"), "jobs");
}

export async function runOrder(store: WorkspaceStore, orderId: string): Promise<AutomationJob> {
  const order = store.getOrder(orderId);
  if (!order) throw new Error("Order not found.");
  const profile = store.getProfile(order.profileId);
  if (!profile) throw new Error("Garment profile not found. Select the profile on the order.");

  const ready = profileReadyForAutomation(profile);
  if (!ready.ok) throw new Error(ready.issues.map((i) => i.message).join(" "));

  const orderCheck = validateOrder(order, profile);
  if (!orderCheck.ok) throw new Error(orderCheck.issues.map((i) => i.message).join(" "));

  if (!fs.existsSync(order.designTemplatePath)) {
    throw new Error(`Design file not found: ${order.designTemplatePath}`);
  }
  if (!fs.existsSync(order.outputFolder)) {
    throw new Error(`Output folder not found: ${order.outputFolder}`);
  }

  const ps = detectPhotoshop(store.getSettings().photoshopPath);
  if (!ps.found) throw new Error("Photoshop is not available. Set Photoshop.exe in Settings.");

  const srcEngine = engineSourcePath();
  if (!fs.existsSync(srcEngine)) throw new Error(`Engine script missing: ${srcEngine}`);

  const jobId = createId("job");
  const jobDir = path.join(jobsRoot(), jobId);
  fs.mkdirSync(jobDir, { recursive: true });

  const payloadItems: JobPayload["items"] = [];
  const jobItems: JobItem[] = [];

  for (const row of order.items) {
    const size = profile.sizes.find((s) => s.id === row.sizeId);
    if (!size) throw new Error("A row has a size that is not on this profile.");
    const enabledParts = profile.parts.filter((p) => p.enabled);
    for (const part of enabledParts) {
      if (!part.required) continue;
      const preset = findPreset(profile, size.id, part.id);
      if (!isPngPresetPath(preset) || !fs.existsSync(preset)) {
        throw new Error(`PNG preset missing for ${size.label} / ${part.name}: ${preset}`);
      }
    }
    const copies = Math.max(1, row.quantity);
    for (let n = 1; n <= copies; n++) {
      const attrByKey: Record<string, string | number | boolean | null> = {};
      for (const attr of profile.attributes) {
        attrByKey[attr.key] = row.attributeValues[attr.id];
      }
      const itemLabel =
        String(attrByKey.name ?? attrByKey.jersey_name ?? row.id);
      const { fileName } = renderNamingTemplate(
        order.namingTemplate || profile.exportSettings.namingTemplate,
        {
          order: order.name,
          garment: profile.name,
          size: size.label,
          item: copies > 1 ? `${itemLabel}_${n}` : itemLabel,
          quantity: row.quantity,
          customer: order.customerName,
          date: nowIso().slice(0, 10),
          ...attrByKey,
        },
        profile.attributes.map((a) => a.key),
      );
      const itemId = createId("jit");
      payloadItems.push({
        id: itemId,
        orderItemId: row.id,
        sizeId: size.id,
        sizeLabel: size.label,
        quantity: 1,
        attributeValues: row.attributeValues,
        fileName,
      });
      jobItems.push({
        id: itemId,
        orderItemId: row.id,
        status: "queued",
        progress: 0,
        outputPaths: [],
      });
    }
  }

  const payload: JobPayload = {
    schemaVersion: 1,
    jobId,
    orderId: order.id,
    designTemplatePath: order.designTemplatePath,
    outputFolder: order.outputFolder,
    profile,
    orderName: order.name,
    customerName: order.customerName,
    exportFormats: order.exportFormats,
    items: payloadItems,
  };

  const jobJsonPath = path.join(jobDir, "job.json");
  const engineCopy = path.join(jobDir, "engine.jsx");
  const bootstrapPath = path.join(jobDir, "bootstrap.jsx");
  const resultPath = path.join(jobDir, "result.json");
  const startedPath = path.join(jobDir, "started.txt");
  fs.writeFileSync(jobJsonPath, JSON.stringify(payload, null, 2), "utf8");
  fs.copyFileSync(srcEngine, engineCopy);
  const jobDirJsx = toJsxPath(jobDir);
  fs.writeFileSync(
    bootstrapPath,
    `#target photoshop\nvar ENGINE_JOB_DIR = "${jobDirJsx}";\napp.displayDialogs = DialogModes.NO;\n$.evalFile(new File(ENGINE_JOB_DIR + "/engine.jsx"));\n`,
    "utf8",
  );

  let job: AutomationJob = {
    id: jobId,
    orderId: order.id,
    profileId: profile.id,
    status: "running",
    progress: 0,
    startedAt: nowIso(),
    logPath: path.join(jobDir, "engine.log"),
    items: jobItems,
    createdAt: nowIso(),
  };
  store.saveJob(job);
  store.saveOrder({ ...order, status: "processing" });

  try {
    try {
      await launchPhotoshopScript(jobDir, bootstrapPath);
    } catch (launchError) {
      const recovered = readResult<{ ok?: boolean }>(resultPath);
      if (!recovered) {
        const started = fs.existsSync(startedPath);
        const extra = started
          ? " Photoshop started the script, then the COM connection dropped. Check engine.log in the job folder and dismiss any Photoshop dialogs, then retry."
          : " Photoshop never confirmed the script start. Close Photoshop dialogs, use the same Windows user as this app, and retry.";
        throw new Error((launchError instanceof Error ? launchError.message : String(launchError)) + extra);
      }
    }
    const result = (readResult<{
      ok?: boolean;
      items?: Array<{ id: string; ok: boolean; message?: string; outputPaths?: string[] }>;
      message?: string;
    }>(resultPath) ??
      (await waitForResult(resultPath, 60_000))) as {
      ok?: boolean;
      items?: Array<{ id: string; ok: boolean; message?: string; outputPaths?: string[] }>;
      message?: string;
    };
    const byId = new Map((result.items ?? []).map((i) => [i.id, i]));
    job = {
      ...job,
      status: result.ok ? "completed" : "failed",
      progress: 100,
      completedAt: nowIso(),
      items: job.items.map((item) => {
        const r = byId.get(item.id);
        if (!r) return { ...item, status: "failed", error: { code: "no_result", message: "No result for this item." } };
        return {
          ...item,
          status: r.ok ? "completed" : "failed",
          progress: 100,
          outputPaths: r.outputPaths ?? [],
          error: r.ok ? undefined : { code: "engine", message: r.message ?? "Item failed." },
        };
      }),
    };
    store.saveJob(job);
    store.saveOrder({ ...order, status: result.ok ? "completed" : "failed" });
    notifyJobFinished(store, Boolean(result.ok));
    return job;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    job = {
      ...job,
      status: "failed",
      completedAt: nowIso(),
      items: job.items.map((item) => ({
        ...item,
        status: "failed",
        error: { code: "photoshop", message },
      })),
    };
    store.saveJob(job);
    store.saveOrder({ ...order, status: "failed" });
    notifyJobFinished(store, false);
    throw new Error(message);
  }
}

function notifyJobFinished(store: WorkspaceStore, ok: boolean) {
  if (!store.getSettings().notifyOnJobFinished || !Notification.isSupported()) return;
  new Notification({
    title: ok ? "Automation finished" : "Automation failed",
    body: ok ? "Photoshop finished this job." : "Photoshop did not finish this job.",
  }).show();
}

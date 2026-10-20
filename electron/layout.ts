import fs from "node:fs";
import path from "node:path";
import { app, nativeImage } from "electron";
import type { GarmentProfile } from "../shared/types";
import { applyCapturedPositions, enabledPartsSorted, LAYOUT_DOCUMENT_NAME, LAYOUT_ROW_SPACING } from "../shared/layout";
import { isPngPresetPath } from "../shared/presets";
import { detectPhotoshop } from "./photoshop";
import { launchPhotoshopScript, readResult, toJsxPath, waitForResult } from "./psLaunch";
import { createId } from "../shared/ids";

export interface LayoutPreviewPart {
  partId: string;
  name: string;
  filePath: string;
  dataUrl: string;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

export interface CapturedPosition {
  partId: string;
  x: number;
  y: number;
  sortOrder?: number;
}

function scriptSourcePath(): string {
  const candidates = [
    path.join(app.getAppPath(), "photoshop", "layout.jsx"),
    path.join(__dirname, "..", "photoshop", "layout.jsx"),
    path.join(process.cwd(), "photoshop", "layout.jsx"),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? candidates[0];
}

function layoutJobsRoot(): string {
  return path.join(app.getPath("userData"), "layout-jobs");
}

function layoutPartsForSize(profile: GarmentProfile, sizeId: string) {
  const parts = enabledPartsSorted(profile.parts);
  return parts
    .map((part) => {
      const filePath =
        profile.presetAssignments.find((a) => a.sizeId === sizeId && a.partId === part.id)?.filePath.trim() ?? "";
      return { part, filePath };
    })
    .filter((row) => isPngPresetPath(row.filePath) && fs.existsSync(row.filePath));
}

export function previewLayoutSize(profile: GarmentProfile, sizeId: string): LayoutPreviewPart[] {
  return layoutPartsForSize(profile, sizeId).map(({ part, filePath }) => {
    const image = nativeImage.createFromPath(filePath);
    const size = image.getSize();
    if (size.width <= 0 || size.height <= 0) {
      throw new Error(`Could not read PNG size for ${part.name}: ${filePath}`);
    }
    return {
      partId: part.id,
      name: part.name,
      filePath,
      dataUrl: image.toDataURL(),
      width: size.width,
      height: size.height,
      offsetX: part.offsetX,
      offsetY: part.offsetY,
    };
  });
}

async function runLayoutScript(
  photoshopPath: string,
  payload: Record<string, unknown>,
): Promise<{ result: { ok?: boolean; message?: string; mode?: string; count?: number }; jobDir: string }> {
  const ps = detectPhotoshop(photoshopPath);
  if (!ps.found) throw new Error("Photoshop is not available. Set Photoshop.exe in Settings.");
  const src = scriptSourcePath();
  if (!fs.existsSync(src)) throw new Error(`Layout script missing: ${src}`);

  const jobId = createId("lyt");
  const jobDir = path.join(layoutJobsRoot(), jobId);
  fs.mkdirSync(jobDir, { recursive: true });
  const scriptCopy = path.join(jobDir, "layout.jsx");
  const bootstrapPath = path.join(jobDir, "bootstrap.jsx");
  const resultPath = path.join(jobDir, "result.json");
  const startedPath = path.join(jobDir, "started.txt");
  fs.writeFileSync(path.join(jobDir, "job.json"), JSON.stringify(payload, null, 2), "utf8");
  fs.copyFileSync(src, scriptCopy);
  fs.writeFileSync(
    bootstrapPath,
    `#target photoshop\nvar ENGINE_JOB_DIR = "${toJsxPath(jobDir)}";\napp.displayDialogs = DialogModes.NO;\n$.evalFile(new File(ENGINE_JOB_DIR + "/layout.jsx"));\n`,
    "utf8",
  );

  try {
    await launchPhotoshopScript(jobDir, bootstrapPath);
  } catch (launchError) {
    const recovered = readResult<{ ok?: boolean; message?: string }>(resultPath);
    if (!recovered) {
      const started = fs.existsSync(startedPath);
      const extra = started
        ? " Photoshop started the layout script, then the COM connection dropped."
        : " Photoshop never confirmed the layout script start.";
      throw new Error((launchError instanceof Error ? launchError.message : String(launchError)) + extra);
    }
  }

  const result = (readResult<{ ok?: boolean; message?: string; mode?: string; count?: number }>(resultPath) ??
    (await waitForResult(resultPath, 60_000))) as {
    ok?: boolean;
    message?: string;
    mode?: string;
    count?: number;
  };
  if (!result.ok) throw new Error(result.message || "Layout script failed.");
  return { result, jobDir };
}

export async function openLayoutDocument(
  profile: GarmentProfile,
  sizeId: string,
  photoshopPath: string,
): Promise<{ ok: true; documentName: string }> {
  const rows = layoutPartsForSize(profile, sizeId);
  if (rows.length === 0) throw new Error("No PNG presets for this size. Assign presets before arranging.");
  await runLayoutScript(photoshopPath, {
    schemaVersion: 1,
    mode: "open",
    documentName: LAYOUT_DOCUMENT_NAME,
    spacing: LAYOUT_ROW_SPACING,
    parts: rows.map(({ part, filePath }) => ({
      id: part.id,
      name: part.name,
      filePath,
      offsetX: part.offsetX,
      offsetY: part.offsetY,
      sortOrder: part.sortOrder,
    })),
  });
  return { ok: true, documentName: LAYOUT_DOCUMENT_NAME };
}

export async function captureLayoutDocument(
  profile: GarmentProfile,
  photoshopPath: string,
): Promise<GarmentProfile> {
  const { jobDir } = await runLayoutScript(photoshopPath, {
    schemaVersion: 1,
    mode: "capture",
    documentName: LAYOUT_DOCUMENT_NAME,
  });
  const positionsPath = path.join(jobDir, "positions.json");
  if (!fs.existsSync(positionsPath)) throw new Error("Photoshop did not write positions.json.");
  const captured = JSON.parse(fs.readFileSync(positionsPath, "utf8")) as {
    parts?: CapturedPosition[];
  };
  if (!captured.parts?.length) throw new Error("Capture found no part layers.");
  return {
    ...profile,
    parts: applyCapturedPositions(profile.parts, captured.parts),
  };
}

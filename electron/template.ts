import fs from "node:fs";
import path from "node:path";
import { app, dialog, nativeImage } from "electron";
import type { GarmentProfile } from "../shared/types";
import { defaultLayoutSizeId, enabledPartsSorted, type PartPixelSize } from "../shared/layout";
import { isPngPresetPath } from "../shared/presets";
import { buildTemplateSpec, type TemplateSkip } from "../shared/templateSpec";
import { detectPhotoshop } from "./photoshop";
import { launchPhotoshopScript, readResult, toJsxPath, waitForResult } from "./psLaunch";
import { createId } from "../shared/ids";

export interface GenerateTemplateResult {
  outputPath: string;
  skipped: TemplateSkip[];
}

function scriptSourcePath(): string {
  const candidates = [
    path.join(app.getAppPath(), "photoshop", "template.jsx"),
    path.join(__dirname, "..", "photoshop", "template.jsx"),
    path.join(process.cwd(), "photoshop", "template.jsx"),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? candidates[0];
}

function measurePartSizes(profile: GarmentProfile): PartPixelSize[] {
  const sizeId = defaultLayoutSizeId(profile) ?? profile.sizes.find((s) => s.enabled)?.id;
  if (!sizeId) return [];
  const sizes: PartPixelSize[] = [];
  for (const part of enabledPartsSorted(profile.parts)) {
    const filePath =
      profile.presetAssignments.find((a) => a.sizeId === sizeId && a.partId === part.id)?.filePath.trim() ?? "";
    if (!isPngPresetPath(filePath) || !fs.existsSync(filePath)) continue;
    const image = nativeImage.createFromPath(filePath);
    const size = image.getSize();
    if (size.width > 0 && size.height > 0) {
      sizes.push({ partId: part.id, width: size.width, height: size.height });
    }
  }
  return sizes;
}

export async function generateDesignTemplate(
  profile: GarmentProfile,
  photoshopPath: string,
): Promise<GenerateTemplateResult | null> {
  const parts = enabledPartsSorted(profile.parts).filter((p) => p.photoshopLayer.trim() !== "");
  if (parts.length === 0) {
    throw new Error("Add at least one enabled part with a Photoshop layer name.");
  }

  const save = await dialog.showSaveDialog({
    title: "Save Template Guide",
    defaultPath: `${(profile.name.trim() || "garment").replace(/[\\/:*?"<>|]/g, "_")} Template Guide.psd`,
    filters: [{ name: "Photoshop", extensions: ["psd"] }],
  });
  if (save.canceled || !save.filePath) return null;

  const outputPath = save.filePath.toLowerCase().endsWith(".psd") ? save.filePath : `${save.filePath}.psd`;
  const spec = buildTemplateSpec(profile, measurePartSizes(profile));
  if (spec.groups.length === 0) {
    throw new Error("No part groups to write. Enable parts and set layer names.");
  }

  const ps = detectPhotoshop(photoshopPath);
  if (!ps.found) throw new Error("Photoshop is not available. Set Photoshop.exe in Settings.");
  const src = scriptSourcePath();
  if (!fs.existsSync(src)) throw new Error(`Template script missing: ${src}`);

  const jobId = createId("tpl");
  const jobDir = path.join(app.getPath("userData"), "template-jobs", jobId);
  fs.mkdirSync(jobDir, { recursive: true });
  const scriptCopy = path.join(jobDir, "template.jsx");
  const bootstrapPath = path.join(jobDir, "bootstrap.jsx");
  const resultPath = path.join(jobDir, "result.json");
  const startedPath = path.join(jobDir, "started.txt");
  fs.writeFileSync(
    path.join(jobDir, "job.json"),
    JSON.stringify(
      {
        schemaVersion: 1,
        mode: "generate",
        outputPath,
        document: spec,
      },
      null,
      2,
    ),
    "utf8",
  );
  fs.copyFileSync(src, scriptCopy);
  fs.writeFileSync(
    bootstrapPath,
    `#target photoshop\nvar ENGINE_JOB_DIR = "${toJsxPath(jobDir)}";\napp.displayDialogs = DialogModes.NO;\n$.evalFile(new File(ENGINE_JOB_DIR + "/template.jsx"));\n`,
    "utf8",
  );

  try {
    await launchPhotoshopScript(jobDir, bootstrapPath);
  } catch (launchError) {
    const recovered = readResult<{ ok?: boolean; message?: string }>(resultPath);
    if (!recovered) {
      const started = fs.existsSync(startedPath);
      const extra = started
        ? " Photoshop started the template script, then the COM connection dropped."
        : " Photoshop never confirmed the template script start.";
      throw new Error((launchError instanceof Error ? launchError.message : String(launchError)) + extra);
    }
  }

  const result = (readResult<{ ok?: boolean; message?: string; outputPath?: string }>(resultPath) ??
    (await waitForResult(resultPath, 60_000))) as { ok?: boolean; message?: string; outputPath?: string };
  if (!result.ok) throw new Error(result.message || "Template script failed.");
  const written = result.outputPath || outputPath;
  if (!fs.existsSync(written)) {
    throw new Error("Photoshop did not write the PSD file.");
  }
  return { outputPath: written, skipped: spec.skipped };
}

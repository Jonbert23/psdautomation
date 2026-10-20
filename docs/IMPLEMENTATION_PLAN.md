# Implementation Plan

## Decision: desktop stack

| Layer | Choice | Why |
|---|---|---|
| Shell | Electron (Windows-first) | Native file dialogs, AppData persistence, process launch |
| UI | React + TypeScript + Vite | Fast iteration, typed config |
| Persistence | Versioned JSON document store (atomic write) | Backup/restore is a file copy; no native SQLite build pain on Windows Electron |
| Validation | Shared TypeScript modules used by UI, main process, and tests | One schema, no garment-specific if/else |
| Photoshop | JSON job file + ExtendScript engine | Chromium cannot run JSX; Photoshop CS6+ already runs the existing scripts |

Original JSX files stay at the repo root so the current Photoshop workflow still runs unchanged.

## Photoshop integration (Phase 5)

1. Electron writes `%APPDATA%/GarmentCustomizer/jobs/<jobId>/job.json` (schemaVersion + profile snapshot + items).
2. Electron copies `photoshop/engine.jsx` (new, config-driven) into that folder.
3. Launch via Windows COM (`Photoshop.Application.DoJavaScriptFile`) with a file-path fallback (`Photoshop.exe` + script).
4. Engine opens templates **by path from JSON**, never searches for `preset.psd`.
5. Engine writes `result.json` and `engine.log`.
6. Electron tails those files for progress, then records job items.

The engine will **not** delete unused sizes from a combined preset unless a profile explicitly uses legacy `combinedPreset` mode. Default mode is **one PSD/PSB per size+part**.

## Data model (schemaVersion 1)

See `shared/types.ts`. Summary:

- **Category** — extendable list (id, name)
- **GarmentProfile** — metadata, template path, parts[], sizes[], attributes[], presetAssignments[], exportSettings
- **Part** — id, name, required, layer mapping, scale mode, clip, offsets
- **Size** — id, label, dimensions, per-part dimensions, enabled
- **Attribute** — type, validation, Photoshop mapping, target part, order, group
- **PresetAssignment** — sizeId + partId + file path (reuse allowed)
- **Order / OrderItem** — attributeValues map keyed by attribute id
- **Job / JobItem** — status, progress, errors, output paths
- **Activity** — dashboard feed

## File structure

```
docs/                          audit, plan, setup
electron/                      main, preload, store, ipc, photoshop detect
shared/                        types, schema, validation, naming, presets
src/                           React UI
  layout/                      sidebar shell
  pages/                       dashboard, profiles, orders, jobs, settings
  components/                  tables, dialogs, empty states
photoshop/                     Phase 5 engine (not in Phase 2)
tshirt_customizer.jsx          preserved
tshirt_bulk_generator.jsx      preserved
```

## Incremental phases

| Phase | This repo |
|---|---|
| 1 | Audit + plan (this folder) |
| 2 | Electron app, schema, persistence, dashboard, nav, settings, profile metadata CRUD |
| 3 | Parts / sizes / attributes / preset matrix UI |
| 4 | Dynamic orders, CSV, preflight |
| 5 | Config-driven JSX engine + real Photoshop run |
| 6 | Job queue UI, retries, output browser |
| 7 | End-to-end test with real PSDs + documentation |

## What will not be faked

Dashboard job counts come from stored jobs only. The Run Automation action is disabled until Photoshop detection and a validated job exist. No success toast without an engine result file.

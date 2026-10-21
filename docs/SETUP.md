# Setup

## Photoshop (existing workflow)

The original scripts still run inside Photoshop. They were not rewritten in Phase 2.

1. Adobe Photoshop **CS6 (version 13) or later**.
2. File → Scripts → Browse…
3. Open `tshirt_customizer.jsx` or `tshirt_bulk_generator.jsx`.
4. Point the dialog at a design template (`.psd` / `.psb`) and an output folder.
5. Combined-size presets still expect `preset.psd` with a `SIZES` group (legacy mode).

Do not save over templates or presets while scripts are running. Both scripts close documents with `DONOTSAVECHANGES`.

## Desktop application (Phase 2)

Requirements:

- Windows 10/11
- Node.js 20 or later
- Adobe Photoshop installed if you want detection to succeed (automation itself is Phase 5)

Install and run:

```
npm install
npm test
npm run dev
```

`npm run dev` starts Vite and Electron. The workspace file is stored in the Electron userData folder (`garment-customizer` / `workspace.json`).

Backup and restore are in Settings.

## Licensing (Base44)

The desktop app signs in against the same Base44 app as the website. Operators only see email/password sign-in; app id and API URL are not shown in the UI.

Developers wire the client with `desktop/.env` (see `.env.example`) or by linking the sibling web app (`base44 link` writes `web/base44/.app.jsonc` and `web/.env.local`). Restart `npm run dev` after those files change.

On first launch, sign in with the website account while online. A grant is stored under the Electron userData `license/` folder (not in `workspace.json`). After that the app can run offline until `expiresAt`. Revoking a license on the website does not instantly lock a PC that already activated.

## How the two layers will connect (Phase 5)

The UI will write a versioned `job.json`. A new `photoshop/engine.jsx` (not written yet) will read that file, open documents, apply mappings, export, and write `result.json`. The UI will never claim success without that result file.

Until then, **Run automation** is disabled on purpose.

## Sample files in this folder

- `t-shirt template.psd` and numbered variants — design templates used by the current JSX
- `preset.psd` / `preset/` — combined size presets used by the current JSX

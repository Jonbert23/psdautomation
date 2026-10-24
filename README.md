# Garment Customizer

Windows desktop app for configuring garment layouts and automating Adobe Photoshop production.

The original Photoshop scripts still work unchanged:

- `tshirt_customizer.jsx`
- `tshirt_bulk_generator.jsx`

## Start here

On another Windows PC, follow [docs/SETUP.md](docs/SETUP.md):

```powershell
powershell -ExecutionPolicy Bypass -File .\setup.ps1
npm run dev
```

On a PC that already has Node.js 20 and `desktop/.env`:

```
npm install
npm test
npm run dev
```

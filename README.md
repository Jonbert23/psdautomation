# Garment Customizer

Windows desktop app for configuring garment layouts and automating Adobe Photoshop production.

The original Photoshop scripts still work unchanged:

- `tshirt_customizer.jsx`
- `tshirt_bulk_generator.jsx`

## Start here

1. Read [docs/AUDIT.md](docs/AUDIT.md) for how the existing JSX works.
2. Read [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) for architecture.
3. Follow [docs/SETUP.md](docs/SETUP.md) to run the desktop app.

```
npm install
npm test
npm run dev
```

Phase 2 is the application foundation (dashboard, persistence, profile metadata, settings). Parts / sizes / attributes / orders / JSX engine follow in later phases.

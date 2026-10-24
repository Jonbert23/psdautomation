# Set up the desktop app on another PC

This installs the app from the project folder. It does not create a double-click installer.

## What the PC needs

- Windows 10 or 11
- Node.js 20 or later: https://nodejs.org
- Adobe Photoshop CS6 or later

The app looks for `Photoshop.exe` under `C:\Program Files\Adobe` and `C:\Program Files (x86)\Adobe`. If it is installed somewhere else, set the path in Settings after the app opens.

## Copy the project

Copy the desktop folder onto the new PC, or clone it:

```powershell
git clone https://github.com/Jonbert23/psdautomation.git
cd psdautomation
```

Do not copy `node_modules`. The setup command installs those on the new PC.

Copy `desktop\.env` from the working PC into this folder. That file is not in git. It must contain `VITE_BASE44_APP_ID` and `VITE_BASE44_APP_BASE_URL`.

## Install

From the desktop folder:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

The script checks Windows and Node.js, then runs `npm install`. If `.env` is missing or those two values are empty, it stops and tells you what to fill in.

Start the app:

```powershell
npm run dev
```

To install and start in one step:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup.ps1 -Run
```

## First sign-in

Sign in online at https://psdcorner.com with the website account. Only one PC stays signed in. Signing in on this PC signs the other PC out.

Profiles, orders, and the license stay on this PC. They are stored in the Electron user data folder, not in the project folder.
